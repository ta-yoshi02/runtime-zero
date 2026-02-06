import Phaser from 'phaser'
import { clearRenderGameToText, setRenderGameToText } from '../core/browserHooks'
import { SCENE_KEYS } from '../core/sceneKeys'
import { sessionStore } from '../core/sessionStore'
import { getMovementTuning, getStageById } from '../data/stages'
import { GameInput } from '../systems/input'
import { PlayerController } from '../systems/playerController'
import type { Rect, RunResult, StageDefinition } from '../types'

const CAMERA_LOOK_AHEAD = 120

type PauseOption = 'Resume' | 'Restart Stage' | 'Exit to Stage Select'

export class StagePlayScene extends Phaser.Scene {
  private inputMap!: GameInput
  private player!: PlayerController
  private stage!: StageDefinition
  private stageStartTimeMs = 0
  private stageFinished = false
  private paused = false

  private platforms!: Phaser.Physics.Arcade.StaticGroup
  private goalZone!: Phaser.GameObjects.Zone
  private transformedGoal!: Rect

  private hudText!: Phaser.GameObjects.Text
  private pauseOverlay!: Phaser.GameObjects.Container
  private pauseOptions: PauseOption[] = ['Resume', 'Restart Stage', 'Exit to Stage Select']
  private pauseOptionTexts: Phaser.GameObjects.Text[] = []
  private pauseIndex = 0

  constructor() {
    super(SCENE_KEYS.STAGE_PLAY)
  }

  create(): void {
    const snapshot = sessionStore.snapshot
    this.stage = getStageById(snapshot.selectedStageId)
    sessionStore.setFlow('ingame')

    this.inputMap = new GameInput(this)

    this.setupWorld()
    this.createBackdrop()
    this.createPlatforms(snapshot.mirror)

    const spawn = this.transformPoint(this.stage.spawn, snapshot.mirror)
    this.player = new PlayerController(this, this.inputMap, spawn, getMovementTuning(snapshot.difficulty))
    this.physics.add.collider(this.player.sprite, this.platforms)

    this.createGoal(snapshot.mirror)
    this.physics.add.overlap(this.player.sprite, this.goalZone, () => {
      this.finishRun(true, 'goal')
    })

    this.createGemHintMarkers(snapshot.mirror)

    this.cameras.main.startFollow(this.player.sprite, true, 0.09, 0.09)
    this.cameras.main.setDeadzone(220, 140)

    this.hudText = this.add
      .text(16, 16, '', {
        fontFamily: 'Trebuchet MS',
        fontSize: '20px',
        color: '#eaf7ff',
      })
      .setScrollFactor(0)
      .setDepth(9)

    this.createPauseOverlay()
    this.refreshHud()

    this.stageStartTimeMs = this.time.now

    setRenderGameToText(() => this.makeTextState())

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      clearRenderGameToText()
    })
  }

  update(_: number, delta: number): void {
    if (this.stageFinished) {
      return
    }

    if (this.paused) {
      this.updatePauseMenu()
      return
    }

    if (this.inputMap.consumePausePressed() || this.inputMap.consumeCancelPressed()) {
      this.setPaused(true)
      return
    }

    if (this.inputMap.consumeRestartPressed()) {
      this.restartStage()
      return
    }

    this.player.update(delta)
    this.updateCameraLookAhead()

    if (this.player.sprite.y > this.stage.size.height + 80) {
      this.finishRun(false, 'null_pointer')
      return
    }

    this.refreshHud()
  }

  private setupWorld(): void {
    this.physics.world.setBounds(0, 0, this.stage.size.width, this.stage.size.height)
    this.cameras.main.setBounds(0, 0, this.stage.size.width, this.stage.size.height)
  }

  private createBackdrop(): void {
    this.add.rectangle(
      this.stage.size.width * 0.5,
      this.stage.size.height * 0.5,
      this.stage.size.width,
      this.stage.size.height,
      0x061324,
      1,
    )

    this.add.rectangle(420, 130, 560, 130, 0x18344d, 0.45)
    this.add.rectangle(1200, 190, 700, 160, 0x1a3d58, 0.35)
    this.add.rectangle(2200, 140, 640, 120, 0x122f48, 0.4)

    this.add.text(26, 658, 'Null Pointer Zone', {
      fontFamily: 'Trebuchet MS',
      fontSize: '18px',
      color: '#9ac6e4',
    })
  }

  private createPlatforms(mirror: boolean): void {
    this.platforms = this.physics.add.staticGroup()

    this.stage.platforms.forEach((platformRect) => {
      const rect = this.transformRect(platformRect, mirror)
      const platform = this.platforms.create(rect.x, rect.y, 'platform-block')
      platform.setOrigin(0, 0)
      platform.setDisplaySize(rect.width, rect.height)
      platform.refreshBody()
    })
  }

  private createGoal(mirror: boolean): void {
    this.transformedGoal = this.transformRect(this.stage.goal, mirror)

    this.add
      .rectangle(
        this.transformedGoal.x + this.transformedGoal.width * 0.5,
        this.transformedGoal.y + this.transformedGoal.height * 0.5,
        this.transformedGoal.width,
        this.transformedGoal.height,
        0x3bd5ff,
        0.2,
      )
      .setDepth(1)

    this.add
      .image(
        this.transformedGoal.x + this.transformedGoal.width * 0.5,
        this.transformedGoal.y + this.transformedGoal.height * 0.5,
        'goal-kernel',
      )
      .setDisplaySize(this.transformedGoal.width, this.transformedGoal.height)
      .setDepth(2)

    this.goalZone = this.add.zone(
      this.transformedGoal.x,
      this.transformedGoal.y,
      this.transformedGoal.width,
      this.transformedGoal.height,
    )
    this.goalZone.setOrigin(0, 0)
    this.physics.add.existing(this.goalZone, true)
  }

  private createGemHintMarkers(mirror: boolean): void {
    this.stage.gemHints.forEach((hint) => {
      const point = this.transformPoint(hint, mirror)
      const marker = this.add.image(point.x, point.y, 'gem-hint').setDepth(3)
      marker.setAlpha(0.55)

      this.tweens.add({
        targets: marker,
        alpha: { from: 0.25, to: 0.85 },
        y: marker.y - 8,
        duration: 980,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
    })
  }

  private createPauseOverlay(): void {
    const dim = this.add
      .rectangle(480, 270, 960, 540, 0x02060a, 0.72)
      .setScrollFactor(0)
      .setDepth(30)

    const panel = this.add
      .rectangle(480, 270, 480, 300, 0x15324a, 0.96)
      .setStrokeStyle(3, 0x74c7ff, 1)
      .setScrollFactor(0)
      .setDepth(31)

    const title = this.add
      .text(480, 168, 'Paused', {
        fontFamily: 'Trebuchet MS',
        fontSize: '42px',
        color: '#ebf9ff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(32)

    this.pauseOptionTexts = this.pauseOptions.map((option, index) =>
      this.add
        .text(480, 238 + index * 50, option, {
          fontFamily: 'Trebuchet MS',
          fontSize: '30px',
          color: '#cae7ff',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(32),
    )

    const helper = this.add
      .text(480, 366, '↑↓ select  Enter confirm  Esc/P resume', {
        fontFamily: 'Trebuchet MS',
        fontSize: '18px',
        color: '#97bbd8',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(32)

    this.pauseOverlay = this.add.container(0, 0, [dim, panel, title, ...this.pauseOptionTexts, helper])
    this.pauseOverlay.setVisible(false)

    this.refreshPauseMenu()
  }

  private updatePauseMenu(): void {
    if (this.inputMap.consumePausePressed() || this.inputMap.consumeCancelPressed()) {
      this.setPaused(false)
      return
    }

    if (this.inputMap.consumeUpPressed()) {
      this.pauseIndex = (this.pauseIndex - 1 + this.pauseOptions.length) % this.pauseOptions.length
      this.refreshPauseMenu()
    }

    if (this.inputMap.consumeDownPressed()) {
      this.pauseIndex = (this.pauseIndex + 1) % this.pauseOptions.length
      this.refreshPauseMenu()
    }

    if (this.inputMap.consumeConfirmPressed()) {
      this.executePauseOption(this.pauseOptions[this.pauseIndex])
    }
  }

  private executePauseOption(option: PauseOption): void {
    if (option === 'Resume') {
      this.setPaused(false)
      return
    }

    if (option === 'Restart Stage') {
      this.restartStage()
      return
    }

    this.physics.world.resume()
    sessionStore.setFlow('stage_select')
    this.scene.start(SCENE_KEYS.STAGE_SELECT)
  }

  private setPaused(value: boolean): void {
    this.paused = value
    this.pauseOverlay.setVisible(value)

    if (value) {
      this.physics.world.pause()
    } else {
      this.physics.world.resume()
    }

    this.refreshHud()
  }

  private refreshPauseMenu(): void {
    this.pauseOptionTexts.forEach((text, index) => {
      const selected = index === this.pauseIndex
      text.setColor(selected ? '#ffffff' : '#cae7ff')
      text.setText(`${selected ? '▶ ' : '  '}${this.pauseOptions[index]}`)
    })
  }

  private restartStage(): void {
    this.physics.world.resume()
    this.scene.restart()
  }

  private updateCameraLookAhead(): void {
    const lookAhead = this.player.getLookAhead(CAMERA_LOOK_AHEAD)
    const camera = this.cameras.main
    camera.followOffset.x = Phaser.Math.Linear(camera.followOffset.x, lookAhead, 0.14)
  }

  private refreshHud(): void {
    const snapshot = sessionStore.snapshot
    const elapsedSeconds = ((this.time.now - this.stageStartTimeMs) / 1000).toFixed(2)

    this.hudText.setText([
      `Stage ${this.stage.index.toString().padStart(2, '0')} ${this.stage.name} (${this.stage.theme})`,
      `Difficulty: ${snapshot.difficulty}  Mirror: ${snapshot.mirror ? 'ON' : 'OFF'}  Time: ${elapsedSeconds}s`,
      this.paused ? 'Paused' : 'Reach Kernel. Drop below map = Null Pointer.',
      'Controls: Move A/D Jump Space/W/↑ Pause Esc/P Restart R',
    ])
  }

  private finishRun(success: boolean, reason: RunResult['reason']): void {
    if (this.stageFinished) {
      return
    }

    this.stageFinished = true
    this.physics.world.pause()

    const snapshot = sessionStore.snapshot
    const runResult: RunResult = {
      stageId: this.stage.id,
      stageName: this.stage.name,
      success,
      reason,
      elapsedMs: this.time.now - this.stageStartTimeMs,
      difficulty: snapshot.difficulty,
      mirror: snapshot.mirror,
    }

    sessionStore.setResult(runResult)
    sessionStore.setFlow('result')
    this.scene.start(SCENE_KEYS.RESULT)
  }

  private makeTextState(): Record<string, unknown> {
    const snapshot = sessionStore.snapshot
    return {
      mode: 'ingame',
      coordinateSystem: 'origin(0,0) top-left; +x right; +y down',
      paused: this.paused,
      stage: {
        id: this.stage.id,
        name: this.stage.name,
        mirror: snapshot.mirror,
        difficulty: snapshot.difficulty,
      },
      player: this.player.getStateSnapshot(),
      goal: this.transformedGoal,
      hints: this.stage.gemHints,
    }
  }

  private transformPoint(point: { x: number; y: number }, mirror: boolean): { x: number; y: number } {
    if (!mirror) {
      return { ...point }
    }

    return {
      x: this.stage.size.width - point.x,
      y: point.y,
    }
  }

  private transformRect(rect: Rect, mirror: boolean): Rect {
    if (!mirror) {
      return { ...rect }
    }

    return {
      x: this.stage.size.width - rect.x - rect.width,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    }
  }
}
