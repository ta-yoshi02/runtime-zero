import type {
  Difficulty,
  MovementTuning,
  Rect,
  StageCheckpoint,
  StageCycleSpawn,
  StageDefinition,
  StageEnemySpawn,
  StageGemSpawn,
  StageItemSpawn,
  StagePortSocket,
} from '../types'

const STAGE_WIDTH = 3200
const STAGE_HEIGHT = 760

const sharedPlatforms: Rect[] = [
  { x: 0, y: 680, width: 430, height: 80 },
  { x: 510, y: 610, width: 220, height: 24 },
  { x: 810, y: 560, width: 180, height: 24 },
  { x: 1080, y: 500, width: 200, height: 24 },
  { x: 1380, y: 580, width: 220, height: 24 },
  { x: 1700, y: 520, width: 170, height: 24 },
  { x: 1940, y: 450, width: 190, height: 24 },
  { x: 2220, y: 540, width: 240, height: 24 },
  { x: 2550, y: 610, width: 180, height: 24 },
  { x: 2810, y: 680, width: 390, height: 80 },
]

function cycleLine(idPrefix: string, startX: number, y: number, count: number, spacing: number): StageCycleSpawn[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `${idPrefix}-${index}`,
    x: startX + spacing * index,
    y,
    value: 1,
  }))
}

function makeBase(
  index: number,
  name: string,
  theme: string,
  gimmick: string,
  extraPlatforms: Rect[] = [],
): StageDefinition {
  const stageId = `stage-${index}`
  const offset = (index % 2) * 10

  const platforms = sharedPlatforms.map((platform, platformIndex) => ({
    ...platform,
    y: platform.y - ((platformIndex + index) % 3 === 0 ? offset : 0),
  }))

  return {
    id: stageId,
    index,
    name,
    theme,
    gimmick,
    size: {
      width: STAGE_WIDTH,
      height: STAGE_HEIGHT,
    },
    spawn: {
      x: 120,
      y: 650,
    },
    goal: {
      x: STAGE_WIDTH - 72,
      y: 520,
      width: 44,
      height: 120,
    },
    platforms: [...platforms, ...extraPlatforms],
    gemHints: [],
    gems: [],
    cycles: [],
    items: [],
    enemies: [],
    checkpoints: [],
    ports: [],
    springPads: [],
    windZones: [],
    rotatorZones: [],
    waterZones: [],
    collapsingPlatforms: [],
    movingPlatforms: [],
    gravityZones: [],
    timeTargetMs: 92000,
  }
}

function makeStage1(): StageDefinition {
  const stage = makeBase(1, 'Boot Sector', 'The Legacy Gate', 'Spring Chain', [
    { x: 1450, y: 470, width: 110, height: 18 },
    { x: 1600, y: 430, width: 110, height: 18 },
    { x: 1750, y: 390, width: 110, height: 18 },
  ])

  stage.springPads = [
    { id: 's1-spring-1', rect: { x: 548, y: 596, width: 52, height: 14 }, bounceVelocity: 900 },
    { id: 's1-spring-2', rect: { x: 1458, y: 456, width: 52, height: 14 }, bounceVelocity: 980 },
    { id: 's1-spring-3', rect: { x: 1762, y: 376, width: 52, height: 14 }, bounceVelocity: 1040 },
  ]

  stage.cycles = [
    ...cycleLine('s1-a', 240, 618, 7, 40),
    ...cycleLine('s1-b', 840, 520, 5, 34),
    ...cycleLine('s1-c', 1390, 530, 5, 35),
    ...cycleLine('s1-d', 2310, 500, 7, 34),
  ]

  stage.items = [
    { id: 's1-module', kind: 'module', x: 930, y: 510 },
    { id: 's1-compiler', kind: 'compiler', x: 1810, y: 405 },
    { id: 's1-root', kind: 'root_key', x: 2660, y: 560 },
  ]

  stage.gemHints = [
    { x: 690, y: 532 },
    { x: 1680, y: 335 },
    { x: 2930, y: 596 },
  ]
  stage.gems = [
    { id: 's1-gem-a', x: 705, y: 498 },
    { id: 's1-gem-b', x: 1700, y: 300 },
    { id: 's1-gem-c', x: 2980, y: 560 },
  ]

  stage.checkpoints = [
    { id: 's1-cp-1', x: 980, y: 500, width: 16, height: 120 },
    { id: 's1-cp-2', x: 2140, y: 390, width: 16, height: 150 },
  ]

  stage.enemies = [
    { id: 's1-enemy-1', kind: 'crawler', x: 620, y: 590, patrolMinX: 540, patrolMaxX: 750, speed: 72 },
    { id: 's1-enemy-2', kind: 'hopper', x: 1170, y: 470, patrolMinX: 1080, patrolMaxX: 1280, speed: 68 },
    { id: 's1-enemy-3', kind: 'crawler', x: 2080, y: 420, patrolMinX: 1950, patrolMaxX: 2170, speed: 86, minDifficulty: 'Standard' },
    { id: 's1-enemy-4', kind: 'dasher', x: 2500, y: 510, patrolMinX: 2400, patrolMaxX: 2720, speed: 94, minDifficulty: 'Mean' },
  ]

  stage.timeTargetMs = 72000
  return stage
}

function makeStage2(): StageDefinition {
  const stage = makeBase(2, 'Cache Fields', 'Spindle Array', 'Rotator Floor', [
    { x: 860, y: 460, width: 190, height: 18 },
    { x: 1230, y: 430, width: 220, height: 18 },
    { x: 1860, y: 380, width: 230, height: 18 },
  ])

  stage.rotatorZones = [
    { id: 's2-rotor-1', rect: { x: 792, y: 542, width: 280, height: 40 }, amplitude: 150, periodMs: 2200 },
    { id: 's2-rotor-2', rect: { x: 1365, y: 560, width: 270, height: 36 }, amplitude: 180, periodMs: 1950 },
    { id: 's2-rotor-3', rect: { x: 2230, y: 520, width: 260, height: 36 }, amplitude: 210, periodMs: 1800 },
  ]

  stage.cycles = [
    ...cycleLine('s2-a', 220, 618, 8, 37),
    ...cycleLine('s2-b', 900, 430, 6, 34),
    ...cycleLine('s2-c', 1930, 340, 6, 34),
    ...cycleLine('s2-d', 2570, 590, 5, 35),
  ]

  stage.items = [
    { id: 's2-module', kind: 'module', x: 850, y: 500 },
    { id: 's2-compiler', kind: 'compiler', x: 2070, y: 335 },
  ]

  stage.gemHints = [
    { x: 1000, y: 410 },
    { x: 1500, y: 540 },
    { x: 2730, y: 585 },
  ]
  stage.gems = [
    { id: 's2-gem-a', x: 1035, y: 374 },
    { id: 's2-gem-b', x: 1510, y: 505 },
    { id: 's2-gem-c', x: 2760, y: 560 },
  ]

  stage.checkpoints = [
    { id: 's2-cp-1', x: 1180, y: 455, width: 16, height: 130 },
    { id: 's2-cp-2', x: 2320, y: 430, width: 16, height: 130 },
  ]

  stage.enemies = [
    { id: 's2-enemy-1', kind: 'crawler', x: 620, y: 590, patrolMinX: 530, patrolMaxX: 760, speed: 84 },
    { id: 's2-enemy-2', kind: 'hopper', x: 1260, y: 390, patrolMinX: 1210, patrolMaxX: 1460, speed: 80 },
    { id: 's2-enemy-3', kind: 'drone', x: 1750, y: 300, patrolMinX: 1600, patrolMaxX: 1980, speed: 78 },
    { id: 's2-enemy-4', kind: 'chaser', x: 2460, y: 500, patrolMinX: 2300, patrolMaxX: 2600, speed: 82, minDifficulty: 'Standard' },
    { id: 's2-enemy-5', kind: 'turret', x: 2860, y: 640, speed: 0, minDifficulty: 'Mean' },
  ]

  stage.timeTargetMs = 78000
  return stage
}

function makeStage3(): StageDefinition {
  const stage = makeBase(3, 'Wind Tunnel', 'Aero Vent Matrix', 'Wind Streams', [
    { x: 630, y: 430, width: 140, height: 18 },
    { x: 910, y: 360, width: 140, height: 18 },
    { x: 1190, y: 300, width: 140, height: 18 },
    { x: 1470, y: 360, width: 140, height: 18 },
    { x: 1750, y: 430, width: 140, height: 18 },
  ])

  stage.windZones = [
    { id: 's3-wind-1', rect: { x: 540, y: 260, width: 560, height: 380 }, forceX: 220, forceY: -90 },
    { id: 's3-wind-2', rect: { x: 1310, y: 220, width: 480, height: 340 }, forceX: -210, forceY: -110 },
    { id: 's3-wind-3', rect: { x: 2240, y: 260, width: 360, height: 290 }, forceX: 260, forceY: -70 },
  ]

  stage.cycles = [
    ...cycleLine('s3-a', 240, 618, 8, 35),
    ...cycleLine('s3-b', 700, 250, 8, 45),
    ...cycleLine('s3-c', 1320, 210, 6, 44),
    ...cycleLine('s3-d', 2300, 240, 6, 40),
  ]

  stage.items = [
    { id: 's3-module', kind: 'module', x: 1160, y: 270 },
    { id: 's3-root', kind: 'root_key', x: 2410, y: 220 },
  ]

  stage.gemHints = [
    { x: 960, y: 320 },
    { x: 1530, y: 330 },
    { x: 2490, y: 260 },
  ]
  stage.gems = [
    { id: 's3-gem-a', x: 985, y: 280 },
    { id: 's3-gem-b', x: 1540, y: 292 },
    { id: 's3-gem-c', x: 2510, y: 225 },
  ]

  stage.checkpoints = [
    { id: 's3-cp-1', x: 1230, y: 210, width: 16, height: 140 },
    { id: 's3-cp-2', x: 2220, y: 375, width: 16, height: 150 },
  ]

  stage.enemies = [
    { id: 's3-enemy-1', kind: 'drone', x: 760, y: 260, patrolMinX: 600, patrolMaxX: 1080, speed: 88 },
    { id: 's3-enemy-2', kind: 'chaser', x: 1380, y: 330, patrolMinX: 1300, patrolMaxX: 1700, speed: 78 },
    { id: 's3-enemy-3', kind: 'hopper', x: 2240, y: 500, patrolMinX: 2210, patrolMaxX: 2470, speed: 94, minDifficulty: 'Standard' },
    { id: 's3-enemy-4', kind: 'turret', x: 2980, y: 640, speed: 0, minDifficulty: 'Mean' },
  ]

  stage.timeTargetMs = 76000
  return stage
}

function makeStage4(): StageDefinition {
  const stage = makeBase(4, 'Socket Pipes', 'Port Relay Grid', 'Port / Socket Warp', [
    { x: 760, y: 430, width: 120, height: 18 },
    { x: 1440, y: 380, width: 140, height: 18 },
    { x: 2140, y: 350, width: 140, height: 18 },
  ])

  stage.ports = [
    {
      id: 's4-port-1',
      entry: { x: 535, y: 578, width: 50, height: 60 },
      exit: { x: 1520, y: 345 },
      cooldownMs: 1300,
    },
    {
      id: 's4-port-2',
      entry: { x: 1680, y: 545, width: 50, height: 60 },
      exit: { x: 2380, y: 320 },
      cooldownMs: 1300,
    },
    {
      id: 's4-port-3',
      entry: { x: 2600, y: 575, width: 50, height: 60 },
      exit: { x: 2920, y: 585 },
      cooldownMs: 1300,
    },
  ]

  stage.cycles = [
    ...cycleLine('s4-a', 200, 618, 8, 36),
    ...cycleLine('s4-b', 780, 390, 6, 33),
    ...cycleLine('s4-c', 1460, 330, 6, 33),
    ...cycleLine('s4-d', 2160, 300, 6, 33),
  ]

  stage.items = [
    { id: 's4-module', kind: 'module', x: 820, y: 395 },
    { id: 's4-compiler', kind: 'compiler', x: 2180, y: 305 },
  ]

  stage.gemHints = [
    { x: 560, y: 560 },
    { x: 1700, y: 525 },
    { x: 2620, y: 555 },
  ]
  stage.gems = [
    { id: 's4-gem-a', x: 560, y: 545 },
    { id: 's4-gem-b', x: 1720, y: 510 },
    { id: 's4-gem-c', x: 2640, y: 540 },
  ]

  stage.checkpoints = [
    { id: 's4-cp-1', x: 1040, y: 500, width: 16, height: 120 },
    { id: 's4-cp-2', x: 2060, y: 430, width: 16, height: 120 },
  ]

  stage.enemies = [
    { id: 's4-enemy-1', kind: 'crawler', x: 620, y: 590, patrolMinX: 530, patrolMaxX: 730, speed: 85 },
    { id: 's4-enemy-2', kind: 'turret', x: 1260, y: 475, speed: 0 },
    { id: 's4-enemy-3', kind: 'drone', x: 1700, y: 310, patrolMinX: 1510, patrolMaxX: 2100, speed: 84 },
    { id: 's4-enemy-4', kind: 'chaser', x: 2450, y: 500, patrolMinX: 2360, patrolMaxX: 2700, speed: 86, minDifficulty: 'Standard' },
    { id: 's4-enemy-5', kind: 'dasher', x: 2910, y: 630, patrolMinX: 2860, patrolMaxX: 3160, speed: 100, minDifficulty: 'Mean' },
  ]

  stage.timeTargetMs = 78000
  return stage
}

function makeStage5(): StageDefinition {
  const stage = makeBase(5, 'Flooded Bus', 'I/O Canal', 'Vertical Water Flow', [
    { x: 700, y: 470, width: 170, height: 18 },
    { x: 980, y: 420, width: 170, height: 18 },
    { x: 1260, y: 370, width: 170, height: 18 },
    { x: 2160, y: 320, width: 170, height: 18 },
  ])

  stage.waterZones = [
    { id: 's5-water-1', rect: { x: 650, y: 320, width: 520, height: 320 }, forceX: 40, forceY: -210, drag: 0.84 },
    { id: 's5-water-2', rect: { x: 1880, y: 260, width: 540, height: 340 }, forceX: -45, forceY: 170, drag: 0.81 },
  ]

  stage.cycles = [
    ...cycleLine('s5-a', 240, 618, 7, 36),
    ...cycleLine('s5-b', 740, 330, 8, 38),
    ...cycleLine('s5-c', 1940, 300, 8, 38),
    ...cycleLine('s5-d', 2600, 590, 6, 34),
  ]

  stage.items = [
    { id: 's5-module', kind: 'module', x: 1080, y: 330 },
    { id: 's5-root', kind: 'root_key', x: 2230, y: 280 },
    { id: 's5-compiler', kind: 'compiler', x: 2700, y: 540 },
  ]

  stage.gemHints = [
    { x: 860, y: 300 },
    { x: 2030, y: 280 },
    { x: 2790, y: 570 },
  ]
  stage.gems = [
    { id: 's5-gem-a', x: 882, y: 260 },
    { id: 's5-gem-b', x: 2040, y: 240 },
    { id: 's5-gem-c', x: 2820, y: 540 },
  ]

  stage.checkpoints = [
    { id: 's5-cp-1', x: 1200, y: 300, width: 16, height: 130 },
    { id: 's5-cp-2', x: 2390, y: 250, width: 16, height: 150 },
  ]

  stage.enemies = [
    { id: 's5-enemy-1', kind: 'drone', x: 920, y: 275, patrolMinX: 730, patrolMaxX: 1270, speed: 74 },
    { id: 's5-enemy-2', kind: 'hopper', x: 1680, y: 495, patrolMinX: 1610, patrolMaxX: 1890, speed: 82 },
    { id: 's5-enemy-3', kind: 'turret', x: 2140, y: 285, speed: 0, minDifficulty: 'Standard' },
    { id: 's5-enemy-4', kind: 'chaser', x: 2720, y: 565, patrolMinX: 2600, patrolMaxX: 2890, speed: 92, minDifficulty: 'Mean' },
  ]

  stage.timeTargetMs = 82000
  return stage
}

function makeStage6(): StageDefinition {
  const stage = makeBase(6, 'Leak Factory', 'Memory Leak Pit', 'Collapsing Platforms', [
    { x: 700, y: 520, width: 110, height: 18 },
    { x: 850, y: 480, width: 110, height: 18 },
    { x: 1000, y: 440, width: 110, height: 18 },
    { x: 1850, y: 430, width: 120, height: 18 },
    { x: 2000, y: 390, width: 120, height: 18 },
    { x: 2150, y: 350, width: 120, height: 18 },
  ])

  stage.collapsingPlatforms = [
    { id: 's6-collapse-1', rect: { x: 1480, y: 560, width: 120, height: 20 }, collapseDelayMs: 550, respawnMs: 2300 },
    { id: 's6-collapse-2', rect: { x: 1640, y: 510, width: 120, height: 20 }, collapseDelayMs: 550, respawnMs: 2300 },
    { id: 's6-collapse-3', rect: { x: 1800, y: 460, width: 120, height: 20 }, collapseDelayMs: 550, respawnMs: 2300 },
    { id: 's6-collapse-4', rect: { x: 2480, y: 510, width: 120, height: 20 }, collapseDelayMs: 520, respawnMs: 2100 },
  ]

  stage.cycles = [
    ...cycleLine('s6-a', 240, 620, 8, 36),
    ...cycleLine('s6-b', 750, 400, 6, 35),
    ...cycleLine('s6-c', 1500, 520, 6, 40),
    ...cycleLine('s6-d', 2490, 470, 6, 34),
  ]

  stage.items = [
    { id: 's6-module', kind: 'module', x: 1040, y: 390 },
    { id: 's6-compiler', kind: 'compiler', x: 2160, y: 305 },
    { id: 's6-root', kind: 'root_key', x: 2560, y: 470 },
  ]

  stage.gemHints = [
    { x: 980, y: 410 },
    { x: 1820, y: 440 },
    { x: 2500, y: 490 },
  ]
  stage.gems = [
    { id: 's6-gem-a', x: 1020, y: 365 },
    { id: 's6-gem-b', x: 1840, y: 415 },
    { id: 's6-gem-c', x: 2520, y: 455 },
  ]

  stage.checkpoints = [
    { id: 's6-cp-1', x: 1220, y: 450, width: 16, height: 150 },
    { id: 's6-cp-2', x: 2360, y: 320, width: 16, height: 170 },
  ]

  stage.enemies = [
    { id: 's6-enemy-1', kind: 'crawler', x: 600, y: 590, patrolMinX: 540, patrolMaxX: 740, speed: 88 },
    { id: 's6-enemy-2', kind: 'hopper', x: 1090, y: 390, patrolMinX: 990, patrolMaxX: 1150, speed: 94 },
    { id: 's6-enemy-3', kind: 'chaser', x: 1700, y: 475, patrolMinX: 1600, patrolMaxX: 1960, speed: 90, minDifficulty: 'Standard' },
    { id: 's6-enemy-4', kind: 'dasher', x: 2610, y: 470, patrolMinX: 2500, patrolMaxX: 2780, speed: 100, minDifficulty: 'Mean' },
  ]

  stage.timeTargetMs = 86000
  return stage
}

function makeStage7(): StageDefinition {
  const stage = makeBase(7, 'Bit-Rot Ruins', 'Scheduler Rails', 'Moving Platforms', [
    { x: 620, y: 470, width: 120, height: 18 },
    { x: 950, y: 430, width: 120, height: 18 },
    { x: 1290, y: 390, width: 120, height: 18 },
  ])

  stage.movingPlatforms = [
    { id: 's7-move-1', rect: { x: 1520, y: 520, width: 130, height: 18 }, axis: 'x', travel: 260, speed: 1.1, phase: 0 },
    { id: 's7-move-2', rect: { x: 1860, y: 440, width: 130, height: 18 }, axis: 'y', travel: 170, speed: 1.3, phase: 0.6 },
    { id: 's7-move-3', rect: { x: 2220, y: 390, width: 130, height: 18 }, axis: 'x', travel: 230, speed: 1.4, phase: 1.2 },
  ]

  stage.cycles = [
    ...cycleLine('s7-a', 220, 620, 8, 36),
    ...cycleLine('s7-b', 670, 430, 6, 35),
    ...cycleLine('s7-c', 1540, 500, 7, 38),
    ...cycleLine('s7-d', 2250, 360, 8, 32),
  ]

  stage.items = [
    { id: 's7-module', kind: 'module', x: 980, y: 392 },
    { id: 's7-compiler', kind: 'compiler', x: 1910, y: 390 },
    { id: 's7-root', kind: 'root_key', x: 2320, y: 330 },
  ]

  stage.gemHints = [
    { x: 1300, y: 365 },
    { x: 1840, y: 400 },
    { x: 2340, y: 345 },
  ]
  stage.gems = [
    { id: 's7-gem-a', x: 1320, y: 334 },
    { id: 's7-gem-b', x: 1870, y: 360 },
    { id: 's7-gem-c', x: 2365, y: 312 },
  ]

  stage.checkpoints = [
    { id: 's7-cp-1', x: 1450, y: 450, width: 16, height: 150 },
    { id: 's7-cp-2', x: 2140, y: 300, width: 16, height: 180 },
  ]

  stage.enemies = [
    { id: 's7-enemy-1', kind: 'hopper', x: 760, y: 430, patrolMinX: 640, patrolMaxX: 820, speed: 94 },
    { id: 's7-enemy-2', kind: 'drone', x: 1510, y: 460, patrolMinX: 1470, patrolMaxX: 1810, speed: 90 },
    { id: 's7-enemy-3', kind: 'turret', x: 2050, y: 315, speed: 0, minDifficulty: 'Standard' },
    { id: 's7-enemy-4', kind: 'dasher', x: 2450, y: 515, patrolMinX: 2280, patrolMaxX: 2680, speed: 108, minDifficulty: 'Mean' },
  ]

  stage.timeTargetMs = 90000
  return stage
}

function makeStage8(): StageDefinition {
  const stage = makeBase(8, 'Kernel Descent', 'Deep Root Core', 'Gravity Invert Fields', [
    { x: 700, y: 480, width: 130, height: 18 },
    { x: 980, y: 420, width: 130, height: 18 },
    { x: 1260, y: 360, width: 130, height: 18 },
    { x: 1540, y: 300, width: 130, height: 18 },
    { x: 1820, y: 360, width: 130, height: 18 },
  ])

  stage.gravityZones = [
    { id: 's8-gravity-1', rect: { x: 620, y: 220, width: 610, height: 360 }, gravityScale: -0.58 },
    { id: 's8-gravity-2', rect: { x: 1640, y: 190, width: 540, height: 370 }, gravityScale: -0.65 },
    { id: 's8-gravity-3', rect: { x: 2360, y: 240, width: 480, height: 300 }, gravityScale: 1.35 },
  ]

  stage.windZones = [
    { id: 's8-wind-1', rect: { x: 2280, y: 210, width: 400, height: 300 }, forceX: 230, forceY: -80 },
  ]

  stage.cycles = [
    ...cycleLine('s8-a', 220, 620, 8, 36),
    ...cycleLine('s8-b', 760, 260, 8, 38),
    ...cycleLine('s8-c', 1700, 230, 8, 35),
    ...cycleLine('s8-d', 2440, 250, 7, 36),
  ]

  stage.items = [
    { id: 's8-module', kind: 'module', x: 1010, y: 380 },
    { id: 's8-compiler', kind: 'compiler', x: 1870, y: 320 },
    { id: 's8-root', kind: 'root_key', x: 2600, y: 220 },
  ]

  stage.gemHints = [
    { x: 920, y: 240 },
    { x: 1760, y: 220 },
    { x: 2660, y: 230 },
  ]
  stage.gems = [
    { id: 's8-gem-a', x: 936, y: 206 },
    { id: 's8-gem-b', x: 1775, y: 188 },
    { id: 's8-gem-c', x: 2688, y: 192 },
  ]

  stage.checkpoints = [
    { id: 's8-cp-1', x: 1320, y: 280, width: 16, height: 170 },
    { id: 's8-cp-2', x: 2180, y: 240, width: 16, height: 170 },
  ]

  stage.enemies = [
    { id: 's8-enemy-1', kind: 'drone', x: 860, y: 210, patrolMinX: 700, patrolMaxX: 1220, speed: 92 },
    { id: 's8-enemy-2', kind: 'chaser', x: 1650, y: 280, patrolMinX: 1550, patrolMaxX: 1990, speed: 92 },
    { id: 's8-enemy-3', kind: 'turret', x: 2280, y: 250, speed: 0, minDifficulty: 'Standard' },
    { id: 's8-enemy-4', kind: 'dasher', x: 2860, y: 620, patrolMinX: 2810, patrolMaxX: 3140, speed: 112, minDifficulty: 'Mean' },
    { id: 's8-enemy-5', kind: 'hopper', x: 2440, y: 480, patrolMinX: 2340, patrolMaxX: 2600, speed: 102 },
  ]

  stage.timeTargetMs = 98000
  return stage
}

export const stages: StageDefinition[] = [
  makeStage1(),
  makeStage2(),
  makeStage3(),
  makeStage4(),
  makeStage5(),
  makeStage6(),
  makeStage7(),
  makeStage8(),
]

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
  fireCooldownMs: 240,
  shotSpeed: 610,
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
    invulnTimeMs: 850,
    fireCooldownMs: 180,
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
    invulnTimeMs: 520,
    fireCooldownMs: 270,
  },
}

export const difficultyOrder: Difficulty[] = ['Chill', 'Standard', 'Mean']

export function difficultyToValue(difficulty: Difficulty): number {
  return difficultyOrder.indexOf(difficulty)
}

export function canSpawnForDifficulty(
  difficulty: Difficulty,
  minDifficulty?: Difficulty,
): boolean {
  if (!minDifficulty) {
    return true
  }

  return difficultyToValue(difficulty) >= difficultyToValue(minDifficulty)
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

export function stageGemCount(stageId: string): number {
  return getStageById(stageId).gems.length
}

export function buildStagePortMap(ports: StagePortSocket[]): Map<string, StagePortSocket> {
  return new Map(ports.map((port) => [port.id, port]))
}

export function buildStageEnemyMap(enemies: StageEnemySpawn[]): Map<string, StageEnemySpawn> {
  return new Map(enemies.map((enemy) => [enemy.id, enemy]))
}

export function buildStageItemMap(items: StageItemSpawn[]): Map<string, StageItemSpawn> {
  return new Map(items.map((item) => [item.id, item]))
}

export function buildStageGemMap(gems: StageGemSpawn[]): Map<string, StageGemSpawn> {
  return new Map(gems.map((gem) => [gem.id, gem]))
}

export function buildStageCheckpointMap(checkpoints: StageCheckpoint[]): Map<string, StageCheckpoint> {
  return new Map(checkpoints.map((checkpoint) => [checkpoint.id, checkpoint]))
}
