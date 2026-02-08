import Phaser from 'phaser'
import { clearRenderGameToText, setRenderGameToText } from '../core/browserHooks'
import { SCENE_KEYS } from '../core/sceneKeys'
import { sessionStore } from '../core/sessionStore'
import { tuningStore } from '../core/tuningStore'
import {
  canSpawnForDifficulty,
  getStageById,
  stageGemCount,
} from '../data/stages'
import { runtimeAudio } from '../systems/audio'
import { GameInput } from '../systems/input'
import { PlayerController } from '../systems/playerController'
import type {
  Difficulty,
  EnemyKind,
  MovementTuning,
  PatchState,
  Rank,
  Rect,
  RunResult,
  StageCheckpoint,
  StageCollapsingPlatform,
  StageDefinition,
  StageEnemySpawn,
  StageGravityZone,
  StageItemSpawn,
  StageMovingPlatform,
  StagePortSocket,
  StageRotatorZone,
  StageSpringPad,
  StageWaterZone,
  StageWindZone,
} from '../types'

const BINARY_SUDO_DURATION_MS = 9000
const CHECKPOINT_RESPAWN_INVULN_MS = 1400
const RAW_RESPAWN_CONTROL_LOCK_MS = 320
const COLLAPSING_FLASH_MS = 260
const SLOW_MO_GEM_MS = 90
const START_RESPAWN_DROP_Y = 64
const CHECKPOINT_EDGE_PADDING = 2
const CHECKPOINT_VERTICAL_RAISE_LIMIT = 40
const CHECKPOINT_RESPAWN_CLEARANCE_Y = 12
const WATER_SWIM_ASCENT_FORCE = 2500

type PauseOption = 'Resume' | 'Restart Stage' | 'Exit to Stage Select'

type StageFailReason = RunResult['reason']

interface EnemyRuntime {
  sprite: Phaser.Physics.Arcade.Sprite
  spawn: StageEnemySpawn
  kind: EnemyKind
  baseSpeed: number
  patrolMinX: number
  patrolMaxX: number
  patrolDir: -1 | 1
  baseY: number
  phase: number
  aiTimerMs: number
  shotCooldownMs: number
  dashCooldownMs: number
  dashActiveMs: number
  alive: boolean
}

interface ShotRuntime {
  sprite: Phaser.Physics.Arcade.Image
  lifeMs: number
  velocityX: number
  velocityY: number
}

interface PortRuntime {
  port: StagePortSocket
  zone: Phaser.GameObjects.Zone
}

interface SpringRuntime {
  spring: StageSpringPad
  sprite: Phaser.Physics.Arcade.Image
}

interface CollapseRuntime {
  platform: StageCollapsingPlatform
  sprite: Phaser.Physics.Arcade.Image
  state: 'stable' | 'countdown' | 'collapsed'
  countdownMs: number
  respawnMs: number
}

interface MovingPlatformRuntime {
  platform: StageMovingPlatform
  sprite: Phaser.Physics.Arcade.Image
  baseX: number
  baseY: number
}

interface ZoneRuntime<T extends { rect: Rect }> {
  source: T
  rect: Phaser.Geom.Rectangle
}

interface CheckpointRuntime {
  checkpoint: StageCheckpoint
  sprite: Phaser.Physics.Arcade.Image
  activated: boolean
}

interface ItemRuntime {
  item: StageItemSpawn
  sprite: Phaser.Physics.Arcade.Image
}

interface CollectibleRuntime {
  id: string
  sprite: Phaser.Physics.Arcade.Image
}

interface ScreenFlash {
  rect: Phaser.GameObjects.Rectangle
  cooldownMs: number
}

export class StagePlayScene extends Phaser.Scene {
  private inputMap!: GameInput
  private player!: PlayerController
  private stage!: StageDefinition
  private activeTuning!: MovementTuning

  private difficulty: Difficulty = 'Standard'
  private mirror = false

  private staticPlatforms!: Phaser.Physics.Arcade.StaticGroup
  private dynamicPlatforms!: Phaser.Physics.Arcade.Group
  private collapseGroup!: Phaser.Physics.Arcade.Group
  private staticPlatformRects: Rect[] = []

  private goalZone!: Phaser.GameObjects.Zone
  private transformedGoal!: Rect

  private cyclesGroup!: Phaser.Physics.Arcade.Group
  private gemsGroup!: Phaser.Physics.Arcade.Group
  private itemsGroup!: Phaser.Physics.Arcade.Group
  private checkpointsGroup!: Phaser.Physics.Arcade.StaticGroup
  private enemiesGroup!: Phaser.Physics.Arcade.Group
  private playerShotsGroup!: Phaser.Physics.Arcade.Group
  private enemyShotsGroup!: Phaser.Physics.Arcade.Group

  private cycleRuntimes = new Map<Phaser.Physics.Arcade.Image, CollectibleRuntime>()
  private gemRuntimes = new Map<Phaser.Physics.Arcade.Image, CollectibleRuntime>()
  private itemRuntimes = new Map<Phaser.Physics.Arcade.Image, ItemRuntime>()
  private checkpointRuntimes = new Map<Phaser.Physics.Arcade.Image, CheckpointRuntime>()
  private enemyRuntimes = new Map<Phaser.Physics.Arcade.Sprite, EnemyRuntime>()
  private playerShotRuntimes = new Map<Phaser.Physics.Arcade.Image, ShotRuntime>()
  private enemyShotRuntimes = new Map<Phaser.Physics.Arcade.Image, ShotRuntime>()

  private springRuntimes: SpringRuntime[] = []
  private collapseRuntimes: CollapseRuntime[] = []
  private movingRuntimes: MovingPlatformRuntime[] = []
  private ports: PortRuntime[] = []
  private windZones: Array<ZoneRuntime<StageWindZone>> = []
  private waterZones: Array<ZoneRuntime<StageWaterZone>> = []
  private gravityZones: Array<ZoneRuntime<StageGravityZone>> = []
  private rotatorZones: Array<ZoneRuntime<StageRotatorZone>> = []

  private stageStartTimeMs = 0
  private stageFinished = false
  private stageFinishedAtMs = 0
  private awaitingResultTransition = false
  private resultTransitionStartedAtMs = 0
  private paused = false

  private patchState: PatchState = 'raw'
  private hasCompiler = false
  private sudoTimerMs = 0
  private invulnTimerMs = 0
  private fireCooldownMs = 0

  private cyclesCollected = 0
  private cycleBank = 0
  private gemsCollected = new Set<string>()
  private hitsTaken = 0
  private backups = 1
  private backupsUsed = 0

  private activeCheckpoint: StageCheckpoint | null = null
  private nextPortUseAtMs = 0

  private hudText!: Phaser.GameObjects.Text
  private pauseOverlay!: Phaser.GameObjects.Container
  private pauseOptions: PauseOption[] = ['Resume', 'Restart Stage', 'Exit to Stage Select']
  private pauseOptionTexts: Phaser.GameObjects.Text[] = []
  private pauseIndex = 0

  private wrapper!: Phaser.GameObjects.Ellipse
  private sudoOverlay!: Phaser.GameObjects.TileSprite
  private screenFlash!: ScreenFlash

  private previousGrounded = false
  private previousVerticalVelocity = 0
  private debugGoalKey!: Phaser.Input.Keyboard.Key

  private readonly onResumeHandler = (): void => {
    this.physics.world.resume()
    this.refreshHud()
  }

  constructor() {
    super(SCENE_KEYS.STAGE_PLAY)
  }

  create(): void {
    this.physics.world.resume()

    const snapshot = sessionStore.snapshot

    this.stage = getStageById(snapshot.selectedStageId)
    this.difficulty = snapshot.difficulty
    this.mirror = snapshot.mirror
    this.activeTuning = tuningStore.getResolvedTuning(this.difficulty)

    sessionStore.setFlow('ingame')

    this.inputMap = new GameInput(this)
    this.inputMap.setHorizontalScale(this.mirror ? -1 : 1)
    this.debugGoalKey = this.input.keyboard!.addKey('K')

    this.resetRunStats()

    this.setupWorld()
    this.createBackdrop()
    this.createPlatformLayers()
    this.createStageGimmickZones()

    const spawn = this.transformPoint(this.stage.spawn)
    this.player = new PlayerController(this, this.inputMap, spawn, this.activeTuning)

    this.setupPlayerColliders()
    this.createGoal()
    this.createCollectibles()
    this.createCheckpoints()
    this.createItems()
    this.createPorts()
    this.createSprings()
    this.createEnemies()
    this.createProjectileSystems()

    this.wrapper = this.add
      .ellipse(spawn.x, spawn.y, 54, 62, 0x8cefff, 0.0)
      .setDepth(4)
      .setStrokeStyle(2, 0x9fe9ff, 0)

    this.sudoOverlay = this.add
      .tileSprite(480, 270, 960, 540, 'binary-overlay')
      .setScrollFactor(0)
      .setDepth(26)
      .setAlpha(0)
      .setVisible(false)

    this.screenFlash = {
      rect: this.add
        .rectangle(480, 270, 960, 540, 0x8fe7ff, 0)
        .setScrollFactor(0)
        .setDepth(27),
      cooldownMs: 0,
    }

    this.cameras.main.startFollow(this.player.sprite, true, 0.09, 0.09)
    this.cameras.main.setDeadzone(220, 150)

    this.hudText = this.add
      .text(16, 16, '', {
        fontFamily: 'Trebuchet MS',
        fontSize: '20px',
        color: '#eaf7ff',
      })
      .setScrollFactor(0)
      .setDepth(28)

    this.createPauseOverlay()

    this.stageStartTimeMs = this.time.now
    this.previousGrounded = this.player.isGrounded()
    this.previousVerticalVelocity = this.player.getBody().velocity.y

    this.refreshPatchVisual()
    this.refreshHud()

    runtimeAudio.startStageLoop(this.stage.index)

    setRenderGameToText(() => this.makeTextState())

    this.events.off(Phaser.Scenes.Events.RESUME, this.onResumeHandler, this)
    this.events.on(Phaser.Scenes.Events.RESUME, this.onResumeHandler, this)

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off(Phaser.Scenes.Events.RESUME, this.onResumeHandler, this)
      runtimeAudio.stopStageLoop()
      clearRenderGameToText()
    })
  }

  update(_: number, deltaMs: number): void {
    if (this.stageFinished) {
      if (
        !this.scene.manager.isActive(SCENE_KEYS.RESULT) &&
        this.time.now - this.stageFinishedAtMs > 1200
      ) {
        this.awaitingResultTransition = false
        this.stageFinished = false
        sessionStore.setFlow('main_menu')
        this.scene.start(SCENE_KEYS.MAIN_MENU)
        return
      }

      if (this.awaitingResultTransition) {
        const manager = this.scene.manager
        const resultReady =
          manager.isActive(SCENE_KEYS.RESULT) &&
          manager.isVisible(SCENE_KEYS.RESULT) &&
          !manager.isSleeping(SCENE_KEYS.RESULT)

        if (resultReady) {
          this.awaitingResultTransition = false
        } else if (this.time.now - this.resultTransitionStartedAtMs > 900) {
          this.awaitingResultTransition = false
          this.stageFinished = false
          sessionStore.setFlow('main_menu')
          this.scene.start(SCENE_KEYS.MAIN_MENU)
        }
      }
      return
    }

    this.syncTuning()

    if (this.paused) {
      this.updatePauseMenu()
      return
    }

    if (this.inputMap.consumeTuningPressed()) {
      this.openTuningOverlay()
      return
    }

    if (this.inputMap.consumePausePressed() || this.inputMap.consumeCancelPressed()) {
      runtimeAudio.play('pause')
      this.setPaused(true)
      return
    }

    if (this.inputMap.consumeRestartPressed()) {
      this.restartStage()
      return
    }

    if (Phaser.Input.Keyboard.JustDown(this.debugGoalKey)) {
      this.finishRun(true, 'goal')
      return
    }

    this.updateTimers(deltaMs)
    this.updateEnvironment(deltaMs)

    this.player.update(deltaMs)
    this.updateCameraLookAhead()

    this.handleFireInput()
    this.updateMovingPlatforms(deltaMs)
    this.updateCollapsingPlatforms(deltaMs)
    this.updateEnemies(deltaMs)
    this.updateShots(deltaMs)

    this.updatePlayerAuras(deltaMs)
    this.handleLandingAudio()

    const playerBody = this.player.getBody()
    if (this.player.sprite.y > this.stage.size.height + 100) {
      this.handleNullPointerFall()
      return
    }

    if (playerBody.blocked.down && this.player.isGroundPounding()) {
      this.cameraFlash(0x9defff, 0.2)
    }

    this.refreshPatchVisual()
    this.refreshHud()
  }

  private resetRunStats(): void {
    this.patchState = 'raw'
    this.hasCompiler = false
    this.sudoTimerMs = 0
    this.invulnTimerMs = 0
    this.fireCooldownMs = 0

    this.cyclesCollected = 0
    this.cycleBank = 0
    this.gemsCollected.clear()
    this.hitsTaken = 0
    this.backups = 1
    this.backupsUsed = 0

    this.activeCheckpoint = null
    this.nextPortUseAtMs = 0
    this.stageFinished = false
    this.stageFinishedAtMs = 0
    this.awaitingResultTransition = false
    this.resultTransitionStartedAtMs = 0
    this.paused = false
  }

  private setupWorld(): void {
    this.physics.world.setBounds(0, 0, this.stage.size.width, this.stage.size.height)
    this.physics.world.setBoundsCollision(true, true, true, false)
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

    this.add.rectangle(460, 150, 660, 160, 0x18344d, 0.44)
    this.add.rectangle(1280, 190, 790, 200, 0x1a3d58, 0.36)
    this.add.rectangle(2320, 140, 740, 170, 0x122f48, 0.42)

    this.add.text(24, this.stage.size.height - 36, 'Null Pointer Zone', {
      fontFamily: 'Trebuchet MS',
      fontSize: '18px',
      color: '#9ac6e4',
    })

    this.add.text(24, 20, `${this.stage.theme} / Gimmick: ${this.stage.gimmick}`, {
      fontFamily: 'Trebuchet MS',
      fontSize: '16px',
      color: '#8fb4d4',
    })
  }

  private createPlatformLayers(): void {
    this.staticPlatformRects = []
    this.staticPlatforms = this.physics.add.staticGroup()
    this.dynamicPlatforms = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    })
    this.collapseGroup = this.physics.add.group({
      allowGravity: false,
      immovable: true,
    })

    this.stage.platforms.forEach((platformRect) => {
      const rect = this.transformRect(platformRect)
      this.staticPlatformRects.push(rect)
      const platform = this.staticPlatforms.create(rect.x, rect.y, 'platform-block')
      platform.setOrigin(0, 0)
      platform.setDisplaySize(rect.width, rect.height)
      platform.refreshBody()
    })

    this.movingRuntimes = this.stage.movingPlatforms.map((platform) => {
      const rect = this.transformRect(platform.rect)
      const sprite = this.physics.add
        .image(rect.x + rect.width * 0.5, rect.y + rect.height * 0.5, 'moving-platform')
        .setDisplaySize(rect.width, rect.height)
        .setImmovable(true)
        .setDepth(2)

      ;(sprite.body as Phaser.Physics.Arcade.Body | null)?.setAllowGravity(false)
      this.dynamicPlatforms.add(sprite)

      return {
        platform,
        sprite,
        baseX: sprite.x,
        baseY: sprite.y,
      }
    })

    this.collapseRuntimes = this.stage.collapsingPlatforms.map((platform) => {
      const rect = this.transformRect(platform.rect)
      const sprite = this.physics.add
        .image(rect.x + rect.width * 0.5, rect.y + rect.height * 0.5, 'collapse-platform')
        .setDisplaySize(rect.width, rect.height)
        .setImmovable(true)
        .setDepth(2)

      ;(sprite.body as Phaser.Physics.Arcade.Body | null)?.setAllowGravity(false)
      this.collapseGroup.add(sprite)

      return {
        platform,
        sprite,
        state: 'stable' as const,
        countdownMs: 0,
        respawnMs: 0,
      }
    })
  }

  private setupPlayerColliders(): void {
    this.physics.add.collider(this.player.sprite, this.staticPlatforms)
    this.physics.add.collider(this.player.sprite, this.dynamicPlatforms)
    this.physics.add.collider(this.player.sprite, this.collapseGroup, (_player, target) => {
      this.onCollapsePlatformTouched(target as Phaser.Physics.Arcade.Image)
    })
  }

  private createGoal(): void {
    this.transformedGoal = this.transformRect(this.stage.goal)

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

    this.physics.add.overlap(this.player.sprite, this.goalZone, () => {
      this.finishRun(true, 'goal')
    })
  }

  private createCollectibles(): void {
    this.cyclesGroup = this.physics.add.group({ allowGravity: false, immovable: true })
    this.gemsGroup = this.physics.add.group({ allowGravity: false, immovable: true })

    this.stage.cycles.forEach((cycle) => {
      const position = this.transformPoint({ x: cycle.x, y: cycle.y })
      const sprite = this.physics.add
        .image(position.x, position.y, 'cycle-token')
        .setDepth(5)
        .setScale(0.6)

      this.cyclesGroup.add(sprite)
      this.cycleRuntimes.set(sprite, {
        id: cycle.id,
        sprite,
      })

      this.tweens.add({
        targets: sprite,
        y: sprite.y - 7,
        duration: 780,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
    })

    this.stage.gemHints.forEach((hint) => {
      const point = this.transformPoint(hint)
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

    this.stage.gems.forEach((gem) => {
      const point = this.transformPoint({ x: gem.x, y: gem.y })
      const sprite = this.physics.add
        .image(point.x, point.y, 'gem-core')
        .setDepth(6)
        .setScale(0.75)

      this.gemsGroup.add(sprite)
      this.gemRuntimes.set(sprite, {
        id: gem.id,
        sprite,
      })

      this.tweens.add({
        targets: sprite,
        angle: { from: 0, to: 360 },
        duration: 2200,
        repeat: -1,
        ease: 'Linear',
      })
    })

    this.physics.add.overlap(this.player.sprite, this.cyclesGroup, (_player, target) => {
      this.collectCycle(target as Phaser.Physics.Arcade.Image)
    })

    this.physics.add.overlap(this.player.sprite, this.gemsGroup, (_player, target) => {
      this.collectGem(target as Phaser.Physics.Arcade.Image)
    })
  }

  private createItems(): void {
    this.itemsGroup = this.physics.add.group({ allowGravity: false, immovable: true })

    this.stage.items.forEach((item) => {
      const point = this.transformPoint({ x: item.x, y: item.y })
      const texture =
        item.kind === 'module'
          ? 'item-module'
          : item.kind === 'root_key'
            ? 'item-root-key'
            : 'item-compiler'

      const sprite = this.physics.add
        .image(point.x, point.y, texture)
        .setDepth(6)
        .setScale(item.kind === 'root_key' ? 0.82 : 0.9)

      this.itemsGroup.add(sprite)
      this.itemRuntimes.set(sprite, {
        item,
        sprite,
      })

      this.tweens.add({
        targets: sprite,
        y: sprite.y - 6,
        duration: 860,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
    })

    this.physics.add.overlap(this.player.sprite, this.itemsGroup, (_player, target) => {
      this.collectItem(target as Phaser.Physics.Arcade.Image)
    })
  }

  private createCheckpoints(): void {
    this.checkpointsGroup = this.physics.add.staticGroup()

    this.stage.checkpoints.forEach((checkpoint) => {
      const desiredRect = this.transformRect({
        x: checkpoint.x,
        y: checkpoint.y,
        width: checkpoint.width,
        height: checkpoint.height,
      })
      const rect = this.alignCheckpointRectToPlatform(desiredRect)

      const sprite = this.checkpointsGroup.create(rect.x, rect.y, 'checkpoint-node')
      sprite.setOrigin(0, 0)
      sprite.setDisplaySize(rect.width, rect.height)
      sprite.setTint(0x5f8f7f)
      sprite.refreshBody()

      this.checkpointRuntimes.set(sprite, {
        checkpoint: {
          ...checkpoint,
          x: rect.x,
          y: rect.y,
        },
        sprite,
        activated: false,
      })
    })

    this.physics.add.overlap(this.player.sprite, this.checkpointsGroup, (_player, target) => {
      const runtime = this.checkpointRuntimes.get(target as Phaser.Physics.Arcade.Image)
      if (!runtime || runtime.activated) {
        return
      }

      runtime.activated = true
      runtime.sprite.setTint(0x74ffc8)
      this.activeCheckpoint = runtime.checkpoint
      this.cameraFlash(0x74ffc8, 0.15)
      runtimeAudio.play('checkpoint')
    })
  }

  private createPorts(): void {
    this.ports = this.stage.ports.map((port) => {
      const entry = this.transformRect(port.entry)
      const exit = this.transformPoint(port.exit)

      const sprite = this.add
        .image(entry.x + entry.width * 0.5, entry.y + entry.height * 0.5, 'port-socket')
        .setDisplaySize(entry.width, entry.height)
        .setDepth(3)
      sprite.setAlpha(0.92)

      this.tweens.add({
        targets: sprite,
        alpha: { from: 0.55, to: 1 },
        duration: 600,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })

      const zone = this.add.zone(entry.x, entry.y, entry.width, entry.height)
      zone.setOrigin(0, 0)
      this.physics.add.existing(zone, true)

      return {
        port: {
          ...port,
          entry,
          exit,
        },
        zone,
      }
    })

    this.ports.forEach((runtime) => {
      this.physics.add.overlap(this.player.sprite, runtime.zone, () => {
        this.usePort(runtime)
      })
    })
  }

  private createSprings(): void {
    this.springRuntimes = this.stage.springPads.map((spring) => {
      const rect = this.transformRect(spring.rect)
      const sprite = this.physics.add
        .staticImage(rect.x + rect.width * 0.5, rect.y + rect.height * 0.5, 'spring-pad')
        .setDisplaySize(rect.width, rect.height)
        .setDepth(3)

      sprite.refreshBody()

      return {
        spring: {
          ...spring,
          rect,
        },
        sprite,
      }
    })

    this.springRuntimes.forEach((runtime) => {
      this.physics.add.collider(this.player.sprite, runtime.sprite, () => {
        const playerBody = this.player.getBody()
        if (playerBody.velocity.y < 60) {
          return
        }

        playerBody.setVelocityY(-Math.abs(runtime.spring.bounceVelocity))
        runtimeAudio.play('jump')
      })
    })
  }

  private createStageGimmickZones(): void {
    this.windZones = this.stage.windZones.map((zone) => {
      const rect = this.transformRect(zone.rect)
      this.add.rectangle(
        rect.x + rect.width * 0.5,
        rect.y + rect.height * 0.5,
        rect.width,
        rect.height,
        0x7bb8ff,
        0.08,
      ).setDepth(1)
      return { source: { ...zone, rect }, rect: new Phaser.Geom.Rectangle(rect.x, rect.y, rect.width, rect.height) }
    })

    this.waterZones = this.stage.waterZones.map((zone) => {
      const rect = this.transformRect(zone.rect)
      this.add.rectangle(
        rect.x + rect.width * 0.5,
        rect.y + rect.height * 0.5,
        rect.width,
        rect.height,
        0x3ab4ff,
        0.13,
      ).setDepth(1)
      return { source: { ...zone, rect }, rect: new Phaser.Geom.Rectangle(rect.x, rect.y, rect.width, rect.height) }
    })

    this.gravityZones = this.stage.gravityZones.map((zone) => {
      const rect = this.transformRect(zone.rect)
      this.add.rectangle(
        rect.x + rect.width * 0.5,
        rect.y + rect.height * 0.5,
        rect.width,
        rect.height,
        0xb074ff,
        0.09,
      ).setDepth(1)
      return { source: { ...zone, rect }, rect: new Phaser.Geom.Rectangle(rect.x, rect.y, rect.width, rect.height) }
    })

    this.rotatorZones = this.stage.rotatorZones.map((zone) => {
      const rect = this.transformRect(zone.rect)
      this.add.rectangle(
        rect.x + rect.width * 0.5,
        rect.y + rect.height * 0.5,
        rect.width,
        rect.height,
        0xffa3d2,
        0.08,
      ).setDepth(1)
      return { source: { ...zone, rect }, rect: new Phaser.Geom.Rectangle(rect.x, rect.y, rect.width, rect.height) }
    })
  }

  private createEnemies(): void {
    this.enemiesGroup = this.physics.add.group({
      collideWorldBounds: true,
      runChildUpdate: false,
    })

    const speedScale = this.difficulty === 'Chill' ? 0.86 : this.difficulty === 'Mean' ? 1.18 : 1

    this.stage.enemies.forEach((enemy) => {
      if (!canSpawnForDifficulty(this.difficulty, enemy.minDifficulty)) {
        return
      }

      const spawnPoint = this.transformPoint({ x: enemy.x, y: enemy.y })
      const texture = this.enemyTexture(enemy.kind)

      const sprite = this.physics.add
        .sprite(spawnPoint.x, spawnPoint.y, texture)
        .setDepth(7)
        .setCollideWorldBounds(true)

      const body = sprite.body as Phaser.Physics.Arcade.Body
      body.setAllowGravity(enemy.kind !== 'drone' && enemy.kind !== 'turret')
      body.setSize(Math.max(18, sprite.displayWidth * 0.8), Math.max(16, sprite.displayHeight * 0.8))

      const patrol = this.transformPatrolRange(enemy)

      const runtime: EnemyRuntime = {
        sprite,
        spawn: enemy,
        kind: enemy.kind,
        baseSpeed: (enemy.speed ?? 82) * speedScale,
        patrolMinX: patrol.min,
        patrolMaxX: patrol.max,
        patrolDir: this.mirror ? -1 : 1,
        baseY: spawnPoint.y,
        phase: Math.random() * Math.PI * 2,
        aiTimerMs: Phaser.Math.Between(200, 700),
        shotCooldownMs: Phaser.Math.Between(650, 1300),
        dashCooldownMs: Phaser.Math.Between(1200, 2200),
        dashActiveMs: 0,
        alive: true,
      }

      this.enemiesGroup.add(sprite)
      this.enemyRuntimes.set(sprite, runtime)
    })

    this.physics.add.collider(this.enemiesGroup, this.staticPlatforms)
    this.physics.add.collider(this.enemiesGroup, this.dynamicPlatforms)
    this.physics.add.collider(this.enemiesGroup, this.collapseGroup)

    this.physics.add.overlap(this.player.sprite, this.enemiesGroup, (_player, enemySprite) => {
      this.handlePlayerEnemyContact(enemySprite as Phaser.Physics.Arcade.Sprite)
    })
  }

  private createProjectileSystems(): void {
    this.playerShotsGroup = this.physics.add.group({ allowGravity: false, immovable: true })
    this.enemyShotsGroup = this.physics.add.group({ allowGravity: false, immovable: true })

    this.physics.add.overlap(this.playerShotsGroup, this.enemiesGroup, (objA, objB) => {
      const shot = this.resolveShotObject(objA, objB, this.playerShotRuntimes)
      const enemy = this.resolveEnemyObject(objA, objB)
      if (!shot || !enemy) {
        return
      }

      this.destroyShot(shot, this.playerShotRuntimes)
      this.destroyEnemy(enemy, 'projectile')
    })

    this.physics.add.overlap(this.enemyShotsGroup, this.player.sprite, (objA, objB) => {
      const shot = this.resolveShotObject(objA, objB, this.enemyShotRuntimes)
      if (!shot) {
        return
      }

      const sourceX = shot.x
      this.destroyShot(shot, this.enemyShotRuntimes)
      this.onPlayerHit(sourceX)
    })

    this.physics.add.collider(this.playerShotsGroup, this.staticPlatforms, (objA, objB) => {
      const shot = this.resolveShotObject(objA, objB, this.playerShotRuntimes)
      if (!shot) {
        return
      }

      this.destroyShot(shot, this.playerShotRuntimes)
    })
    this.physics.add.collider(this.playerShotsGroup, this.dynamicPlatforms, (objA, objB) => {
      const shot = this.resolveShotObject(objA, objB, this.playerShotRuntimes)
      if (!shot) {
        return
      }

      this.destroyShot(shot, this.playerShotRuntimes)
    })
    this.physics.add.collider(this.playerShotsGroup, this.collapseGroup, (objA, objB) => {
      const shot = this.resolveShotObject(objA, objB, this.playerShotRuntimes)
      if (!shot) {
        return
      }

      this.destroyShot(shot, this.playerShotRuntimes)
    })

    this.physics.add.collider(this.enemyShotsGroup, this.staticPlatforms, (objA, objB) => {
      const shot = this.resolveShotObject(objA, objB, this.enemyShotRuntimes)
      if (!shot) {
        return
      }

      this.destroyShot(shot, this.enemyShotRuntimes)
    })
    this.physics.add.collider(this.enemyShotsGroup, this.dynamicPlatforms, (objA, objB) => {
      const shot = this.resolveShotObject(objA, objB, this.enemyShotRuntimes)
      if (!shot) {
        return
      }

      this.destroyShot(shot, this.enemyShotRuntimes)
    })
    this.physics.add.collider(this.enemyShotsGroup, this.collapseGroup, (objA, objB) => {
      const shot = this.resolveShotObject(objA, objB, this.enemyShotRuntimes)
      if (!shot) {
        return
      }

      this.destroyShot(shot, this.enemyShotRuntimes)
    })
  }

  private createPauseOverlay(): void {
    const dim = this.add
      .rectangle(480, 270, 960, 540, 0x02060a, 0.72)
      .setScrollFactor(0)
      .setDepth(0)

    const panel = this.add
      .rectangle(480, 270, 480, 300, 0x15324a, 0.96)
      .setStrokeStyle(3, 0x74c7ff, 1)
      .setScrollFactor(0)
      .setDepth(1)

    const title = this.add
      .text(480, 168, 'Paused', {
        fontFamily: 'Trebuchet MS',
        fontSize: '42px',
        color: '#ebf9ff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2)

    this.pauseOptionTexts = this.pauseOptions.map((option, index) =>
      this.add
        .text(480, 238 + index * 50, option, {
          fontFamily: 'Trebuchet MS',
          fontSize: '30px',
          color: '#cae7ff',
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(2),
    )

    const helper = this.add
      .text(480, 366, '↑↓ select  Enter confirm  Esc/P resume', {
        fontFamily: 'Trebuchet MS',
        fontSize: '18px',
        color: '#97bbd8',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2)

    this.pauseOverlay = this.add.container(0, 0, [dim, panel, title, ...this.pauseOptionTexts, helper])
    this.pauseOverlay.setDepth(100)
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

  private syncTuning(): void {
    this.activeTuning = tuningStore.getResolvedTuning(this.difficulty)
    this.player.setTuning(this.activeTuning)
  }

  private openTuningOverlay(): void {
    if (this.scene.isActive(SCENE_KEYS.TUNING)) {
      return
    }

    this.physics.world.pause()
    this.scene.pause()
    this.scene.launch(SCENE_KEYS.TUNING, {
      returnScene: SCENE_KEYS.STAGE_PLAY,
      overlay: true,
    })
  }

  private updateTimers(deltaMs: number): void {
    this.sudoTimerMs = Math.max(0, this.sudoTimerMs - deltaMs)
    this.invulnTimerMs = Math.max(0, this.invulnTimerMs - deltaMs)
    this.fireCooldownMs = Math.max(0, this.fireCooldownMs - deltaMs)
    this.screenFlash.cooldownMs = Math.max(0, this.screenFlash.cooldownMs - deltaMs)

    if (this.screenFlash.cooldownMs <= 0) {
      this.screenFlash.rect.setAlpha(0)
    }
  }

  private updateEnvironment(deltaMs: number): void {
    const player = this.player.sprite
    const body = this.player.getBody()
    const dt = deltaMs / 1000

    let inWater = false
    let gravityScale = 1
    let forceX = 0
    let forceY = 0
    let waterDrag: number | null = null

    this.gravityZones.forEach((zoneRuntime) => {
      if (Phaser.Geom.Rectangle.Contains(zoneRuntime.rect, player.x, player.y)) {
        gravityScale *= zoneRuntime.source.gravityScale
      }
    })

    this.windZones.forEach((zoneRuntime) => {
      if (Phaser.Geom.Rectangle.Contains(zoneRuntime.rect, player.x, player.y)) {
        forceX += zoneRuntime.source.forceX
        forceY += zoneRuntime.source.forceY
      }
    })

    this.waterZones.forEach((zoneRuntime) => {
      if (Phaser.Geom.Rectangle.Contains(zoneRuntime.rect, player.x, player.y)) {
        inWater = true
        forceX += zoneRuntime.source.forceX
        forceY += zoneRuntime.source.forceY
        gravityScale *= 0.36
        waterDrag = waterDrag === null ? zoneRuntime.source.drag : Math.min(waterDrag, zoneRuntime.source.drag)
      }
    })

    if (inWater && this.inputMap.isUpHeld()) {
      forceY -= WATER_SWIM_ASCENT_FORCE
    }

    this.rotatorZones.forEach((zoneRuntime) => {
      if (!Phaser.Geom.Rectangle.Contains(zoneRuntime.rect, player.x, player.y)) {
        return
      }

      const angle = ((this.time.now % zoneRuntime.source.periodMs) / zoneRuntime.source.periodMs) * Math.PI * 2
      const oscillation = Math.sin(angle)
      forceX += oscillation * zoneRuntime.source.amplitude
    })

    this.player.setGravityScale(gravityScale)

    if (waterDrag !== null) {
      body.setVelocityX(body.velocity.x * waterDrag)
      body.setVelocityY(body.velocity.y * waterDrag)
    }

    body.setVelocityX(body.velocity.x + forceX * dt)
    body.setVelocityY(body.velocity.y + forceY * dt)
  }

  private updateMovingPlatforms(_: number): void {
    this.movingRuntimes.forEach((runtime) => {
      const phase = (this.time.now * 0.001 * runtime.platform.speed) + (runtime.platform.phase ?? 0)
      const offset = Math.sin(phase) * runtime.platform.travel

      if (runtime.platform.axis === 'x') {
        runtime.sprite.setPosition(runtime.baseX + offset, runtime.baseY)
      } else {
        runtime.sprite.setPosition(runtime.baseX, runtime.baseY + offset)
      }

      ;(runtime.sprite.body as Phaser.Physics.Arcade.Body).updateFromGameObject()
    })
  }

  private updateCollapsingPlatforms(deltaMs: number): void {
    this.collapseRuntimes.forEach((runtime) => {
      if (runtime.state === 'countdown') {
        runtime.countdownMs -= deltaMs

        if (runtime.countdownMs <= COLLAPSING_FLASH_MS) {
          runtime.sprite.setTint(0xff8fbf)
        }

        if (runtime.countdownMs <= 0) {
          runtime.state = 'collapsed'
          runtime.respawnMs = runtime.platform.respawnMs
          runtime.sprite.disableBody(true, true)
          return
        }
      }

      if (runtime.state === 'collapsed') {
        runtime.respawnMs -= deltaMs
        if (runtime.respawnMs <= 0) {
          runtime.state = 'stable'
          runtime.sprite.enableBody(false, runtime.sprite.x, runtime.sprite.y, true, true)
          runtime.sprite.setTint(0xffffff)
          const body = runtime.sprite.body as Phaser.Physics.Arcade.Body | null
          if (body) {
            body.setAllowGravity(false)
            body.setImmovable(true)
          }
        }
      }
    })
  }

  private onCollapsePlatformTouched(sprite: Phaser.Physics.Arcade.Image): void {
    const runtime = this.collapseRuntimes.find((entry) => entry.sprite === sprite)
    if (!runtime || runtime.state !== 'stable') {
      return
    }

    const playerBody = this.player.getBody()
    if (!playerBody.blocked.down && !playerBody.touching.down) {
      return
    }

    runtime.state = 'countdown'
    runtime.countdownMs = runtime.platform.collapseDelayMs
  }

  private handleFireInput(): void {
    if (!this.hasCompiler || this.fireCooldownMs > 0) {
      return
    }

    if (!this.inputMap.consumeFirePressed()) {
      return
    }

    const direction = this.player.getFacingDirection()
    const spawnX = this.player.sprite.x + direction * 20
    const spawnY = this.player.sprite.y - 8
    const shotSpeed = Number.isFinite(this.activeTuning.shotSpeed)
      ? Math.max(200, Math.abs(this.activeTuning.shotSpeed))
      : 610
    const velocityX = direction * shotSpeed
    const velocityY = 0

    const shot = this.physics.add
      .image(spawnX, spawnY, 'player-shot')
      .setDepth(8)

    ;(shot.body as Phaser.Physics.Arcade.Body | null)?.setAllowGravity(false)
    shot.setVelocity(velocityX, velocityY)

    this.playerShotsGroup.add(shot)
    this.playerShotRuntimes.set(shot, {
      sprite: shot,
      lifeMs: 1100,
      velocityX,
      velocityY,
    })

    this.fireCooldownMs = this.activeTuning.fireCooldownMs
    runtimeAudio.play('shoot')
  }

  private updateShots(deltaMs: number): void {
    this.playerShotRuntimes.forEach((runtime, sprite) => {
      this.enforceShotVelocity(runtime)
      runtime.lifeMs -= deltaMs
      if (runtime.lifeMs <= 0 || !runtime.sprite.active) {
        this.destroyShot(runtime.sprite, this.playerShotRuntimes)
        this.playerShotRuntimes.delete(sprite)
      }
    })

    this.enemyShotRuntimes.forEach((runtime, sprite) => {
      this.enforceShotVelocity(runtime)
      runtime.lifeMs -= deltaMs
      if (runtime.lifeMs <= 0 || !runtime.sprite.active) {
        this.destroyShot(runtime.sprite, this.enemyShotRuntimes)
        this.enemyShotRuntimes.delete(sprite)
      }
    })
  }

  private updateEnemies(deltaMs: number): void {
    const dt = deltaMs / 1000

    this.enemyRuntimes.forEach((runtime) => {
      if (!runtime.alive || !runtime.sprite.active) {
        return
      }

      const sprite = runtime.sprite
      const body = sprite.body as Phaser.Physics.Arcade.Body

      runtime.aiTimerMs = Math.max(0, runtime.aiTimerMs - deltaMs)
      runtime.shotCooldownMs = Math.max(0, runtime.shotCooldownMs - deltaMs)
      runtime.dashCooldownMs = Math.max(0, runtime.dashCooldownMs - deltaMs)
      runtime.dashActiveMs = Math.max(0, runtime.dashActiveMs - deltaMs)

      if (runtime.kind === 'drone') {
        body.allowGravity = false
        const targetY = runtime.baseY + Math.sin(this.time.now * 0.004 + runtime.phase) * 26
        sprite.y = Phaser.Math.Linear(sprite.y, targetY, 0.18)
        this.applyPatrol(runtime)
      } else if (runtime.kind === 'turret') {
        body.setVelocity(0, 0)
        body.allowGravity = false
        this.tryEnemyShoot(runtime)
      } else if (runtime.kind === 'chaser') {
        this.applyChaser(runtime)
      } else if (runtime.kind === 'dasher') {
        this.applyDasher(runtime)
      } else if (runtime.kind === 'hopper') {
        this.applyPatrol(runtime)
        if ((body.blocked.down || body.touching.down) && runtime.aiTimerMs <= 0) {
          body.setVelocityY(-530)
          runtime.aiTimerMs = 900
        }
      } else {
        this.applyPatrol(runtime)
      }

      if (runtime.kind !== 'drone' && runtime.kind !== 'turret') {
        body.setVelocityX(Phaser.Math.Clamp(body.velocity.x, -runtime.baseSpeed * 2.2, runtime.baseSpeed * 2.2))
      }

      if (sprite.x < -100 || sprite.x > this.stage.size.width + 100 || sprite.y > this.stage.size.height + 120) {
        runtime.alive = false
        sprite.destroy()
      }

      // minor environment influences for enemies
      this.windZones.forEach((zoneRuntime) => {
        if (Phaser.Geom.Rectangle.Contains(zoneRuntime.rect, sprite.x, sprite.y)) {
          body.setVelocityX(body.velocity.x + zoneRuntime.source.forceX * dt * 0.35)
          body.setVelocityY(body.velocity.y + zoneRuntime.source.forceY * dt * 0.35)
        }
      })

      this.waterZones.forEach((zoneRuntime) => {
        if (Phaser.Geom.Rectangle.Contains(zoneRuntime.rect, sprite.x, sprite.y)) {
          body.setVelocityX(body.velocity.x * zoneRuntime.source.drag)
          body.setVelocityY(body.velocity.y * zoneRuntime.source.drag)
        }
      })
    })
  }

  private applyPatrol(runtime: EnemyRuntime): void {
    const body = runtime.sprite.body as Phaser.Physics.Arcade.Body
    const x = runtime.sprite.x

    if (x <= runtime.patrolMinX) {
      runtime.patrolDir = 1
    } else if (x >= runtime.patrolMaxX) {
      runtime.patrolDir = -1
    }

    body.setVelocityX(runtime.patrolDir * runtime.baseSpeed)
    runtime.sprite.setFlipX(runtime.patrolDir < 0)
  }

  private applyChaser(runtime: EnemyRuntime): void {
    const body = runtime.sprite.body as Phaser.Physics.Arcade.Body
    const dx = this.player.sprite.x - runtime.sprite.x
    const dist = Math.abs(dx)

    if (dist < (this.difficulty === 'Mean' ? 500 : 410)) {
      const chaseDir = dx < 0 ? -1 : 1
      body.setVelocityX(chaseDir * runtime.baseSpeed * 1.22)
      runtime.sprite.setFlipX(chaseDir < 0)
      return
    }

    this.applyPatrol(runtime)
  }

  private applyDasher(runtime: EnemyRuntime): void {
    const body = runtime.sprite.body as Phaser.Physics.Arcade.Body

    if (runtime.dashActiveMs > 0) {
      body.setVelocityX(runtime.patrolDir * runtime.baseSpeed * 2.2)
      return
    }

    if (runtime.dashCooldownMs <= 0) {
      runtime.dashActiveMs = 540
      runtime.dashCooldownMs = this.difficulty === 'Mean' ? 1300 : 1900
      runtime.patrolDir = this.player.sprite.x >= runtime.sprite.x ? 1 : -1
      body.setVelocityX(runtime.patrolDir * runtime.baseSpeed * 2.2)
      return
    }

    this.applyPatrol(runtime)
  }

  private tryEnemyShoot(runtime: EnemyRuntime): void {
    if (runtime.shotCooldownMs > 0) {
      return
    }

    const dx = this.player.sprite.x - runtime.sprite.x
    const dy = this.player.sprite.y - runtime.sprite.y
    const distance = Math.sqrt(dx * dx + dy * dy)

    if (distance > (this.difficulty === 'Mean' ? 540 : 460)) {
      return
    }

    const inv = distance <= 1 ? 1 : 1 / distance
    const speed = this.difficulty === 'Mean' ? 320 : this.difficulty === 'Chill' ? 250 : 285

    const shot = this.physics.add
      .image(runtime.sprite.x, runtime.sprite.y - 6, 'enemy-shot')
      .setDepth(8)
    ;(shot.body as Phaser.Physics.Arcade.Body | null)?.setAllowGravity(false)
    const velocityX = dx * inv * speed
    const velocityY = dy * inv * speed
    shot.setVelocity(velocityX, velocityY)

    this.enemyShotsGroup.add(shot)
    this.enemyShotRuntimes.set(shot, {
      sprite: shot,
      lifeMs: 1400,
      velocityX,
      velocityY,
    })

    runtime.shotCooldownMs =
      this.difficulty === 'Mean'
        ? Phaser.Math.Between(850, 1250)
        : this.difficulty === 'Chill'
          ? Phaser.Math.Between(1450, 1900)
          : Phaser.Math.Between(1100, 1550)
  }

  private handlePlayerEnemyContact(enemySprite: Phaser.Physics.Arcade.Sprite): void {
    const runtime = this.enemyRuntimes.get(enemySprite)
    if (!runtime || !runtime.alive) {
      return
    }

    if (this.sudoTimerMs > 0) {
      this.destroyEnemy(enemySprite, 'sudo')
      return
    }

    const playerBody = this.player.getBody()
    const stomp =
      playerBody.velocity.y > 180 &&
      this.player.sprite.y < enemySprite.y - enemySprite.displayHeight * 0.15

    if (stomp || this.player.isGroundPounding()) {
      this.destroyEnemy(enemySprite, 'stomp')
      playerBody.setVelocityY(-Math.max(340, this.activeTuning.jumpVelocity * 0.55))
      runtimeAudio.play('enemy_die')
      return
    }

    this.onPlayerHit(enemySprite.x)
  }

  private destroyEnemy(sprite: Phaser.Physics.Arcade.Sprite, cause: 'projectile' | 'stomp' | 'sudo'): void {
    const runtime = this.enemyRuntimes.get(sprite)
    if (!runtime || !runtime.alive) {
      return
    }

    runtime.alive = false

    this.cameraFlash(0x85dfff, cause === 'sudo' ? 0.28 : 0.17)
    this.spawnBlueScreenDissolve(sprite.x, sprite.y)
    runtimeAudio.play('enemy_die')

    sprite.destroy()
  }

  private onPlayerHit(sourceX: number): void {
    if (this.sudoTimerMs > 0 || this.invulnTimerMs > 0) {
      return
    }

    this.hitsTaken += 1
    runtimeAudio.play('hit')

    const knockDirection: -1 | 1 = sourceX < this.player.sprite.x ? 1 : -1

    if (this.patchState === 'encapsulated') {
      this.patchState = 'raw'
      this.invulnTimerMs = this.activeTuning.invulnTimeMs
      this.player.applyKnockback(knockDirection, this.activeTuning.knockbackStrength, 300)
      this.player.lockControls(Math.min(600, RAW_RESPAWN_CONTROL_LOCK_MS + 120))
      this.cameraFlash(0xffc4c4, 0.2)
      return
    }

    this.useBackupAndRespawn('glitch')
  }

  private handleNullPointerFall(): void {
    this.respawnAtCheckpoint()
  }

  private useBackupAndRespawn(reason: StageFailReason): void {
    if (this.backups > 0) {
      this.backups -= 1
      this.backupsUsed += 1
      this.respawnAtCheckpoint()
      return
    }

    // Combat deaths should never soft-lock the run when backups are empty.
    // Respawn at checkpoint if available, otherwise fall back to stage-start.
    if (reason === 'glitch') {
      this.respawnAtCheckpoint()
      return
    }

    this.finishRun(false, reason)
  }

  private respawnAtCheckpoint(): void {
    const spawn = this.activeCheckpoint
      ? {
          x: this.activeCheckpoint.x + this.activeCheckpoint.width * 0.5,
          y: this.getPlayerSpawnYFromGround(this.activeCheckpoint.y + this.activeCheckpoint.height),
        }
      : this.getStartRespawnPoint()

    this.stageFinished = false
    this.awaitingResultTransition = false
    this.resultTransitionStartedAtMs = 0
    this.stageFinishedAtMs = 0
    this.paused = false
    this.pauseOverlay.setVisible(false)
    this.physics.world.resume()

    this.player.setSpawnPosition(spawn)
    this.player.clearControlLock()
    this.player.sprite.setActive(true).setVisible(true).setAlpha(1).setDepth(2)
    this.player.sprite.setCollideWorldBounds(true)
    const body = this.player.getBody()
    body.enable = true
    body.moves = true
    body.setAllowGravity(true)
    body.setVelocity(0, 0)

    this.snapCameraToPosition(spawn)
    this.patchState = 'raw'
    this.sudoTimerMs = 0
    this.invulnTimerMs = CHECKPOINT_RESPAWN_INVULN_MS
    this.player.lockControls(RAW_RESPAWN_CONTROL_LOCK_MS)
    this.previousGrounded = this.player.isGrounded()
    this.previousVerticalVelocity = body.velocity.y
    this.cameraFlash(0xffd6d6, 0.25)
    this.refreshPatchVisual()
    this.refreshHud()
  }

  private getStartRespawnPoint(): { x: number; y: number } {
    const stageSpawn = this.transformPoint(this.stage.spawn)
    return {
      x: stageSpawn.x,
      y: Math.max(48, stageSpawn.y - START_RESPAWN_DROP_Y),
    }
  }

  private getPlayerSpawnYFromGround(groundY: number): number {
    const sprite = this.player.sprite
    const body = this.player.getBody()
    const groundedY = groundY + sprite.displayHeight * sprite.originY - body.offset.y - body.height - 1
    return Math.max(48, groundedY - CHECKPOINT_RESPAWN_CLEARANCE_Y)
  }

  private alignCheckpointRectToPlatform(checkpointRect: Rect): Rect {
    const supportPlatform = this.findCheckpointSupportPlatform(checkpointRect)
    if (!supportPlatform) {
      return checkpointRect
    }

    const halfWidth = checkpointRect.width * 0.5
    const minCenterX = supportPlatform.x + halfWidth + CHECKPOINT_EDGE_PADDING
    const maxCenterX = supportPlatform.x + supportPlatform.width - halfWidth - CHECKPOINT_EDGE_PADDING
    const centerX = Phaser.Math.Clamp(checkpointRect.x + halfWidth, minCenterX, maxCenterX)

    return {
      ...checkpointRect,
      x: centerX - halfWidth,
      y: supportPlatform.y - checkpointRect.height,
    }
  }

  private findCheckpointSupportPlatform(checkpointRect: Rect): Rect | null {
    const halfWidth = checkpointRect.width * 0.5
    const centerX = checkpointRect.x + halfWidth
    let bestPlatform: Rect | null = null
    let bestScore = Number.POSITIVE_INFINITY

    for (const platform of this.staticPlatformRects) {
      if (platform.width < checkpointRect.width + CHECKPOINT_EDGE_PADDING * 2) {
        continue
      }

      const minCenterX = platform.x + halfWidth + CHECKPOINT_EDGE_PADDING
      const maxCenterX = platform.x + platform.width - halfWidth - CHECKPOINT_EDGE_PADDING
      if (minCenterX > maxCenterX) {
        continue
      }

      const horizontalDistance =
        centerX < minCenterX
          ? minCenterX - centerX
          : centerX > maxCenterX
            ? centerX - maxCenterX
            : 0
      const verticalDistance = Math.abs(platform.y - checkpointRect.y)
      const raisePenalty = platform.y < checkpointRect.y - CHECKPOINT_VERTICAL_RAISE_LIMIT ? 2500 : 0
      const score = horizontalDistance * 3 + verticalDistance + raisePenalty

      if (score >= bestScore) {
        continue
      }

      bestScore = score
      bestPlatform = platform
    }

    return bestPlatform
  }

  private collectCycle(sprite: Phaser.Physics.Arcade.Image): void {
    const runtime = this.cycleRuntimes.get(sprite)
    if (!runtime) {
      return
    }

    this.cycleRuntimes.delete(sprite)
    sprite.destroy()

    this.cyclesCollected += 1
    this.cycleBank += 1

    if (this.cycleBank >= 100) {
      this.cycleBank -= 100
      this.backups += 1
      runtimeAudio.play('checkpoint')
    } else {
      runtimeAudio.play('collect')
    }
  }

  private collectGem(sprite: Phaser.Physics.Arcade.Image): void {
    const runtime = this.gemRuntimes.get(sprite)
    if (!runtime || this.gemsCollected.has(runtime.id)) {
      return
    }

    this.gemRuntimes.delete(sprite)
    this.gemsCollected.add(runtime.id)
    sprite.destroy()

    runtimeAudio.play('gem')
    this.cameraFlash(0x96f3ff, 0.3)

    const previousScale = this.time.timeScale
    this.time.timeScale = 0.55
    this.time.delayedCall(SLOW_MO_GEM_MS, () => {
      this.time.timeScale = previousScale
    })
  }

  private collectItem(sprite: Phaser.Physics.Arcade.Image): void {
    const runtime = this.itemRuntimes.get(sprite)
    if (!runtime) {
      return
    }

    this.itemRuntimes.delete(sprite)
    sprite.destroy()

    if (runtime.item.kind === 'module') {
      this.patchState = 'encapsulated'
      runtimeAudio.play('collect')
      return
    }

    if (runtime.item.kind === 'root_key') {
      this.sudoTimerMs = BINARY_SUDO_DURATION_MS
      this.invulnTimerMs = Math.max(this.invulnTimerMs, 600)
      runtimeAudio.play('sudo')
      this.cameraFlash(0x95fff9, 0.25)
      return
    }

    if (runtime.item.kind === 'compiler') {
      this.hasCompiler = true
      runtimeAudio.play('collect')
    }
  }

  private usePort(runtime: PortRuntime): void {
    if (this.time.now < this.nextPortUseAtMs) {
      return
    }

    this.nextPortUseAtMs = this.time.now + runtime.port.cooldownMs
    this.player.setSpawnPosition({
      x: runtime.port.exit.x,
      y: runtime.port.exit.y,
    })
    this.player.getBody().setVelocityY(-150)

    runtimeAudio.play('warp')
    this.cameraFlash(0xa3baff, 0.2)
  }

  private updateCameraLookAhead(): void {
    const lookAhead = this.player.getLookAhead()
    const camera = this.cameras.main
    camera.followOffset.x = Phaser.Math.Linear(camera.followOffset.x, lookAhead, 0.14)
  }

  private snapCameraToPosition(position: { x: number; y: number }): void {
    const camera = this.cameras.main
    const maxScrollX = Math.max(0, this.stage.size.width - camera.width)
    const maxScrollY = Math.max(0, this.stage.size.height - camera.height)

    camera.scrollX = Phaser.Math.Clamp(position.x - camera.width * 0.5, 0, maxScrollX)
    camera.scrollY = Phaser.Math.Clamp(position.y - camera.height * 0.5, 0, maxScrollY)
  }

  private updatePlayerAuras(deltaMs: number): void {
    const player = this.player.sprite

    this.wrapper.setPosition(player.x, player.y - 2)

    if (this.patchState === 'encapsulated') {
      this.wrapper.setAlpha(0.24)
      this.wrapper.setStrokeStyle(2, 0x9fe9ff, 0.82)
    } else {
      this.wrapper.setAlpha(0.04)
      this.wrapper.setStrokeStyle(1, 0x79b6d9, 0.35)
    }

    if (this.sudoTimerMs > 0) {
      this.sudoOverlay.setVisible(true)
      this.sudoOverlay.tilePositionY += deltaMs * 0.11
      const pulse = 0.2 + Math.sin(this.time.now * 0.016) * 0.07
      this.sudoOverlay.setAlpha(Phaser.Math.Clamp(pulse, 0.12, 0.32))
      this.wrapper.setAlpha(0.32)
      this.wrapper.setStrokeStyle(2, 0x93ffec, 0.95)
    } else {
      this.sudoOverlay.setVisible(false)
      this.sudoOverlay.setAlpha(0)
    }

    if (this.invulnTimerMs > 0) {
      const blink = Math.floor(this.time.now / 70) % 2 === 0
      player.setAlpha(blink ? 0.45 : 1)
    } else {
      player.setAlpha(1)
    }
  }

  private refreshPatchVisual(): void {
    if (this.sudoTimerMs > 0) {
      this.player.sprite.setTint(0x8bfff7)
      return
    }

    if (this.patchState === 'encapsulated') {
      this.player.sprite.setTint(0xa2f2ff)
      return
    }

    this.player.sprite.setTint(0x66ffd2)
  }

  private handleLandingAudio(): void {
    const body = this.player.getBody()
    const grounded = this.player.isGrounded()

    if (!this.previousGrounded && grounded) {
      runtimeAudio.play('land')
    }

    const jumpStarted =
      this.previousGrounded &&
      !grounded &&
      body.velocity.y < -120 &&
      this.previousVerticalVelocity >= -70

    if (jumpStarted) {
      runtimeAudio.play('jump')
    }

    this.previousGrounded = grounded
    this.previousVerticalVelocity = body.velocity.y
  }

  private cameraFlash(color: number, alpha: number): void {
    this.screenFlash.rect.fillColor = color
    this.screenFlash.rect.setAlpha(alpha)
    this.screenFlash.cooldownMs = 140
  }

  private spawnBlueScreenDissolve(x: number, y: number): void {
    for (let i = 0; i < 7; i += 1) {
      const shard = this.add
        .rectangle(
          x + Phaser.Math.Between(-10, 10),
          y + Phaser.Math.Between(-12, 8),
          Phaser.Math.Between(4, 8),
          Phaser.Math.Between(4, 8),
          0x8de9ff,
          1,
        )
        .setDepth(24)

      const targetX = shard.x + Phaser.Math.Between(-36, 36)
      const targetY = shard.y + Phaser.Math.Between(-62, -20)

      this.tweens.add({
        targets: shard,
        x: targetX,
        y: targetY,
        alpha: 0,
        duration: Phaser.Math.Between(220, 380),
        ease: 'Cubic.easeOut',
        onComplete: () => shard.destroy(),
      })
    }
  }

  private destroyShot(
    shot: Phaser.Physics.Arcade.Image,
    registry: Map<Phaser.Physics.Arcade.Image, ShotRuntime>,
  ): void {
    registry.delete(shot)
    shot.destroy()
  }

  private enforceShotVelocity(runtime: ShotRuntime): void {
    const body = runtime.sprite.body as Phaser.Physics.Arcade.Body | null
    if (!body || !body.enable || !runtime.sprite.active) {
      return
    }

    body.setAllowGravity(false)
    body.setVelocity(runtime.velocityX, runtime.velocityY)
  }

  private resolveShotObject(
    objA: unknown,
    objB: unknown,
    registry: Map<Phaser.Physics.Arcade.Image, ShotRuntime>,
  ): Phaser.Physics.Arcade.Image | null {
    const shotA = this.extractArcadeGameObject(objA) as Phaser.Physics.Arcade.Image | null
    if (!shotA) {
      const shotB = this.extractArcadeGameObject(objB) as Phaser.Physics.Arcade.Image | null
      return shotB && registry.has(shotB) ? shotB : null
    }

    if (registry.has(shotA)) {
      return shotA
    }

    const shotB = this.extractArcadeGameObject(objB) as Phaser.Physics.Arcade.Image | null
    if (shotB && registry.has(shotB)) {
      return shotB
    }

    return null
  }

  private resolveEnemyObject(
    objA: unknown,
    objB: unknown,
  ): Phaser.Physics.Arcade.Sprite | null {
    const enemyA = this.extractArcadeGameObject(objA) as Phaser.Physics.Arcade.Sprite | null
    if (enemyA && this.enemyRuntimes.has(enemyA)) {
      return enemyA
    }

    const enemyB = this.extractArcadeGameObject(objB) as Phaser.Physics.Arcade.Sprite | null
    if (enemyB && this.enemyRuntimes.has(enemyB)) {
      return enemyB
    }

    return null
  }

  private extractArcadeGameObject(candidate: unknown): Phaser.GameObjects.GameObject | null {
    if (!candidate || typeof candidate !== 'object') {
      return null
    }

    const direct = candidate as Phaser.GameObjects.GameObject
    if ('scene' in direct && 'active' in direct) {
      return direct
    }

    const withGameObject = candidate as {
      gameObject?: Phaser.GameObjects.GameObject | null
    }
    if (withGameObject.gameObject) {
      return withGameObject.gameObject
    }

    return null
  }

  private transformPatrolRange(enemy: StageEnemySpawn): { min: number; max: number } {
    const min = enemy.patrolMinX ?? enemy.x - 140
    const max = enemy.patrolMaxX ?? enemy.x + 140

    if (!this.mirror) {
      return { min, max }
    }

    return {
      min: this.stage.size.width - max,
      max: this.stage.size.width - min,
    }
  }

  private enemyTexture(kind: EnemyKind): string {
    if (kind === 'crawler') {
      return 'enemy-crawler'
    }

    if (kind === 'hopper') {
      return 'enemy-hopper'
    }

    if (kind === 'drone') {
      return 'enemy-drone'
    }

    if (kind === 'chaser') {
      return 'enemy-chaser'
    }

    if (kind === 'turret') {
      return 'enemy-turret'
    }

    return 'enemy-dasher'
  }

  private finishRun(success: boolean, reason: RunResult['reason']): void {
    if (this.stageFinished) {
      return
    }

    this.stageFinished = true
    this.stageFinishedAtMs = this.time.now
    runtimeAudio.stopStageLoop()

    const snapshot = sessionStore.snapshot
    const elapsedMs = this.time.now - this.stageStartTimeMs

    const runResult: RunResult = {
      stageId: this.stage.id,
      stageName: this.stage.name,
      success,
      reason,
      elapsedMs,
      difficulty: snapshot.difficulty,
      mirror: snapshot.mirror,
      cycles: this.cyclesCollected,
      gems: this.gemsCollected.size,
      hits: this.hitsTaken,
      backupsUsed: this.backupsUsed,
      rank: this.computeRank(success, elapsedMs),
    }

    sessionStore.setResult(runResult)
    sessionStore.setFlow('result')
    runtimeAudio.play(success ? 'goal' : 'hit')
    this.awaitingResultTransition = true
    this.resultTransitionStartedAtMs = this.time.now
    try {
      this.scene.start(SCENE_KEYS.RESULT)
    } catch {
      this.stageFinished = false
      this.awaitingResultTransition = false
      sessionStore.setFlow('main_menu')
      this.scene.start(SCENE_KEYS.MAIN_MENU)
      return
    }
  }

  private computeRank(success: boolean, elapsedMs: number): Rank {
    if (!success) {
      return 'C'
    }

    const gemRatio = this.gemsCollected.size / Math.max(1, stageGemCount(this.stage.id))
    const timeRatio = elapsedMs / Math.max(1, this.stage.timeTargetMs)

    let score = 45
    score += Math.round(gemRatio * 25)
    score += Math.min(15, Math.floor(this.cyclesCollected / 8))
    score += Math.max(0, 16 - this.hitsTaken * 4)
    score += timeRatio <= 1 ? 14 : timeRatio <= 1.25 ? 9 : timeRatio <= 1.6 ? 5 : 0

    if (score >= 92) {
      return 'S'
    }

    if (score >= 76) {
      return 'A'
    }

    if (score >= 58) {
      return 'B'
    }

    return 'C'
  }

  private refreshHud(): void {
    const elapsedSeconds = ((this.time.now - this.stageStartTimeMs) / 1000).toFixed(2)

    this.hudText.setText([
      `Stage ${this.stage.index.toString().padStart(2, '0')} ${this.stage.name} (${this.stage.gimmick})`,
      `State:${this.patchState.toUpperCase()}  Sudo:${(this.sudoTimerMs / 1000).toFixed(1)}  Compiler:${this.hasCompiler ? 'ON' : 'OFF'}  Time:${elapsedSeconds}s`,
      `Cycles:${this.cyclesCollected} (${this.cycleBank}/100)  Gems:${this.gemsCollected.size}/${stageGemCount(this.stage.id)}  Backups:${this.backups}  Hits:${this.hitsTaken}`,
      this.paused
        ? 'Paused'
        : 'Move A/D Run Shift Jump Space Debug Shot Z/J Pause Esc/P Tuning F1',
    ])
  }

  private makeTextState(): Record<string, unknown> {
    return {
      mode: 'ingame',
      coordinateSystem: 'origin(0,0) top-left; +x right; +y down',
      stage: {
        id: this.stage.id,
        name: this.stage.name,
        gimmick: this.stage.gimmick,
        difficulty: this.difficulty,
        mirror: this.mirror,
      },
      player: {
        ...this.player.getStateSnapshot(),
        patchState: this.patchState,
        hasCompiler: this.hasCompiler,
        sudoMs: this.sudoTimerMs,
        invulnMs: this.invulnTimerMs,
      },
      resources: {
        cyclesCollected: this.cyclesCollected,
        cycleBank: this.cycleBank,
        gemsCollected: this.gemsCollected.size,
        backups: this.backups,
        hitsTaken: this.hitsTaken,
      },
      activeCheckpoint: this.activeCheckpoint,
      entities: {
        enemiesAlive: Array.from(this.enemyRuntimes.values()).filter((runtime) => runtime.alive).length,
        cyclesRemaining: this.cycleRuntimes.size,
        gemsRemaining: this.gemRuntimes.size,
        itemsRemaining: this.itemRuntimes.size,
      },
      goal: this.transformedGoal,
      tuning: {
        walkSpeed: this.activeTuning.walkSpeed,
        runSpeed: this.activeTuning.runSpeed,
        jumpVelocity: this.activeTuning.jumpVelocity,
        coyoteTimeMs: this.activeTuning.coyoteTimeMs,
        jumpBufferMs: this.activeTuning.jumpBufferMs,
        fireCooldownMs: this.activeTuning.fireCooldownMs,
      },
    }
  }

  private transformPoint(point: { x: number; y: number }): { x: number; y: number } {
    if (!this.mirror) {
      return { ...point }
    }

    return {
      x: this.stage.size.width - point.x,
      y: point.y,
    }
  }

  private transformRect(rect: Rect): Rect {
    if (!this.mirror) {
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
