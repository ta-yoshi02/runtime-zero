import Phaser from 'phaser'
import type { MovementTuning } from '../types'
import { GameInput } from './input'

interface SpawnPoint {
  x: number
  y: number
}

export interface PlayerStateSnapshot {
  x: number
  y: number
  vx: number
  vy: number
  grounded: boolean
  coyoteMs: number
  jumpBufferMs: number
  running: boolean
  sliding: boolean
  groundPounding: boolean
}

export class PlayerController {
  readonly sprite: Phaser.Physics.Arcade.Sprite

  private readonly scene: Phaser.Scene
  private readonly input: GameInput
  private readonly body: Phaser.Physics.Arcade.Body
  private tuning: MovementTuning

  private jumpBufferRemainingMs = 0
  private coyoteRemainingMs = 0
  private slideRemainingMs = 0
  private groundPoundLockRemainingMs = 0

  private wasGrounded = false
  private facingDirection: -1 | 1 = 1
  private running = false
  private sliding = false
  private groundPounding = false

  constructor(scene: Phaser.Scene, input: GameInput, spawn: SpawnPoint, tuning: MovementTuning) {
    this.scene = scene
    this.input = input
    this.tuning = tuning

    this.sprite = this.scene.physics.add.sprite(spawn.x, spawn.y, 'patch-player')
    this.sprite.setDepth(2)
    this.sprite.setCollideWorldBounds(true)

    this.body = this.sprite.body as Phaser.Physics.Arcade.Body
    this.body.setSize(24, 44)
    this.body.setOffset(4, 4)
    this.body.setGravityY(this.tuning.gravity)
    this.body.setMaxVelocity(this.tuning.runSpeed * 1.25, this.tuning.maxFallSpeed)
  }

  setTuning(tuning: MovementTuning): void {
    this.tuning = tuning
    this.body.setGravityY(this.tuning.gravity)
    this.body.setMaxVelocity(this.tuning.runSpeed * 1.25, this.tuning.maxFallSpeed)
  }

  update(deltaMs: number): void {
    const dt = deltaMs / 1000
    const grounded = this.isGrounded()

    if (grounded) {
      this.coyoteRemainingMs = this.tuning.coyoteTimeMs
      if (!this.wasGrounded) {
        this.groundPounding = false
        this.groundPoundLockRemainingMs = 0
      }
    } else {
      this.coyoteRemainingMs = Math.max(0, this.coyoteRemainingMs - deltaMs)
    }

    if (this.input.consumeJumpPressed()) {
      this.jumpBufferRemainingMs = this.tuning.jumpBufferMs
    } else {
      this.jumpBufferRemainingMs = Math.max(0, this.jumpBufferRemainingMs - deltaMs)
    }

    if (!grounded && this.input.consumeDownPressed() && !this.groundPounding) {
      this.startGroundPound()
    }

    if (this.canStartSlide(grounded)) {
      this.startSlide()
    }

    if (this.groundPounding) {
      this.updateGroundPound(deltaMs, grounded)
    } else if (this.sliding) {
      this.updateSlide(deltaMs, grounded)
      this.updateFacingDirectionFromVelocity()
    } else {
      this.updateHorizontalVelocity(dt, grounded)
    }

    if (!this.groundPounding || this.groundPoundLockRemainingMs <= 0) {
      this.tryConsumeJump(grounded)
    }

    this.applyVariableJumpCut()
    this.clampFallSpeed()

    this.wasGrounded = grounded
  }

  getLookAhead(): number {
    const absVelocity = Math.abs(this.body.velocity.x)
    const usingDashLookAhead = this.running || absVelocity > this.tuning.walkSpeed * 1.02
    const maxLookAhead = usingDashLookAhead
      ? this.tuning.cameraLookAheadDash
      : this.tuning.cameraLookAhead
    const baseSpeed = usingDashLookAhead ? this.tuning.runSpeed : this.tuning.walkSpeed

    if (baseSpeed <= 0) {
      return 0
    }

    const ratio = this.body.velocity.x / baseSpeed
    return Phaser.Math.Clamp(ratio * maxLookAhead, -maxLookAhead, maxLookAhead)
  }

  getStateSnapshot(): PlayerStateSnapshot {
    return {
      x: this.sprite.x,
      y: this.sprite.y,
      vx: this.body.velocity.x,
      vy: this.body.velocity.y,
      grounded: this.isGrounded(),
      coyoteMs: this.coyoteRemainingMs,
      jumpBufferMs: this.jumpBufferRemainingMs,
      running: this.running,
      sliding: this.sliding,
      groundPounding: this.groundPounding,
    }
  }

  private isGrounded(): boolean {
    return this.body.blocked.down || this.body.touching.down
  }

  private canStartSlide(grounded: boolean): boolean {
    if (!grounded || this.sliding || this.groundPounding) {
      return false
    }

    if (!this.input.isRunHeld() || !this.input.isDownHeld()) {
      return false
    }

    return Math.abs(this.body.velocity.x) > this.tuning.walkSpeed * 0.6
  }

  private startSlide(): void {
    const velocityDirection = Math.sign(this.body.velocity.x)
    if (velocityDirection !== 0) {
      this.facingDirection = velocityDirection > 0 ? 1 : -1
    }

    this.sliding = true
    this.running = false
    this.slideRemainingMs = this.tuning.slideDurationMs

    this.body.setSize(24, 30)
    this.body.setOffset(4, 18)

    const enterSpeed = Math.max(Math.abs(this.body.velocity.x), this.tuning.slideSpeed) + this.tuning.slideEnterBoost
    this.body.setVelocityX(this.facingDirection * enterSpeed)
  }

  private endSlide(): void {
    if (!this.sliding) {
      return
    }

    this.sliding = false
    this.slideRemainingMs = 0
    this.body.setSize(24, 44)
    this.body.setOffset(4, 4)
  }

  private updateSlide(deltaMs: number, grounded: boolean): void {
    if (!grounded || !this.input.isDownHeld()) {
      this.endSlide()
      return
    }

    this.slideRemainingMs = Math.max(0, this.slideRemainingMs - deltaMs)

    const targetVelocity = this.facingDirection * this.tuning.slideSpeed
    this.body.setVelocityX(Phaser.Math.Linear(this.body.velocity.x, targetVelocity, 0.25))

    if (this.slideRemainingMs <= 0) {
      this.endSlide()
    }
  }

  private startGroundPound(): void {
    this.groundPounding = true
    this.groundPoundLockRemainingMs = this.tuning.groundPoundLockMs
    this.endSlide()
    this.running = false

    this.body.setVelocityX(0)
    this.body.setVelocityY(this.tuning.groundPoundVelocity)
  }

  private updateGroundPound(deltaMs: number, grounded: boolean): void {
    if (grounded) {
      this.groundPounding = false
      this.groundPoundLockRemainingMs = 0
      return
    }

    this.groundPoundLockRemainingMs = Math.max(0, this.groundPoundLockRemainingMs - deltaMs)

    this.body.setVelocityX(Phaser.Math.Linear(this.body.velocity.x, 0, 0.45))
    if (this.body.velocity.y < this.tuning.groundPoundVelocity) {
      this.body.setVelocityY(this.tuning.groundPoundVelocity)
    }
  }

  private updateHorizontalVelocity(dt: number, grounded: boolean): void {
    const axis = this.input.getMoveAxis()
    const currentVelocity = this.body.velocity.x

    const runHeld = this.input.isRunHeld()
    this.running = runHeld && axis !== 0
    const targetSpeed = this.running ? this.tuning.runSpeed : this.tuning.walkSpeed

    if (axis !== 0) {
      this.facingDirection = axis < 0 ? -1 : 1
      const targetVelocity = axis * targetSpeed
      const acceleration = grounded ? this.tuning.groundAcceleration : this.tuning.airAcceleration
      const maxDelta = acceleration * dt
      const nextVelocity = Phaser.Math.Clamp(
        targetVelocity,
        currentVelocity - maxDelta,
        currentVelocity + maxDelta,
      )

      this.body.setVelocityX(nextVelocity)
      this.sprite.setFlipX(axis < 0)
      return
    }

    this.running = false

    const deceleration = grounded ? this.tuning.groundDeceleration : this.tuning.airDeceleration
    const drop = deceleration * dt
    if (Math.abs(currentVelocity) <= drop) {
      this.body.setVelocityX(0)
      return
    }

    this.body.setVelocityX(currentVelocity - Math.sign(currentVelocity) * drop)
  }

  private tryConsumeJump(grounded: boolean): void {
    const touchingLeftWall = this.body.blocked.left || this.body.touching.left
    const touchingRightWall = this.body.blocked.right || this.body.touching.right
    const hasWallContact = !grounded && (touchingLeftWall || touchingRightWall)

    const canJump = grounded || this.coyoteRemainingMs > 0 || hasWallContact
    if (!canJump || this.jumpBufferRemainingMs <= 0) {
      return
    }

    this.groundPounding = false
    this.groundPoundLockRemainingMs = 0

    if (hasWallContact && !grounded) {
      const wallJumpDirection = touchingLeftWall ? 1 : -1
      this.body.setVelocityX(wallJumpDirection * this.tuning.wallJumpXVelocity)
      this.body.setVelocityY(-this.tuning.wallJumpYVelocity)
      this.facingDirection = wallJumpDirection
      this.sprite.setFlipX(wallJumpDirection < 0)
    } else {
      this.body.setVelocityY(-this.tuning.jumpVelocity)
    }

    this.endSlide()
    this.running = false
    this.coyoteRemainingMs = 0
    this.jumpBufferRemainingMs = 0
  }

  private applyVariableJumpCut(): void {
    if (this.groundPounding || this.input.isJumpHeld()) {
      return
    }

    if (this.body.velocity.y < -this.tuning.jumpCutVelocity) {
      this.body.setVelocityY(-this.tuning.jumpCutVelocity)
    }
  }

  private clampFallSpeed(): void {
    if (this.body.velocity.y > this.tuning.maxFallSpeed) {
      this.body.setVelocityY(this.tuning.maxFallSpeed)
    }
  }

  private updateFacingDirectionFromVelocity(): void {
    if (this.body.velocity.x < -1) {
      this.facingDirection = -1
      this.sprite.setFlipX(true)
      return
    }

    if (this.body.velocity.x > 1) {
      this.facingDirection = 1
      this.sprite.setFlipX(false)
    }
  }
}
