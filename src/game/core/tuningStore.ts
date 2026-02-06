import { getMovementTuning } from '../data/stages'
import type { Difficulty, MovementTuning } from '../types'

const STORAGE_KEY = 'runtime-zero:tuning-overrides:v1'

export type TuningKey = keyof MovementTuning

export interface TuningFieldDefinition {
  key: TuningKey
  label: string
  min: number
  max: number
  step: number
}

export const TUNING_FIELDS: TuningFieldDefinition[] = [
  { key: 'walkSpeed', label: 'Walk Speed', min: 120, max: 500, step: 10 },
  { key: 'runSpeed', label: 'Run Speed', min: 160, max: 650, step: 10 },
  { key: 'groundAcceleration', label: 'Ground Accel', min: 600, max: 4200, step: 50 },
  { key: 'airAcceleration', label: 'Air Accel', min: 400, max: 3200, step: 50 },
  { key: 'groundDeceleration', label: 'Ground Decel', min: 600, max: 4500, step: 50 },
  { key: 'airDeceleration', label: 'Air Decel', min: 200, max: 2200, step: 50 },
  { key: 'jumpVelocity', label: 'Jump Velocity', min: 280, max: 1100, step: 10 },
  { key: 'gravity', label: 'Gravity', min: 500, max: 2800, step: 50 },
  { key: 'maxFallSpeed', label: 'Max Fall Speed', min: 280, max: 1900, step: 20 },
  { key: 'coyoteTimeMs', label: 'Coyote (ms)', min: 0, max: 300, step: 10 },
  { key: 'jumpBufferMs', label: 'Jump Buffer (ms)', min: 0, max: 300, step: 10 },
  { key: 'wallJumpXVelocity', label: 'Wall Jump X', min: 100, max: 700, step: 10 },
  { key: 'wallJumpYVelocity', label: 'Wall Jump Y', min: 260, max: 1100, step: 10 },
  { key: 'slideSpeed', label: 'Slide Speed', min: 220, max: 700, step: 10 },
  { key: 'slideDurationMs', label: 'Slide Duration (ms)', min: 80, max: 700, step: 20 },
  { key: 'groundPoundVelocity', label: 'Ground Pound Speed', min: 500, max: 2200, step: 20 },
  { key: 'cameraLookAhead', label: 'Camera Lookahead', min: 0, max: 320, step: 5 },
  { key: 'cameraLookAheadDash', label: 'Camera Dash Lookahead', min: 0, max: 420, step: 5 },
  { key: 'knockbackStrength', label: 'Knockback Strength', min: 0, max: 700, step: 10 },
  { key: 'invulnTimeMs', label: 'Invuln Time (ms)', min: 0, max: 2200, step: 20 },
]

function clampAndSnap(value: number, field: TuningFieldDefinition): number {
  const clamped = Math.min(field.max, Math.max(field.min, value))
  const snapped = Math.round(clamped / field.step) * field.step
  return Math.min(field.max, Math.max(field.min, snapped))
}

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

class TuningStore {
  private overrides: Partial<MovementTuning>

  constructor() {
    this.overrides = this.load()
  }

  getOverrides(): Partial<MovementTuning> {
    return { ...this.overrides }
  }

  getResolvedTuning(difficulty: Difficulty): MovementTuning {
    return {
      ...getMovementTuning(difficulty),
      ...this.overrides,
    }
  }

  setValue(key: TuningKey, value: number): void {
    const field = TUNING_FIELDS.find((item) => item.key === key)
    if (!field) {
      return
    }

    this.overrides[key] = clampAndSnap(value, field)
    this.save()
  }

  getValue(key: TuningKey, difficulty: Difficulty): number {
    const resolved = this.getResolvedTuning(difficulty)
    return resolved[key]
  }

  reset(): void {
    this.overrides = {}
    this.save()
  }

  private load(): Partial<MovementTuning> {
    if (!canUseStorage()) {
      return {}
    }

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY)
      if (!raw) {
        return {}
      }

      const parsed = JSON.parse(raw) as Partial<MovementTuning>
      if (!parsed || typeof parsed !== 'object') {
        return {}
      }

      const next: Partial<MovementTuning> = {}
      TUNING_FIELDS.forEach((field) => {
        const candidate = parsed[field.key]
        if (typeof candidate !== 'number' || Number.isNaN(candidate)) {
          return
        }

        next[field.key] = clampAndSnap(candidate, field)
      })

      return next
    } catch {
      return {}
    }
  }

  private save(): void {
    if (!canUseStorage()) {
      return
    }

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.overrides))
    } catch {
      // ignore quota/storage access errors in prototype mode
    }
  }
}

export const tuningStore = new TuningStore()
