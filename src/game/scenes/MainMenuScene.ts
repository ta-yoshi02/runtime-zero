import Phaser from 'phaser'
import { clearRenderGameToText, setRenderGameToText } from '../core/browserHooks'
import { SCENE_KEYS } from '../core/sceneKeys'
import { sessionStore } from '../core/sessionStore'
import { GameInput } from '../systems/input'

interface MenuEntry {
  label: string
  action: () => void
}

export class MainMenuScene extends Phaser.Scene {
  private inputMap!: GameInput
  private menuEntries: MenuEntry[] = []
  private menuTexts: Phaser.GameObjects.Text[] = []
  private selectedIndex = 0

  constructor() {
    super(SCENE_KEYS.MAIN_MENU)
  }

  create(): void {
    sessionStore.setFlow('main_menu')

    this.inputMap = new GameInput(this)

    this.menuEntries = [
      {
        label: 'Start',
        action: () => {
          sessionStore.setFlow('stage_select')
          this.scene.start(SCENE_KEYS.STAGE_SELECT)
        },
      },
      {
        label: 'Options',
        action: () => {
          sessionStore.setFlow('options')
          this.scene.start(SCENE_KEYS.TUNING, {
            returnScene: SCENE_KEYS.MAIN_MENU,
            overlay: false,
          })
        },
      },
      {
        label: 'Credits',
        action: () => {
          sessionStore.setFlow('credits')
          this.scene.start(SCENE_KEYS.CREDITS)
        },
      },
    ]

    this.add.rectangle(480, 270, 960, 540, 0x081a2e, 1)
    this.add.rectangle(480, 134, 620, 160, 0x14314f, 0.88)
    this.add.text(480, 96, 'Main Menu', {
      fontFamily: 'Trebuchet MS',
      fontSize: '54px',
      color: '#9de9ff',
    }).setOrigin(0.5)

    this.add.text(480, 160, 'The Legacy is degrading. Choose your next action.', {
      fontFamily: 'Trebuchet MS',
      fontSize: '22px',
      color: '#c0def6',
    }).setOrigin(0.5)

    this.menuTexts = this.menuEntries.map((entry, index) => {
      const text = this.add
        .text(480, 260 + index * 62, entry.label, {
          fontFamily: 'Trebuchet MS',
          fontSize: '40px',
          color: '#d3e9fb',
        })
        .setOrigin(0.5)
        .setInteractive({ cursor: 'pointer' })

      text.on('pointerover', () => {
        this.selectedIndex = index
        this.refreshMenu()
      })
      text.on('pointerdown', () => {
        this.selectedIndex = index
        this.confirmSelection()
      })

      return text
    })

    this.add.text(480, 488, '↑↓ select  Enter confirm  Esc back title', {
      fontFamily: 'Trebuchet MS',
      fontSize: '20px',
      color: '#9bbfdf',
    }).setOrigin(0.5)

    this.refreshMenu()

    setRenderGameToText(() => ({
      mode: 'main_menu',
      selected: this.menuEntries[this.selectedIndex].label,
      entries: this.menuEntries.map((entry) => entry.label),
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
      this.confirmSelection()
    }

    if (this.inputMap.consumeCancelPressed()) {
      sessionStore.resetToTitle()
      this.scene.start(SCENE_KEYS.TITLE)
    }
  }

  private refreshMenu(): void {
    this.menuTexts.forEach((text, index) => {
      const selected = index === this.selectedIndex
      text.setColor(selected ? '#ffffff' : '#d3e9fb')
      text.setText(`${selected ? '▶ ' : '  '}${this.menuEntries[index].label}`)
    })
  }

  private confirmSelection(): void {
    this.menuEntries[this.selectedIndex].action()
  }
}
