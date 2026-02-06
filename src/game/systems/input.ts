import Phaser from 'phaser'

type Key = Phaser.Input.Keyboard.Key

export class GameInput {
  private readonly leftKeys: Key[]
  private readonly rightKeys: Key[]
  private readonly jumpKeys: Key[]
  private readonly upKeys: Key[]
  private readonly downKeys: Key[]
  private readonly confirmKeys: Key[]
  private readonly cancelKeys: Key[]
  private readonly pauseKeys: Key[]
  private readonly restartKeys: Key[]

  constructor(scene: Phaser.Scene) {
    this.leftKeys = [scene.input.keyboard!.addKey('LEFT'), scene.input.keyboard!.addKey('A')]
    this.rightKeys = [scene.input.keyboard!.addKey('RIGHT'), scene.input.keyboard!.addKey('D')]
    this.jumpKeys = [
      scene.input.keyboard!.addKey('SPACE'),
      scene.input.keyboard!.addKey('UP'),
      scene.input.keyboard!.addKey('W'),
    ]
    this.upKeys = [scene.input.keyboard!.addKey('UP'), scene.input.keyboard!.addKey('W')]
    this.downKeys = [scene.input.keyboard!.addKey('DOWN'), scene.input.keyboard!.addKey('S')]
    this.confirmKeys = [scene.input.keyboard!.addKey('ENTER'), scene.input.keyboard!.addKey('SPACE')]
    this.cancelKeys = [scene.input.keyboard!.addKey('ESC')]
    this.pauseKeys = [scene.input.keyboard!.addKey('P')]
    this.restartKeys = [scene.input.keyboard!.addKey('R')]
  }

  getMoveAxis(): number {
    const left = this.anyDown(this.leftKeys)
    const right = this.anyDown(this.rightKeys)

    if (left === right) {
      return 0
    }

    return left ? -1 : 1
  }

  isJumpHeld(): boolean {
    return this.anyDown(this.jumpKeys)
  }

  consumeJumpPressed(): boolean {
    return this.anyJustDown(this.jumpKeys)
  }

  consumeConfirmPressed(): boolean {
    return this.anyJustDown(this.confirmKeys)
  }

  consumeCancelPressed(): boolean {
    return this.anyJustDown(this.cancelKeys)
  }

  consumePausePressed(): boolean {
    return this.anyJustDown(this.pauseKeys)
  }

  consumeRestartPressed(): boolean {
    return this.anyJustDown(this.restartKeys)
  }

  consumeUpPressed(): boolean {
    return this.anyJustDown(this.upKeys)
  }

  consumeDownPressed(): boolean {
    return this.anyJustDown(this.downKeys)
  }

  private anyDown(keys: Key[]): boolean {
    return keys.some((key) => key.isDown)
  }

  private anyJustDown(keys: Key[]): boolean {
    return keys.some((key) => Phaser.Input.Keyboard.JustDown(key))
  }
}
