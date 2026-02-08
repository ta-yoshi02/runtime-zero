import Phaser from 'phaser'
import { keybindStore, type InputAction } from '../core/keybindStore'

type Key = Phaser.Input.Keyboard.Key

interface PadSnapshot {
  axisX: number
  left: boolean
  right: boolean
  up: boolean
  down: boolean
  jump: boolean
  run: boolean
  fire: boolean
  confirm: boolean
  cancel: boolean
  pause: boolean
  restart: boolean
  tuning: boolean
}

interface PadEdges {
  jump: boolean
  confirm: boolean
  cancel: boolean
  pause: boolean
  restart: boolean
  tuning: boolean
  fire: boolean
  up: boolean
  down: boolean
}

export class GameInput {
  private readonly scene: Phaser.Scene

  private readonly leftKeys: Key[]
  private readonly rightKeys: Key[]
  private readonly jumpKeys: Key[]
  private readonly runKeys: Key[]
  private readonly fireKeys: Key[]
  private readonly upKeys: Key[]
  private readonly downKeys: Key[]
  private readonly confirmKeys: Key[]
  private readonly cancelKeys: Key[]
  private readonly pauseKeys: Key[]
  private readonly restartKeys: Key[]
  private readonly tuningKeys: Key[]

  private horizontalScale = 1

  private previousPad: PadSnapshot | null = null
  private padSnapshot: PadSnapshot | null = null
  private padEdges: PadEdges = {
    jump: false,
    confirm: false,
    cancel: false,
    pause: false,
    restart: false,
    tuning: false,
    fire: false,
    up: false,
    down: false,
  }
  private lastPadFrame = -1

  constructor(scene: Phaser.Scene) {
    this.scene = scene

    this.leftKeys = this.registerActionKeys('left')
    this.rightKeys = this.registerActionKeys('right')
    this.jumpKeys = this.registerActionKeys('jump')
    this.runKeys = this.registerActionKeys('run')
    this.fireKeys = this.registerActionKeys('fire')
    this.upKeys = this.registerActionKeys('up')
    this.downKeys = this.registerActionKeys('down')
    this.confirmKeys = this.registerActionKeys('confirm')
    this.cancelKeys = this.registerActionKeys('cancel')
    this.pauseKeys = this.registerActionKeys('pause')
    this.restartKeys = this.registerActionKeys('restart')
    this.tuningKeys = this.registerActionKeys('tuning')
  }

  setHorizontalScale(scale: number): void {
    this.horizontalScale = scale >= 0 ? 1 : -1
  }

  getMoveAxis(): number {
    this.refreshPadState()

    const left = this.anyDown(this.leftKeys) || Boolean(this.padSnapshot?.left)
    const right = this.anyDown(this.rightKeys) || Boolean(this.padSnapshot?.right)

    let axis = 0
    if (left !== right) {
      axis = left ? -1 : 1
    } else {
      const padAxis = this.padSnapshot?.axisX ?? 0
      axis = Math.abs(padAxis) > 0.22 ? Math.sign(padAxis) : 0
    }

    return axis * this.horizontalScale
  }

  isRunHeld(): boolean {
    this.refreshPadState()
    return this.anyDown(this.runKeys) || Boolean(this.padSnapshot?.run)
  }

  isDownHeld(): boolean {
    this.refreshPadState()
    return this.anyDown(this.downKeys) || Boolean(this.padSnapshot?.down)
  }

  isUpHeld(): boolean {
    this.refreshPadState()
    return this.anyDown(this.upKeys) || Boolean(this.padSnapshot?.up)
  }

  isJumpHeld(): boolean {
    this.refreshPadState()
    return this.anyDown(this.jumpKeys) || Boolean(this.padSnapshot?.jump)
  }

  consumeJumpPressed(): boolean {
    this.refreshPadState()
    return this.anyJustDown(this.jumpKeys) || this.padEdges.jump
  }

  consumeFirePressed(): boolean {
    this.refreshPadState()
    return this.anyJustDown(this.fireKeys) || this.padEdges.fire
  }

  consumeConfirmPressed(): boolean {
    this.refreshPadState()
    return this.anyJustDown(this.confirmKeys) || this.padEdges.confirm
  }

  consumeCancelPressed(): boolean {
    this.refreshPadState()
    return this.anyJustDown(this.cancelKeys) || this.padEdges.cancel
  }

  consumePausePressed(): boolean {
    this.refreshPadState()
    return this.anyJustDown(this.pauseKeys) || this.padEdges.pause
  }

  consumeRestartPressed(): boolean {
    this.refreshPadState()
    return this.anyJustDown(this.restartKeys) || this.padEdges.restart
  }

  consumeTuningPressed(): boolean {
    this.refreshPadState()
    return this.anyJustDown(this.tuningKeys) || this.padEdges.tuning
  }

  consumeUpPressed(): boolean {
    this.refreshPadState()
    return this.anyJustDown(this.upKeys) || this.padEdges.up
  }

  consumeDownPressed(): boolean {
    this.refreshPadState()
    return this.anyJustDown(this.downKeys) || this.padEdges.down
  }

  private registerActionKeys(action: InputAction): Key[] {
    return keybindStore.get(action).map((code) => this.scene.input.keyboard!.addKey(code))
  }

  private anyDown(keys: Key[]): boolean {
    return keys.some((key) => key.isDown)
  }

  private anyJustDown(keys: Key[]): boolean {
    return keys.some((key) => Phaser.Input.Keyboard.JustDown(key))
  }

  private getPrimaryPad(): Phaser.Input.Gamepad.Gamepad | null {
    const gamepads = this.scene.input.gamepad?.gamepads ?? []
    return gamepads.find((pad) => pad && pad.connected) ?? null
  }

  private refreshPadState(): void {
    const frame = this.scene.game.loop.frame
    if (this.lastPadFrame === frame) {
      return
    }

    this.lastPadFrame = frame

    const pad = this.getPrimaryPad()
    if (!pad) {
      this.padSnapshot = null
      this.padEdges = {
        jump: false,
        confirm: false,
        cancel: false,
        pause: false,
        restart: false,
        tuning: false,
        fire: false,
        up: false,
        down: false,
      }
      this.previousPad = null
      return
    }

    const buttonPressed = (index: number): boolean => Boolean(pad.buttons[index]?.pressed)
    const axisX = pad.axes.length > 0 ? pad.axes[0].getValue() : 0

    const snapshot: PadSnapshot = {
      axisX,
      left: buttonPressed(14),
      right: buttonPressed(15),
      up: buttonPressed(12),
      down: buttonPressed(13),
      jump: buttonPressed(0),
      run: buttonPressed(5) || buttonPressed(7),
      fire: buttonPressed(2),
      confirm: buttonPressed(0),
      cancel: buttonPressed(1),
      pause: buttonPressed(9),
      restart: buttonPressed(3),
      tuning: buttonPressed(8),
    }

    const previous = this.previousPad ?? {
      axisX: 0,
      left: false,
      right: false,
      jump: false,
      run: false,
      fire: false,
      confirm: false,
      cancel: false,
      pause: false,
      restart: false,
      tuning: false,
      up: false,
      down: false,
    }

    this.padEdges = {
      jump: snapshot.jump && !previous.jump,
      confirm: snapshot.confirm && !previous.confirm,
      cancel: snapshot.cancel && !previous.cancel,
      pause: snapshot.pause && !previous.pause,
      restart: snapshot.restart && !previous.restart,
      tuning: snapshot.tuning && !previous.tuning,
      fire: snapshot.fire && !previous.fire,
      up: snapshot.up && !previous.up,
      down: snapshot.down && !previous.down,
    }

    this.padSnapshot = snapshot
    this.previousPad = snapshot
  }
}
