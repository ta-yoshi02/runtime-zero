import type { Difficulty } from '../types'

const STORAGE_KEY = 'runtime-zero:boot-intent:v1'

export interface BootIntent {
  targetScene: string
  selectedStageId: string
  difficulty: Difficulty
  mirror: boolean
}

function canUseSessionStorage(): boolean {
  return typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'
}

export function setBootIntent(intent: BootIntent): void {
  if (!canUseSessionStorage()) {
    return
  }

  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(intent))
  } catch {
    // ignore storage errors in prototype mode
  }
}

export function consumeBootIntent(): BootIntent | null {
  if (!canUseSessionStorage()) {
    return null
  }

  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return null
    }

    window.sessionStorage.removeItem(STORAGE_KEY)
    const parsed = JSON.parse(raw) as Partial<BootIntent> | null
    if (!parsed || typeof parsed !== 'object') {
      return null
    }

    if (
      typeof parsed.targetScene !== 'string' ||
      typeof parsed.selectedStageId !== 'string' ||
      (parsed.difficulty !== 'Chill' && parsed.difficulty !== 'Standard' && parsed.difficulty !== 'Mean') ||
      typeof parsed.mirror !== 'boolean'
    ) {
      return null
    }

    return {
      targetScene: parsed.targetScene,
      selectedStageId: parsed.selectedStageId,
      difficulty: parsed.difficulty,
      mirror: parsed.mirror,
    }
  } catch {
    return null
  }
}
