import Phaser from 'phaser'
import { clearRenderGameToText, setRenderGameToText } from '../core/browserHooks'
import { SCENE_KEYS } from '../core/sceneKeys'
import { sessionStore } from '../core/sessionStore'
import { GameInput } from '../systems/input'

export class CreditsScene extends Phaser.Scene {
  private inputMap!: GameInput

  constructor() {
    super(SCENE_KEYS.CREDITS)
  }

  create(): void {
    sessionStore.setFlow('credits')

    this.inputMap = new GameInput(this)

    this.add.rectangle(480, 270, 960, 540, 0x050f1e, 1)

    this.add.text(480, 82, 'Credits', {
      fontFamily: 'Trebuchet MS',
      fontSize: '56px',
      color: '#97e4ff',
    }).setOrigin(0.5)

    this.add.text(
      480,
      210,
      [
        'Runtime: Zero Prototype',
        'Design + Engineering: Runtime Team',
        'World: The Legacy / Patch / Kernel',
        'All visuals and UI are original placeholders.',
      ],
      {
        fontFamily: 'Trebuchet MS',
        fontSize: '30px',
        color: '#cce9ff',
        align: 'center',
      },
    ).setOrigin(0.5)

    this.add.text(480, 446, 'Enter / Esc: Back to Main Menu', {
      fontFamily: 'Trebuchet MS',
      fontSize: '24px',
      color: '#a4cae7',
    }).setOrigin(0.5)

    setRenderGameToText(() => ({
      mode: 'credits',
      prompt: 'Press Enter or Esc to return to Main Menu',
    }))

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      clearRenderGameToText()
    })
  }

  update(): void {
    if (this.inputMap.consumeConfirmPressed() || this.inputMap.consumeCancelPressed()) {
      sessionStore.setFlow('main_menu')
      this.scene.start(SCENE_KEYS.MAIN_MENU)
    }
  }
}
