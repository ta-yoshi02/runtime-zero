import Phaser from 'phaser'
import { clearRenderGameToText, setRenderGameToText } from '../core/browserHooks'
import { SCENE_KEYS } from '../core/sceneKeys'
import { sessionStore } from '../core/sessionStore'
import { GameInput } from '../systems/input'

interface OptionsMenuData {
  returnScene?: string
}

interface MenuEntry {
  label: string
  action: () => void
}

export class OptionsMenuScene extends Phaser.Scene {
  private inputMap!: GameInput
  private returnScene: string = SCENE_KEYS.MAIN_MENU
  private menuEntries: MenuEntry[] = []
  private menuTexts: Phaser.GameObjects.Text[] = []
  private selectedIndex = 0

  constructor() {
    super(SCENE_KEYS.OPTIONS_MENU)
  }

  create(data?: OptionsMenuData): void {
    sessionStore.setFlow('options')

    this.returnScene = data?.returnScene ?? SCENE_KEYS.MAIN_MENU
    this.inputMap = new GameInput(this)

    this.menuEntries = [
      {
        label: 'Tuning',
        action: () => {
          this.scene.start(SCENE_KEYS.TUNING, { returnScene: this.returnScene, overlay: false })
        },
      },
      {
        label: 'Controls',
        action: () => {
          this.scene.start(SCENE_KEYS.CONTROLS, { returnScene: this.returnScene })
        },
      },
      {
        label: 'Back',
        action: () => {
          this.scene.start(this.returnScene)
        },
      },
    ]

    this.add.rectangle(480, 270, 960, 540, 0x061426, 1)
    this.add.rectangle(480, 140, 620, 160, 0x183553, 0.9)

    this.add.text(480, 92, 'Options', {
      fontFamily: 'Trebuchet MS',
      fontSize: '54px',
      color: '#9de8ff',
    }).setOrigin(0.5)

    this.add.text(480, 156, 'Tune controls and movement for Runtime: Zero.', {
      fontFamily: 'Trebuchet MS',
      fontSize: '22px',
      color: '#cde8ff',
    }).setOrigin(0.5)

    this.menuTexts = this.menuEntries.map((entry, index) => {
      const text = this.add
        .text(480, 258 + index * 64, entry.label, {
          fontFamily: 'Trebuchet MS',
          fontSize: '40px',
          color: '#d7eafe',
        })
        .setOrigin(0.5)
        .setInteractive({ cursor: 'pointer' })

      text.on('pointerover', () => {
        this.selectedIndex = index
        this.refreshMenu()
      })
      text.on('pointerdown', () => {
        this.selectedIndex = index
        this.menuEntries[this.selectedIndex].action()
      })

      return text
    })

    this.add.text(480, 492, '↑↓ select  Enter confirm  Esc back', {
      fontFamily: 'Trebuchet MS',
      fontSize: '20px',
      color: '#9bbfdf',
    }).setOrigin(0.5)

    this.refreshMenu()

    setRenderGameToText(() => ({
      mode: 'options_menu',
      selected: this.menuEntries[this.selectedIndex].label,
      returnScene: this.returnScene,
    }))

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      clearRenderGameToText()
    })
  }

  update(): void {
    if (this.inputMap.consumeUpPressed()) {
      this.selectedIndex = (this.selectedIndex - 1 + this.menuEntries.length) % this.menuEntries.length
      this.refreshMenu()
    }

    if (this.inputMap.consumeDownPressed()) {
      this.selectedIndex = (this.selectedIndex + 1) % this.menuEntries.length
      this.refreshMenu()
    }

    if (this.inputMap.consumeConfirmPressed()) {
      this.menuEntries[this.selectedIndex].action()
      return
    }

    if (this.inputMap.consumeCancelPressed()) {
      this.scene.start(this.returnScene)
    }
  }

  private refreshMenu(): void {
    this.menuTexts.forEach((text, index) => {
      const selected = index === this.selectedIndex
      text.setColor(selected ? '#ffffff' : '#d7eafe')
      text.setText(`${selected ? '▶ ' : '  '}${this.menuEntries[index].label}`)
    })
  }
}
