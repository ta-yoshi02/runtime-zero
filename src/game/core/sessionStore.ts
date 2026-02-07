import type { Difficulty, FlowState, RunResult, SessionSnapshot } from '../types'

export const DIFFICULTY_ORDER: Difficulty[] = ['Chill', 'Standard', 'Mean']

class GameSessionStore {
  private readonly state: SessionSnapshot = {
    flow: 'title',
    selectedStageId: 'stage-1',
    difficulty: 'Standard',
    mirror: false,
    result: null,
  }

  get snapshot(): SessionSnapshot {
    return {
      ...this.state,
      result: this.state.result ? { ...this.state.result } : null,
    }
  }

  setFlow(flow: FlowState): void {
    this.state.flow = flow
  }

  setSelectedStage(stageId: string): void {
    this.state.selectedStageId = stageId
  }

  setDifficulty(difficulty: Difficulty): void {
    this.state.difficulty = difficulty
  }

  setMirror(mirror: boolean): void {
    this.state.mirror = mirror
  }

  shiftDifficulty(delta: 1 | -1): void {
    const current = DIFFICULTY_ORDER.indexOf(this.state.difficulty)
    const nextIndex = (current + delta + DIFFICULTY_ORDER.length) % DIFFICULTY_ORDER.length
    this.state.difficulty = DIFFICULTY_ORDER[nextIndex]
  }

  toggleMirror(): void {
    this.state.mirror = !this.state.mirror
  }

  setResult(result: RunResult): void {
    this.state.result = result
  }

  clearResult(): void {
    this.state.result = null
  }

  resetToTitle(): void {
    this.state.flow = 'title'
    this.state.result = null
  }
}

export const sessionStore = new GameSessionStore()
