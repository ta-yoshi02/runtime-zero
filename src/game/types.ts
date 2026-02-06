export type Difficulty = 'Chill' | 'Standard' | 'Mean'
export type Rank = 'S' | 'A' | 'B' | 'C'

export type FlowState =
  | 'title'
  | 'main_menu'
  | 'stage_select'
  | 'ingame'
  | 'result'
  | 'options'
  | 'credits'

export type PatchState = 'raw' | 'encapsulated'

export type ItemKind = 'module' | 'root_key' | 'compiler'

export type EnemyKind = 'crawler' | 'hopper' | 'drone' | 'chaser' | 'turret' | 'dasher'

export interface Point {
  x: number
  y: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface StageEnemySpawn {
  id: string
  kind: EnemyKind
  x: number
  y: number
  patrolMinX?: number
  patrolMaxX?: number
  speed?: number
  minDifficulty?: Difficulty
}

export interface StageItemSpawn {
  id: string
  kind: ItemKind
  x: number
  y: number
}

export interface StageCycleSpawn {
  id: string
  x: number
  y: number
  value?: number
}

export interface StageGemSpawn {
  id: string
  x: number
  y: number
}

export interface StageCheckpoint {
  id: string
  x: number
  y: number
  width: number
  height: number
}

export interface StagePortSocket {
  id: string
  entry: Rect
  exit: Point
  cooldownMs: number
}

export interface StageSpringPad {
  id: string
  rect: Rect
  bounceVelocity: number
}

export interface StageWindZone {
  id: string
  rect: Rect
  forceX: number
  forceY: number
}

export interface StageRotatorZone {
  id: string
  rect: Rect
  amplitude: number
  periodMs: number
}

export interface StageWaterZone {
  id: string
  rect: Rect
  forceX: number
  forceY: number
  drag: number
}

export interface StageCollapsingPlatform {
  id: string
  rect: Rect
  collapseDelayMs: number
  respawnMs: number
}

export interface StageMovingPlatform {
  id: string
  rect: Rect
  axis: 'x' | 'y'
  travel: number
  speed: number
  phase?: number
}

export interface StageGravityZone {
  id: string
  rect: Rect
  gravityScale: number
}

export interface StageDefinition {
  id: string
  index: number
  name: string
  theme: string
  gimmick: string
  size: {
    width: number
    height: number
  }
  spawn: Point
  goal: Rect
  platforms: Rect[]
  gemHints: Point[]
  gems: StageGemSpawn[]
  cycles: StageCycleSpawn[]
  items: StageItemSpawn[]
  enemies: StageEnemySpawn[]
  checkpoints: StageCheckpoint[]
  ports: StagePortSocket[]
  springPads: StageSpringPad[]
  windZones: StageWindZone[]
  rotatorZones: StageRotatorZone[]
  waterZones: StageWaterZone[]
  collapsingPlatforms: StageCollapsingPlatform[]
  movingPlatforms: StageMovingPlatform[]
  gravityZones: StageGravityZone[]
  timeTargetMs: number
}

export interface MovementTuning {
  walkSpeed: number
  runSpeed: number
  groundAcceleration: number
  airAcceleration: number
  groundDeceleration: number
  airDeceleration: number
  jumpVelocity: number
  jumpCutVelocity: number
  gravity: number
  maxFallSpeed: number
  coyoteTimeMs: number
  jumpBufferMs: number
  wallJumpXVelocity: number
  wallJumpYVelocity: number
  slideSpeed: number
  slideDurationMs: number
  slideEnterBoost: number
  groundPoundVelocity: number
  groundPoundLockMs: number
  cameraLookAhead: number
  cameraLookAheadDash: number
  knockbackStrength: number
  invulnTimeMs: number
  fireCooldownMs: number
  shotSpeed: number
}

export interface RunResult {
  stageId: string
  stageName: string
  success: boolean
  reason: 'goal' | 'null_pointer' | 'glitch' | 'exit'
  elapsedMs: number
  difficulty: Difficulty
  mirror: boolean
  cycles: number
  gems: number
  hits: number
  backupsUsed: number
  rank: Rank
}

export interface SessionSnapshot {
  flow: FlowState
  selectedStageId: string
  difficulty: Difficulty
  mirror: boolean
  result: RunResult | null
}
