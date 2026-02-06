import Phaser from 'phaser'
import { SCENE_KEYS } from '../core/sceneKeys'

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.BOOT)
  }

  create(): void {
    this.ensureRoundedRectTexture('patch-player', 32, 48, 0x66ffd2)
    this.ensureRoundedRectTexture('platform-block', 64, 16, 0x6f8cb0)
    this.ensureRoundedRectTexture('goal-kernel', 32, 64, 0x74d5ff)
    this.ensureDiamondTexture('gem-hint', 20, 0x85f9e3)

    this.scene.start(SCENE_KEYS.TITLE)
  }

  private ensureRoundedRectTexture(textureKey: string, width: number, height: number, color: number): void {
    if (this.textures.exists(textureKey)) {
      return
    }

    const graphics = this.make.graphics()
    graphics.fillStyle(color, 1)
    graphics.fillRoundedRect(0, 0, width, height, 5)
    graphics.generateTexture(textureKey, width, height)
    graphics.destroy()
  }

  private ensureDiamondTexture(textureKey: string, size: number, color: number): void {
    if (this.textures.exists(textureKey)) {
      return
    }

    const graphics = this.make.graphics()
    graphics.fillStyle(color, 1)
    graphics.beginPath()
    graphics.moveTo(size * 0.5, 0)
    graphics.lineTo(size, size * 0.5)
    graphics.lineTo(size * 0.5, size)
    graphics.lineTo(0, size * 0.5)
    graphics.closePath()
    graphics.fillPath()
    graphics.generateTexture(textureKey, size, size)
    graphics.destroy()
  }
}
