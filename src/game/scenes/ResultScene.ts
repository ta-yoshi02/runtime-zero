import Phaser from 'phaser'
import { clearRenderGameToText, setRenderGameToText } from '../core/browserHooks'
import { SCENE_KEYS } from '../core/sceneKeys'
import { sessionStore } from '../core/sessionStore'
import { GameInput } from '../systems/input'

export class ResultScene extends Phaser.Scene {
  private inputMap!: GameInput
  private menuKey!: Phaser.Input.Keyboard.Key

  constructor() {
    super(SCENE_KEYS.RESULT)
  }

  create(): void {
    sessionStore.setFlow('result')
    this.inputMap = new GameInput(this)
    this.menuKey = this.input.keyboard!.addKey('T')

    const result = sessionStore.snapshot.result

    this.add.rectangle(480, 270, 960, 540, 0x040e1a, 1)

    this.add.text(480, 92, result?.success ? 'Reboot Succeeded' : 'Process Interrupted', {
      fontFamily: 'Trebuchet MS',
      fontSize: '56px',
      color: result?.success ? '#9af4d2' : '#ffc0b0',
    }).setOrigin(0.5)

    this.add.text(480, 180, `Stage: ${result?.stageName ?? 'Unknown Sector'}`, {
      fontFamily: 'Trebuchet MS',
      fontSize: '30px',
      color: '#d8efff',
    }).setOrigin(0.5)

    this.add.text(
      480,
      226,
      `Time: ${((result?.elapsedMs ?? 0) / 1000).toFixed(2)}s  Difficulty: ${result?.difficulty ?? 'Standard'}  Mirror: ${result?.mirror ? 'ON' : 'OFF'}`,
      {
        fontFamily: 'Trebuchet MS',
        fontSize: '22px',
        color: '#b5d7ef',
      },
    ).setOrigin(0.5)

    this.add.text(480, 282, `Reason: ${result?.reason ?? 'n/a'}`, {
      fontFamily: 'Trebuchet MS',
      fontSize: '22px',
      color: '#90b9d8',
    }).setOrigin(0.5)

    this.add.text(480, 360, 'Enter: Stage Select   R: Retry   T / Esc: Main Menu', {
      fontFamily: 'Trebuchet MS',
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5)

    setRenderGameToText(() => ({
      mode: 'result',
      result,
      prompt: 'Enter stage select / R retry / T main menu',
    }))

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      clearRenderGameToText()
    })
  }

  update(): void {
    if (this.inputMap.consumeConfirmPressed()) {
      sessionStore.setFlow('stage_select')
      this.scene.start(SCENE_KEYS.STAGE_SELECT)
      return
    }

    if (this.inputMap.consumeRestartPressed()) {
      sessionStore.setFlow('ingame')
      this.scene.start(SCENE_KEYS.STAGE_PLAY)
      return
    }

    if (this.inputMap.consumeCancelPressed() || Phaser.Input.Keyboard.JustDown(this.menuKey)) {
      sessionStore.setFlow('main_menu')
      this.scene.start(SCENE_KEYS.MAIN_MENU)
    }
  }
}
