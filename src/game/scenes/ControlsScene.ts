import Phaser from 'phaser'
import { clearRenderGameToText, setRenderGameToText } from '../core/browserHooks'
import { keybindStore, type InputAction } from '../core/keybindStore'
import { SCENE_KEYS } from '../core/sceneKeys'
import { sessionStore } from '../core/sessionStore'

interface ControlsSceneData {
  returnScene?: string
}

interface ControlRow {
  action: InputAction
  label: string
}

const CONTROL_ROWS: ControlRow[] = [
  { action: 'left', label: 'Move Left' },
  { action: 'right', label: 'Move Right' },
  { action: 'jump', label: 'Jump' },
  { action: 'run', label: 'Run / Dash' },
  { action: 'fire', label: 'Debug Shot' },
  { action: 'pause', label: 'Pause' },
]

export class ControlsScene extends Phaser.Scene {
  private returnScene: string = SCENE_KEYS.MAIN_MENU
  private selectedIndex = 0
  private waitingForKey = false

  private rows: Array<{ label: Phaser.GameObjects.Text; value: Phaser.GameObjects.Text }> = []

  private upKey!: Phaser.Input.Keyboard.Key
  private downKey!: Phaser.Input.Keyboard.Key
  private enterKey!: Phaser.Input.Keyboard.Key
  private escKey!: Phaser.Input.Keyboard.Key
  private resetKey!: Phaser.Input.Keyboard.Key

  constructor() {
    super(SCENE_KEYS.CONTROLS)
  }

  create(data?: ControlsSceneData): void {
    sessionStore.setFlow('options')

    this.returnScene = data?.returnScene ?? SCENE_KEYS.MAIN_MENU

    this.upKey = this.input.keyboard!.addKey('UP')
    this.downKey = this.input.keyboard!.addKey('DOWN')
    this.enterKey = this.input.keyboard!.addKey('ENTER')
    this.escKey = this.input.keyboard!.addKey('ESC')
    this.resetKey = this.input.keyboard!.addKey('R')

    this.add.rectangle(480, 270, 960, 540, 0x061426, 1)
    this.add.rectangle(480, 270, 760, 450, 0x132a42, 0.96).setStrokeStyle(2, 0x6fbae7, 1)

    this.add.text(480, 86, 'Controls', {
      fontFamily: 'Trebuchet MS',
      fontSize: '52px',
      color: '#9de8ff',
    }).setOrigin(0.5)

    this.add.text(480, 124, 'Select action, press Enter, then press new key. R resets defaults.', {
      fontFamily: 'Trebuchet MS',
      fontSize: '18px',
      color: '#b6d6f2',
    }).setOrigin(0.5)

    this.rows = CONTROL_ROWS.map((row, index) => {
      const y = 186 + index * 46
      const label = this.add.text(190, y, row.label, {
        fontFamily: 'Trebuchet MS',
        fontSize: '26px',
        color: '#d4e8fb',
      })

      const value = this.add.text(560, y, '', {
        fontFamily: 'monospace',
        fontSize: '26px',
        color: '#ffffff',
      })

      return { label, value }
    })

    this.add.text(480, 472, '↑↓ select  Enter rebind  Esc back', {
      fontFamily: 'Trebuchet MS',
      fontSize: '20px',
      color: '#9bbfdf',
    }).setOrigin(0.5)

    this.refreshRows()

    setRenderGameToText(() => ({
      mode: 'controls',
      waitingForKey: this.waitingForKey,
      selected: CONTROL_ROWS[this.selectedIndex].action,
      bindings: keybindStore.getAll(),
      returnScene: this.returnScene,
    }))

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      clearRenderGameToText()
    })
  }

  update(): void {
    if (this.waitingForKey) {
      return
    }

    if (Phaser.Input.Keyboard.JustDown(this.upKey)) {
      this.selectedIndex = (this.selectedIndex - 1 + CONTROL_ROWS.length) % CONTROL_ROWS.length
      this.refreshRows()
    }

    if (Phaser.Input.Keyboard.JustDown(this.downKey)) {
      this.selectedIndex = (this.selectedIndex + 1) % CONTROL_ROWS.length
      this.refreshRows()
    }

    if (Phaser.Input.Keyboard.JustDown(this.resetKey)) {
      keybindStore.reset()
      this.refreshRows()
      return
    }

    if (Phaser.Input.Keyboard.JustDown(this.enterKey)) {
      this.waitingForKey = true
      const row = CONTROL_ROWS[this.selectedIndex]
      this.rows[this.selectedIndex].value.setText('PRESS KEY...')

      this.input.keyboard!.once('keydown', (event: KeyboardEvent) => {
        const keyName = event.key.length === 1 ? event.key.toUpperCase() : event.key.toUpperCase()
        const normalized = this.mapSpecialKey(keyName)
        keybindStore.setPrimary(row.action, normalized)
        this.waitingForKey = false
        this.refreshRows()
      })
      return
    }

    if (Phaser.Input.Keyboard.JustDown(this.escKey)) {
      this.scene.start(SCENE_KEYS.OPTIONS_MENU, { returnScene: this.returnScene })
    }
  }

  private mapSpecialKey(keyName: string): string {
    const map: Record<string, string> = {
      ARROWLEFT: 'LEFT',
      ARROWRIGHT: 'RIGHT',
      ARROWUP: 'UP',
      ARROWDOWN: 'DOWN',
      ESCAPE: 'ESC',
      ' ': 'SPACE',
    }

    return map[keyName] ?? keyName
  }

  private refreshRows(): void {
    CONTROL_ROWS.forEach((row, index) => {
      const active = index === this.selectedIndex
      const keys = keybindStore.get(row.action)
      this.rows[index].label.setColor(active ? '#ffffff' : '#d4e8fb')
      this.rows[index].value.setColor(active ? '#ffffff' : '#d9f0ff')
      this.rows[index].value.setText(keys.join(' / '))
    })
  }
}
