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
}

export class PlayerController {
  readonly sprite: Phaser.Physics.Arcade.Sprite

  private readonly scene: Phaser.Scene
  private readonly input: GameInput
  private readonly body: Phaser.Physics.Arcade.Body
  private tuning: MovementTuning
  private jumpBufferRemainingMs = 0
  private coyoteRemainingMs = 0

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
  }

  setTuning(tuning: MovementTuning): void {
    this.tuning = tuning
  }

  update(deltaMs: number): void {
    const dt = deltaMs / 1000
    const grounded = this.isGrounded()

    if (grounded) {
      this.coyoteRemainingMs = this.tuning.coyoteTimeMs
    } else {
      this.coyoteRemainingMs = Math.max(0, this.coyoteRemainingMs - deltaMs)
    }

    if (this.input.consumeJumpPressed()) {
      this.jumpBufferRemainingMs = this.tuning.jumpBufferMs
    } else {
      this.jumpBufferRemainingMs = Math.max(0, this.jumpBufferRemainingMs - deltaMs)
    }

    this.updateHorizontalVelocity(dt, grounded)
    this.tryConsumeJump(grounded)
    this.applyVariableJumpCut()
  }

  getLookAhead(maxLookAhead: number): number {
    if (this.tuning.maxRunSpeed <= 0) {
      return 0
    }

    const ratio = this.body.velocity.x / this.tuning.maxRunSpeed
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
    }
  }

  private isGrounded(): boolean {
    return this.body.blocked.down || this.body.touching.down
  }

  private updateHorizontalVelocity(dt: number, grounded: boolean): void {
    const axis = this.input.getMoveAxis()
    const currentVelocity = this.body.velocity.x

    if (axis !== 0) {
      const targetVelocity = axis * this.tuning.maxRunSpeed
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

    const deceleration = grounded ? this.tuning.groundDeceleration : this.tuning.airDeceleration
    const drop = deceleration * dt
    if (Math.abs(currentVelocity) <= drop) {
      this.body.setVelocityX(0)
      return
    }

    this.body.setVelocityX(currentVelocity - Math.sign(currentVelocity) * drop)
  }

  private tryConsumeJump(grounded: boolean): void {
    const canJump = grounded || this.coyoteRemainingMs > 0
    if (!canJump || this.jumpBufferRemainingMs <= 0) {
      return
    }

    this.body.setVelocityY(-this.tuning.jumpVelocity)
    this.coyoteRemainingMs = 0
    this.jumpBufferRemainingMs = 0
  }

  private applyVariableJumpCut(): void {
    if (this.input.isJumpHeld()) {
      return
    }

    if (this.body.velocity.y < -this.tuning.jumpCutVelocity) {
      this.body.setVelocityY(-this.tuning.jumpCutVelocity)
    }
  }
}
