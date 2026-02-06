export type Difficulty = 'Chill' | 'Standard' | 'Mean'
export type FlowState = 'title' | 'stage_select' | 'ingame' | 'result'

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
}

export interface MovementTuning {
  maxRunSpeed: number
  groundAcceleration: number
  airAcceleration: number
  groundDeceleration: number
  airDeceleration: number
  jumpVelocity: number
  jumpCutVelocity: number
  coyoteTimeMs: number
  jumpBufferMs: number
}

export interface RunResult {
  stageId: string
  stageName: string
  success: boolean
  reason: 'goal' | 'null_pointer' | 'exit'
  elapsedMs: number
  difficulty: Difficulty
  mirror: boolean
}

export interface SessionSnapshot {
  flow: FlowState
  selectedStageId: string
  difficulty: Difficulty
  mirror: boolean
  result: RunResult | null
}
