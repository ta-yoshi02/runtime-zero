import Phaser from 'phaser'
import { consumeBootIntent } from '../core/bootIntent'
import { SCENE_KEYS } from '../core/sceneKeys'
import { sessionStore } from '../core/sessionStore'

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.BOOT)
  }

  create(): void {
    this.ensureRoundedRectTexture('patch-player', 32, 48, 0x66ffd2)
    this.ensureRoundedRectTexture('platform-block', 64, 16, 0x6f8cb0)
    this.ensureRoundedRectTexture('goal-kernel', 32, 64, 0x74d5ff)
    this.ensureDiamondTexture('gem-hint', 20, 0x85f9e3)
    this.ensureDiamondTexture('gem-core', 22, 0x58f6ff)

    this.ensureCircleTexture('cycle-token', 16, 0xffde63)
    this.ensureRoundedRectTexture('item-module', 24, 24, 0xa2f2ff)
    this.ensureKeyTexture('item-root-key', 30, 0xffd972)
    this.ensureHexTexture('item-compiler', 26, 0xff98a1)
    this.ensureRoundedRectTexture('checkpoint-node', 18, 74, 0x74ffc8)
    this.ensureRoundedRectTexture('port-socket', 44, 58, 0x6c8eff)

    this.ensureRoundedRectTexture('spring-pad', 46, 14, 0x7eff8d)
    this.ensureRoundedRectTexture('collapse-platform', 64, 16, 0xa6789f)
    this.ensureRoundedRectTexture('moving-platform', 64, 16, 0x8ee2ff)

    this.ensureRoundedRectTexture('enemy-crawler', 30, 26, 0xff8f8f)
    this.ensureRoundedRectTexture('enemy-hopper', 28, 30, 0xffc48f)
    this.ensureCircleTexture('enemy-drone', 22, 0xff91e9)
    this.ensureRoundedRectTexture('enemy-chaser', 28, 28, 0xcf8fff)
    this.ensureRoundedRectTexture('enemy-turret', 34, 28, 0xff5b8a)
    this.ensureRoundedRectTexture('enemy-dasher', 34, 22, 0xff6e6e)

    this.ensureCircleTexture('player-shot', 9, 0x8af7ff)
    this.ensureCircleTexture('enemy-shot', 10, 0xff6e8d)
    this.ensureBinaryTexture('binary-overlay', 128, 128)

    const bootIntent = consumeBootIntent()
    if (bootIntent) {
      sessionStore.setSelectedStage(bootIntent.selectedStageId)
      sessionStore.setDifficulty(bootIntent.difficulty)
      sessionStore.setMirror(bootIntent.mirror)
      this.scene.start(bootIntent.targetScene)
      return
    }

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

  private ensureCircleTexture(textureKey: string, radius: number, color: number): void {
    if (this.textures.exists(textureKey)) {
      return
    }

    const size = radius * 2
    const graphics = this.make.graphics()
    graphics.fillStyle(color, 1)
    graphics.fillCircle(radius, radius, radius)
    graphics.generateTexture(textureKey, size, size)
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

  private ensureHexTexture(textureKey: string, size: number, color: number): void {
    if (this.textures.exists(textureKey)) {
      return
    }

    const graphics = this.make.graphics()
    graphics.fillStyle(color, 1)
    graphics.beginPath()
    for (let i = 0; i < 6; i += 1) {
      const angle = Phaser.Math.DegToRad(60 * i - 30)
      const x = size * 0.5 + Math.cos(angle) * size * 0.46
      const y = size * 0.5 + Math.sin(angle) * size * 0.46
      if (i === 0) {
        graphics.moveTo(x, y)
      } else {
        graphics.lineTo(x, y)
      }
    }
    graphics.closePath()
    graphics.fillPath()
    graphics.generateTexture(textureKey, size, size)
    graphics.destroy()
  }

  private ensureKeyTexture(textureKey: string, size: number, color: number): void {
    if (this.textures.exists(textureKey)) {
      return
    }

    const graphics = this.make.graphics()
    graphics.fillStyle(color, 1)
    graphics.fillCircle(size * 0.36, size * 0.38, size * 0.26)
    graphics.fillRect(size * 0.5, size * 0.32, size * 0.42, size * 0.14)
    graphics.fillRect(size * 0.72, size * 0.46, size * 0.08, size * 0.18)
    graphics.fillRect(size * 0.84, size * 0.46, size * 0.08, size * 0.1)
    graphics.generateTexture(textureKey, size, size)
    graphics.destroy()
  }

  private ensureBinaryTexture(textureKey: string, width: number, height: number): void {
    if (this.textures.exists(textureKey)) {
      return
    }

    const canvasTexture = this.textures.createCanvas(textureKey, width, height)
    if (!canvasTexture) {
      return
    }
    const ctx = canvasTexture.getContext()

    ctx.fillStyle = 'rgba(7, 16, 30, 0.45)'
    ctx.fillRect(0, 0, width, height)

    ctx.fillStyle = 'rgba(142, 248, 255, 0.8)'
    ctx.font = '14px monospace'

    for (let y = 14; y < height; y += 16) {
      for (let x = 4; x < width; x += 16) {
        const bit = Math.random() > 0.5 ? '1' : '0'
        ctx.fillText(bit, x, y)
      }
    }

    canvasTexture.refresh()
  }
}
