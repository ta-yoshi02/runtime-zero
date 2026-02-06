import Phaser from 'phaser'
import { clearRenderGameToText, setRenderGameToText } from '../core/browserHooks'
import { SCENE_KEYS } from '../core/sceneKeys'
import { DIFFICULTY_ORDER, sessionStore } from '../core/sessionStore'
import { stages } from '../data/stages'
import { GameInput } from '../systems/input'

export class StageSelectScene extends Phaser.Scene {
  private inputMap!: GameInput
  private selectedIndex = 0
  private leftKey!: Phaser.Input.Keyboard.Key
  private rightKey!: Phaser.Input.Keyboard.Key
  private mirrorKey!: Phaser.Input.Keyboard.Key
  private difficultyText!: Phaser.GameObjects.Text
  private mirrorText!: Phaser.GameObjects.Text
  private stageRows: Phaser.GameObjects.Text[] = []

  constructor() {
    super(SCENE_KEYS.STAGE_SELECT)
  }

  create(): void {
    sessionStore.setFlow('stage_select')
    sessionStore.clearResult()

    this.inputMap = new GameInput(this)
    this.leftKey = this.input.keyboard!.addKey('LEFT')
    this.rightKey = this.input.keyboard!.addKey('RIGHT')
    this.mirrorKey = this.input.keyboard!.addKey('M')

    this.selectedIndex = Math.max(
      0,
      stages.findIndex((stage) => stage.id === sessionStore.snapshot.selectedStageId),
    )

    this.add.rectangle(480, 270, 960, 540, 0x040e1a, 1)
    this.add.text(480, 52, 'Stage Select', {
      fontFamily: 'Trebuchet MS',
      fontSize: '42px',
      color: '#94e7ff',
    }).setOrigin(0.5)

    this.add.text(78, 96, 'All sectors are unlocked in this prototype slice.', {
      fontFamily: 'Trebuchet MS',
      fontSize: '20px',
      color: '#b5d7f6',
    })

    this.difficultyText = this.add.text(78, 132, '', {
      fontFamily: 'Trebuchet MS',
      fontSize: '24px',
      color: '#f5fbff',
    })

    this.mirrorText = this.add.text(78, 164, '', {
      fontFamily: 'Trebuchet MS',
      fontSize: '24px',
      color: '#f5fbff',
    })

    stages.forEach((stage, index) => {
      const row = this.add.text(90, 216 + index * 36, '', {
        fontFamily: 'Trebuchet MS',
        fontSize: '24px',
        color: '#acd3f4',
      })
      this.stageRows.push(row)
      if (index === 0) {
        row.setColor('#ffffff')
      }

      const gimmick = this.add.text(554, 216 + index * 36, stage.gimmick, {
        fontFamily: 'Trebuchet MS',
        fontSize: '20px',
        color: '#6eb9d8',
      })
      gimmick.setOrigin(0, 0.05)
    })

    this.add.text(78, 505, '↑↓:Stage  ←→:Difficulty  M:Mirror  Enter:Start  Esc:Title', {
      fontFamily: 'Trebuchet MS',
      fontSize: '18px',
      color: '#7aa7cf',
    })

    this.refreshTexts()

    setRenderGameToText(() => ({
      mode: 'stage_select',
      selectedStage: stages[this.selectedIndex].id,
      selectedDifficulty: sessionStore.snapshot.difficulty,
      mirror: sessionStore.snapshot.mirror,
      unlockedStages: stages.map((stage) => stage.id),
    }))

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      clearRenderGameToText()
    })
  }

  update(): void {
    if (this.inputMap.consumeUpPressed()) {
      this.selectedIndex = (this.selectedIndex - 1 + stages.length) % stages.length
      sessionStore.setSelectedStage(stages[this.selectedIndex].id)
      this.refreshTexts()
    }

    if (this.inputMap.consumeDownPressed()) {
      this.selectedIndex = (this.selectedIndex + 1) % stages.length
      sessionStore.setSelectedStage(stages[this.selectedIndex].id)
      this.refreshTexts()
    }

    if (Phaser.Input.Keyboard.JustDown(this.leftKey)) {
      sessionStore.shiftDifficulty(-1)
      this.refreshTexts()
    }

    if (Phaser.Input.Keyboard.JustDown(this.rightKey)) {
      sessionStore.shiftDifficulty(1)
      this.refreshTexts()
    }

    if (Phaser.Input.Keyboard.JustDown(this.mirrorKey)) {
      sessionStore.toggleMirror()
      this.refreshTexts()
    }

    if (this.inputMap.consumeConfirmPressed()) {
      sessionStore.setFlow('ingame')
      this.scene.start(SCENE_KEYS.STAGE_PLAY)
    }

    if (this.inputMap.consumeCancelPressed()) {
      sessionStore.resetToTitle()
      this.scene.start(SCENE_KEYS.TITLE)
    }
  }

  private refreshTexts(): void {
    const snapshot = sessionStore.snapshot

    this.difficultyText.setText(
      `Difficulty: ${snapshot.difficulty} (${DIFFICULTY_ORDER.join(' / ')})`,
    )
    this.mirrorText.setText(`Mirror: ${snapshot.mirror ? 'ON' : 'OFF'}`)

    this.stageRows.forEach((row, index) => {
      const stage = stages[index]
      const selected = index === this.selectedIndex
      row.setText(`${selected ? '▶' : ' '} Stage ${stage.index.toString().padStart(2, '0')}  ${stage.name}`)
      row.setColor(selected ? '#ffffff' : '#acd3f4')
    })
  }
}
