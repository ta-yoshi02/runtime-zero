import type { Difficulty, MovementTuning, Rect, StageDefinition } from '../types'

const STAGE_WIDTH = 3000
const STAGE_HEIGHT = 720

const basePlatforms: Rect[] = [
  { x: 0, y: 640, width: 440, height: 80 },
  { x: 540, y: 560, width: 220, height: 24 },
  { x: 860, y: 500, width: 180, height: 24 },
  { x: 1140, y: 430, width: 160, height: 24 },
  { x: 1380, y: 540, width: 240, height: 24 },
  { x: 1720, y: 460, width: 180, height: 24 },
  { x: 1980, y: 390, width: 180, height: 24 },
  { x: 2240, y: 510, width: 220, height: 24 },
  { x: 2540, y: 570, width: 460, height: 80 },
]

const stageMeta = [
  { name: 'Boot Sector', theme: 'The Legacy Gate', gimmick: 'Wind Draft' },
  { name: 'Rotor Cache', theme: 'Spindle Array', gimmick: 'Rotating Floor' },
  { name: 'Spring Heap', theme: 'Memory Springs', gimmick: 'Elastic Pads' },
  { name: 'Flooded Bus', theme: 'I/O Canal', gimmick: 'Vertical Stream' },
  { name: 'Trace Rift', theme: 'Profiler Chasm', gimmick: 'Pulse Laser' },
  { name: 'Port Relay', theme: 'Socket Junction', gimmick: 'Warp Port' },
  { name: 'Thread Forge', theme: 'Scheduler Core', gimmick: 'Conveyor Shift' },
  { name: 'Kernel Spine', theme: 'Deep Root', gimmick: 'Gravity Invert' },
] as const

function makeStage(index: number): StageDefinition {
  const offset = (index % 3) * 20
  const platforms = basePlatforms.map((platform, platformIndex) => ({
    ...platform,
    y: platform.y - ((platformIndex + index) % 2 === 0 ? offset : 0),
  }))

  return {
    id: `stage-${index + 1}`,
    index: index + 1,
    name: stageMeta[index].name,
    theme: stageMeta[index].theme,
    gimmick: stageMeta[index].gimmick,
    size: {
      width: STAGE_WIDTH,
      height: STAGE_HEIGHT,
    },
    spawn: {
      x: 120,
      y: 610,
    },
    goal: {
      x: STAGE_WIDTH - 88,
      y: 460,
      width: 52,
      height: 96,
    },
    platforms,
    gemHints: [
      { x: 670, y: 500 - offset },
      { x: 1520, y: 430 - offset },
      { x: 2360, y: 470 - offset },
    ],
  }
}

export const stages: StageDefinition[] = Array.from({ length: 8 }, (_, index) => makeStage(index))

const baseMovement: MovementTuning = {
  walkSpeed: 300,
  runSpeed: 420,
  groundAcceleration: 2100,
  airAcceleration: 1450,
  groundDeceleration: 2500,
  airDeceleration: 900,
  jumpVelocity: 760,
  jumpCutVelocity: 300,
  gravity: 1800,
  maxFallSpeed: 980,
  coyoteTimeMs: 120,
  jumpBufferMs: 120,
  wallJumpXVelocity: 390,
  wallJumpYVelocity: 720,
  slideSpeed: 460,
  slideDurationMs: 300,
  slideEnterBoost: 55,
  groundPoundVelocity: 1200,
  groundPoundLockMs: 120,
  cameraLookAhead: 120,
  cameraLookAheadDash: 220,
  knockbackStrength: 280,
  invulnTimeMs: 650,
}

const movementOverrides: Record<Difficulty, Partial<MovementTuning>> = {
  Chill: {
    walkSpeed: 290,
    runSpeed: 395,
    gravity: 1650,
    coyoteTimeMs: 180,
    jumpBufferMs: 170,
    cameraLookAhead: 105,
    cameraLookAheadDash: 195,
  },
  Standard: {},
  Mean: {
    walkSpeed: 320,
    runSpeed: 450,
    gravity: 1950,
    coyoteTimeMs: 80,
    jumpBufferMs: 80,
    cameraLookAhead: 130,
    cameraLookAheadDash: 240,
  },
}

export function getMovementTuning(difficulty: Difficulty): MovementTuning {
  return {
    ...baseMovement,
    ...movementOverrides[difficulty],
  }
}

export function getStageById(stageId: string): StageDefinition {
  return stages.find((stage) => stage.id === stageId) ?? stages[0]
}
