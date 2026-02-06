import Phaser from 'phaser'
import { clearRenderGameToText, setRenderGameToText } from '../core/browserHooks'
import { SCENE_KEYS } from '../core/sceneKeys'
import { sessionStore } from '../core/sessionStore'
import { GameInput } from '../systems/input'

export class ResultScene extends Phaser.Scene {
  private inputMap!: GameInput
  private menuKey!: Phaser.Input.Keyboard.Key
  private enterKey!: Phaser.Input.Keyboard.Key
  private retryKey!: Phaser.Input.Keyboard.Key
  private escKey!: Phaser.Input.Keyboard.Key
  private keydownHandler: ((event: KeyboardEvent) => void) | null = null
  private transitioning = false

  constructor() {
    super(SCENE_KEYS.RESULT)
  }

  create(): void {
    this.physics.world.resume()

    sessionStore.setFlow('result')
    this.transitioning = false

    const keyboard = this.input.keyboard
    if (keyboard) {
      keyboard.enabled = true
      keyboard.resetKeys()
    }

    this.inputMap = new GameInput(this)
    this.menuKey = this.input.keyboard!.addKey('T')
    this.enterKey = this.input.keyboard!.addKey('ENTER')
    this.retryKey = this.input.keyboard!.addKey('R')
    this.escKey = this.input.keyboard!.addKey('ESC')

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

    this.add.text(
      480,
      326,
      `Cycles: ${result?.cycles ?? 0}  Gems: ${result?.gems ?? 0}  Hits: ${result?.hits ?? 0}  Backups Used: ${result?.backupsUsed ?? 0}`,
      {
        fontFamily: 'Trebuchet MS',
        fontSize: '21px',
        color: '#d7efff',
      },
    ).setOrigin(0.5)

    this.add.text(480, 364, `Rank: ${result?.rank ?? 'C'}`, {
      fontFamily: 'Trebuchet MS',
      fontSize: '36px',
      color: '#9be9ff',
    }).setOrigin(0.5)

    this.add.text(480, 418, 'Enter: Stage Select   R: Retry   T / Esc: Main Menu', {
      fontFamily: 'Trebuchet MS',
      fontSize: '24px',
      color: '#ffffff',
    }).setOrigin(0.5)

    setRenderGameToText(() => ({
      mode: 'result',
      result,
      prompt: 'Enter stage select / R retry / T main menu',
    }))

    this.keydownHandler = (event: KeyboardEvent) => {
      this.handleRawKeydown(event)
    }
    keyboard?.on('keydown', this.keydownHandler)

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.keydownHandler) {
        keyboard?.off('keydown', this.keydownHandler)
      }
      this.keydownHandler = null
      clearRenderGameToText()
    })
  }

  update(): void {
    if (this.transitioning) {
      return
    }

    if (this.inputMap.consumeConfirmPressed() || Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.goStageSelect()
      return
    }

    if (this.inputMap.consumeRestartPressed() || Phaser.Input.Keyboard.JustDown(this.retryKey)) {
      this.goRetry()
      return
    }

    if (
      this.inputMap.consumeCancelPressed() ||
      Phaser.Input.Keyboard.JustDown(this.menuKey) ||
      Phaser.Input.Keyboard.JustDown(this.escKey)
    ) {
      this.goMainMenu()
    }
  }

  private handleRawKeydown(event: KeyboardEvent): void {
    if (this.transitioning) {
      return
    }

    const code = event.code
    if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space') {
      this.goStageSelect()
      return
    }

    if (code === 'KeyR') {
      this.goRetry()
      return
    }

    if (code === 'KeyT' || code === 'Escape') {
      this.goMainMenu()
    }
  }

  private goStageSelect(): void {
    if (this.transitioning) {
      return
    }

    this.transitioning = true
    sessionStore.setFlow('stage_select')
    this.scene.start(SCENE_KEYS.STAGE_SELECT)
  }

  private goRetry(): void {
    if (this.transitioning) {
      return
    }

    this.transitioning = true
    sessionStore.setFlow('ingame')
    this.scene.start(SCENE_KEYS.STAGE_PLAY)
  }

  private goMainMenu(): void {
    if (this.transitioning) {
      return
    }

    this.transitioning = true
    sessionStore.setFlow('main_menu')
    this.scene.start(SCENE_KEYS.MAIN_MENU)
  }
}
