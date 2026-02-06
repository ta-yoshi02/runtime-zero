import Phaser from 'phaser'
import { clearRenderGameToText, setRenderGameToText } from '../core/browserHooks'
import { SCENE_KEYS } from '../core/sceneKeys'
import { sessionStore } from '../core/sessionStore'
import { GameInput } from '../systems/input'

export class TitleScene extends Phaser.Scene {
  private inputMap!: GameInput
  private pressText!: Phaser.GameObjects.Text

  constructor() {
    super(SCENE_KEYS.TITLE)
  }

  create(): void {
    sessionStore.setFlow('title')

    this.inputMap = new GameInput(this)

    this.add.rectangle(480, 270, 960, 540, 0x061427, 1)
    this.add.rectangle(480, 160, 760, 210, 0x102b43, 0.75)

    this.add.text(480, 104, 'Runtime: Zero', {
      fontFamily: 'Trebuchet MS',
      fontSize: '62px',
      color: '#9de9ff',
      stroke: '#1c3553',
      strokeThickness: 6,
    }).setOrigin(0.5)

    this.add.text(480, 180, 'Patch enters The Legacy to reboot the Kernel', {
      fontFamily: 'Trebuchet MS',
      fontSize: '22px',
      color: '#d9f6ff',
    }).setOrigin(0.5)

    this.add.text(480, 250, 'Move: A/D or ←/→  Jump: Space / W / ↑', {
      fontFamily: 'Trebuchet MS',
      fontSize: '20px',
      color: '#b0d3f1',
    }).setOrigin(0.5)

    this.pressText = this.add.text(480, 326, 'Press Enter or Space', {
      fontFamily: 'Trebuchet MS',
      fontSize: '28px',
      color: '#ffffff',
    }).setOrigin(0.5)

    this.add.text(480, 392, 'Raw Data is fragile. Reach Kernel and trigger Reboot.', {
      fontFamily: 'Trebuchet MS',
      fontSize: '18px',
      color: '#8eb7dc',
    }).setOrigin(0.5)

    this.tweens.add({
      targets: this.pressText,
      alpha: { from: 0.35, to: 1 },
      yoyo: true,
      repeat: -1,
      duration: 820,
      ease: 'Sine.easeInOut',
    })

    this.input.on('pointerdown', () => this.openMainMenu())

    setRenderGameToText(() => ({
      mode: 'title',
      prompt: 'Press Enter or Space to open main menu',
    }))

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      clearRenderGameToText()
    })
  }

  update(): void {
    if (this.inputMap.consumeConfirmPressed()) {
      this.openMainMenu()
    }
  }

  private openMainMenu(): void {
    sessionStore.setFlow('main_menu')
    this.scene.start(SCENE_KEYS.MAIN_MENU)
  }
}
