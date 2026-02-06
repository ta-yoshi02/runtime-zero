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
  private windowKeydownHandler: ((event: KeyboardEvent) => void) | null = null
  private transitioning = false
  private domFallbackContainer: HTMLDivElement | null = null
  private autoAdvanceTimer: number | null = null

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

    this.add.text(480, 450, 'If keyboard does not respond, click one of these:', {
      fontFamily: 'Trebuchet MS',
      fontSize: '18px',
      color: '#9fc6e4',
    }).setOrigin(0.5)

    this.createActionButton('Stage Select', 300, 494, () => this.goStageSelect())
    this.createActionButton('Retry', 480, 494, () => this.goRetry())
    this.createActionButton('Main Menu', 660, 494, () => this.goMainMenu())
    this.mountDomFallbackControls()

    setRenderGameToText(() => ({
      mode: 'result',
      result,
      prompt: 'Enter stage select / R retry / T main menu',
    }))

    this.keydownHandler = (event: KeyboardEvent) => {
      this.handleRawKeydown(event)
    }
    keyboard?.on('keydown', this.keydownHandler)

    this.windowKeydownHandler = (event: KeyboardEvent) => {
      this.handleRawKeydown(event)
    }
    window.addEventListener('keydown', this.windowKeydownHandler, { passive: false })
    this.autoAdvanceTimer = window.setTimeout(() => {
      this.goStageSelect()
    }, 12000)

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.keydownHandler) {
        keyboard?.off('keydown', this.keydownHandler)
      }
      this.keydownHandler = null
      if (this.windowKeydownHandler) {
        window.removeEventListener('keydown', this.windowKeydownHandler)
      }
      this.windowKeydownHandler = null
      if (this.autoAdvanceTimer !== null) {
        window.clearTimeout(this.autoAdvanceTimer)
      }
      this.autoAdvanceTimer = null
      this.unmountDomFallbackControls()
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
    const key = event.key.toLowerCase()

    if (code === 'Enter' || code === 'NumpadEnter' || code === 'Space' || key === 'enter' || key === ' ') {
      event.preventDefault()
      this.goStageSelect()
      return
    }

    if (code === 'KeyR' || key === 'r') {
      event.preventDefault()
      this.goRetry()
      return
    }

    if (code === 'KeyT' || code === 'Escape' || key === 't' || key === 'escape') {
      event.preventDefault()
      this.goMainMenu()
    }
  }

  private createActionButton(
    label: string,
    x: number,
    y: number,
    onSelect: () => void,
  ): void {
    const button = this.add
      .text(x, y, label, {
        fontFamily: 'Trebuchet MS',
        fontSize: '24px',
        color: '#e8f7ff',
        backgroundColor: '#11324a',
        padding: { left: 14, right: 14, top: 8, bottom: 8 },
      })
      .setOrigin(0.5)
      .setInteractive({ cursor: 'pointer' })

    button.on('pointerover', () => {
      button.setColor('#ffffff')
      button.setBackgroundColor('#1f5273')
    })
    button.on('pointerout', () => {
      button.setColor('#e8f7ff')
      button.setBackgroundColor('#11324a')
    })
    button.on('pointerdown', () => {
      onSelect()
    })
  }

  private mountDomFallbackControls(): void {
    this.unmountDomFallbackControls()

    const root = document.querySelector<HTMLElement>('#app')
    if (!root) {
      return
    }

    const container = document.createElement('div')
    container.style.position = 'absolute'
    container.style.left = '50%'
    container.style.bottom = '18px'
    container.style.transform = 'translateX(-50%)'
    container.style.display = 'flex'
    container.style.gap = '10px'
    container.style.zIndex = '9999'
    container.style.pointerEvents = 'auto'

    const createDomButton = (label: string, onClick: () => void): HTMLButtonElement => {
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = label
      button.style.fontFamily = 'Trebuchet MS, sans-serif'
      button.style.fontSize = '16px'
      button.style.color = '#e8f7ff'
      button.style.background = '#10324b'
      button.style.border = '1px solid #6faad0'
      button.style.borderRadius = '6px'
      button.style.padding = '8px 12px'
      button.style.cursor = 'pointer'
      button.addEventListener('click', () => onClick())
      return button
    }

    container.appendChild(createDomButton('Stage Select', () => this.goStageSelect()))
    container.appendChild(createDomButton('Retry', () => this.goRetry()))
    container.appendChild(createDomButton('Main Menu', () => this.goMainMenu()))

    root.appendChild(container)
    this.domFallbackContainer = container
  }

  private unmountDomFallbackControls(): void {
    if (!this.domFallbackContainer) {
      return
    }
    this.domFallbackContainer.remove()
    this.domFallbackContainer = null
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
