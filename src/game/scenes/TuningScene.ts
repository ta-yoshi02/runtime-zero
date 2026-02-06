import Phaser from 'phaser'
import { clearRenderGameToText, setRenderGameToText } from '../core/browserHooks'
import { SCENE_KEYS } from '../core/sceneKeys'
import { TUNING_FIELDS, tuningStore, type TuningFieldDefinition } from '../core/tuningStore'
import { sessionStore } from '../core/sessionStore'
import type { Difficulty } from '../types'

interface SliderRow {
  field: TuningFieldDefinition
  labelText: Phaser.GameObjects.Text
  barBg: Phaser.GameObjects.Rectangle
  barFill: Phaser.GameObjects.Rectangle
  knob: Phaser.GameObjects.Rectangle
  valueText: Phaser.GameObjects.Text
}

interface TuningSceneData {
  returnScene?: string
  overlay?: boolean
}

export class TuningScene extends Phaser.Scene {
  private rows: SliderRow[] = []
  private selectedIndex = 0

  private returnScene: string | null = null
  private overlay = false

  private leftKey!: Phaser.Input.Keyboard.Key
  private rightKey!: Phaser.Input.Keyboard.Key
  private upKey!: Phaser.Input.Keyboard.Key
  private downKey!: Phaser.Input.Keyboard.Key
  private enterKey!: Phaser.Input.Keyboard.Key
  private escKey!: Phaser.Input.Keyboard.Key
  private f1Key!: Phaser.Input.Keyboard.Key
  private resetKey!: Phaser.Input.Keyboard.Key

  private referenceDifficulty: Difficulty = 'Standard'

  constructor() {
    super(SCENE_KEYS.TUNING)
  }

  create(data?: TuningSceneData): void {
    sessionStore.setFlow('options')

    this.returnScene = data?.returnScene ?? SCENE_KEYS.MAIN_MENU
    this.overlay = Boolean(data?.overlay)

    this.leftKey = this.input.keyboard!.addKey('LEFT')
    this.rightKey = this.input.keyboard!.addKey('RIGHT')
    this.upKey = this.input.keyboard!.addKey('UP')
    this.downKey = this.input.keyboard!.addKey('DOWN')
    this.enterKey = this.input.keyboard!.addKey('ENTER')
    this.escKey = this.input.keyboard!.addKey('ESC')
    this.f1Key = this.input.keyboard!.addKey('F1')
    this.resetKey = this.input.keyboard!.addKey('R')

    this.referenceDifficulty = sessionStore.snapshot.difficulty

    this.buildLayout()
    this.refreshRows()

    setRenderGameToText(() => ({
      mode: 'options_tuning',
      selected: TUNING_FIELDS[this.selectedIndex].key,
      returnScene: this.returnScene,
      referenceDifficulty: this.referenceDifficulty,
      values: this.serializedValues(),
    }))

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      clearRenderGameToText()
    })
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.leftKey)) {
      this.adjustSelected(-1)
    }

    if (Phaser.Input.Keyboard.JustDown(this.rightKey)) {
      this.adjustSelected(1)
    }

    if (Phaser.Input.Keyboard.JustDown(this.resetKey)) {
      tuningStore.reset()
      this.refreshRows()
    }

    if (Phaser.Input.Keyboard.JustDown(this.upKey)) {
      this.selectedIndex = (this.selectedIndex - 1 + this.rows.length) % this.rows.length
      this.refreshRows()
    }

    if (Phaser.Input.Keyboard.JustDown(this.downKey)) {
      this.selectedIndex = (this.selectedIndex + 1) % this.rows.length
      this.refreshRows()
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.escKey) ||
      Phaser.Input.Keyboard.JustDown(this.f1Key) ||
      Phaser.Input.Keyboard.JustDown(this.enterKey)
    ) {
      this.exitToReturnScene()
    }
  }

  private buildLayout(): void {
    if (this.overlay) {
      this.add.rectangle(480, 270, 960, 540, 0x000000, 0.65)
    } else {
      this.add.rectangle(480, 270, 960, 540, 0x07182b, 1)
    }

    this.add.rectangle(480, 270, 900, 500, 0x132a42, 0.96).setStrokeStyle(2, 0x6fbae7, 1)

    this.add.text(480, 56, 'Tuning (Debug)', {
      fontFamily: 'Trebuchet MS',
      fontSize: '44px',
      color: '#9be8ff',
    }).setOrigin(0.5)

    this.add.text(480, 92, 'Adjust values with ←/→, select with ↑/↓, click bars, R reset, Enter/Esc/F1 return', {
      fontFamily: 'Trebuchet MS',
      fontSize: '16px',
      color: '#b7d8f2',
    }).setOrigin(0.5)

    this.add.text(480, 114, `localStorage key: runtime-zero:tuning-overrides:v1 / Difficulty baseline: ${this.referenceDifficulty}`, {
      fontFamily: 'Trebuchet MS',
      fontSize: '14px',
      color: '#8eb7d6',
    }).setOrigin(0.5)

    const startY = 142
    const rowHeight = 18
    const barX = 420
    const barWidth = 290

    this.rows = TUNING_FIELDS.map((field, index) => {
      const y = startY + index * rowHeight

      const labelText = this.add.text(86, y, field.label, {
        fontFamily: 'Trebuchet MS',
        fontSize: '14px',
        color: '#cae4f8',
      })

      const barBg = this.add
        .rectangle(barX, y + 10, barWidth, 8, 0x284c69, 0.95)
        .setOrigin(0, 0.5)
        .setStrokeStyle(1, 0x88bbdc, 1)
        .setInteractive({ cursor: 'pointer' })

      const barFill = this.add.rectangle(barX, y + 10, 0, 8, 0x76d8ff, 1).setOrigin(0, 0.5)
      const knob = this.add.rectangle(barX, y + 10, 6, 14, 0xffffff, 1).setOrigin(0.5)

      const valueText = this.add.text(740, y, '', {
        fontFamily: 'Trebuchet MS',
        fontSize: '14px',
        color: '#f7fdff',
      })

      barBg.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
        this.selectedIndex = index
        this.setFieldFromPointer(field, pointer.x, barX, barWidth)
        this.refreshRows()
      })

      barBg.on('pointermove', (pointer: Phaser.Input.Pointer) => {
        if (!pointer.isDown || this.selectedIndex !== index) {
          return
        }

        this.setFieldFromPointer(field, pointer.x, barX, barWidth)
        this.refreshRows()
      })

      return {
        field,
        labelText,
        barBg,
        barFill,
        knob,
        valueText,
      }
    })
  }

  private setFieldFromPointer(
    field: TuningFieldDefinition,
    pointerX: number,
    barX: number,
    barWidth: number,
  ): void {
    const ratio = Phaser.Math.Clamp((pointerX - barX) / barWidth, 0, 1)
    const rawValue = field.min + (field.max - field.min) * ratio
    tuningStore.setValue(field.key, rawValue)
  }

  private adjustSelected(stepDirection: -1 | 1): void {
    const row = this.rows[this.selectedIndex]
    const current = tuningStore.getValue(row.field.key, this.referenceDifficulty)
    tuningStore.setValue(row.field.key, current + row.field.step * stepDirection)
    this.refreshRows()
  }

  private refreshRows(): void {
    this.rows.forEach((row, index) => {
      const value = tuningStore.getValue(row.field.key, this.referenceDifficulty)
      const ratio = (value - row.field.min) / (row.field.max - row.field.min)
      const width = row.barBg.width * Phaser.Math.Clamp(ratio, 0, 1)

      row.barFill.width = width
      row.knob.x = row.barBg.x + width
      row.valueText.setText(value.toFixed(0))

      const selected = index === this.selectedIndex
      row.labelText.setColor(selected ? '#ffffff' : '#cae4f8')
      row.valueText.setColor(selected ? '#ffffff' : '#f7fdff')
      row.barBg.setStrokeStyle(selected ? 2 : 1, selected ? 0xffffff : 0x88bbdc, 1)
    })
  }

  private serializedValues(): Record<string, number> {
    return TUNING_FIELDS.reduce<Record<string, number>>((acc, field) => {
      acc[field.key] = tuningStore.getValue(field.key, this.referenceDifficulty)
      return acc
    }, {})
  }

  private exitToReturnScene(): void {
    if (this.returnScene && this.scene.isPaused(this.returnScene)) {
      this.setFlowFromSceneKey(this.returnScene)
      this.scene.resume(this.returnScene)
      this.scene.stop()
      return
    }

    const targetScene = this.returnScene ?? SCENE_KEYS.MAIN_MENU
    this.setFlowFromSceneKey(targetScene)
    this.scene.start(targetScene)
  }

  private setFlowFromSceneKey(sceneKey: string): void {
    if (sceneKey === SCENE_KEYS.STAGE_PLAY) {
      sessionStore.setFlow('ingame')
      return
    }

    if (sceneKey === SCENE_KEYS.STAGE_SELECT) {
      sessionStore.setFlow('stage_select')
      return
    }

    if (sceneKey === SCENE_KEYS.CREDITS) {
      sessionStore.setFlow('credits')
      return
    }

    if (sceneKey === SCENE_KEYS.RESULT) {
      sessionStore.setFlow('result')
      return
    }

    if (sceneKey === SCENE_KEYS.TITLE) {
      sessionStore.setFlow('title')
      return
    }

    sessionStore.setFlow('main_menu')
  }
}
