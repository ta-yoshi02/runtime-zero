import Phaser from 'phaser'
import { createGameConfig } from './core/gameConfig'

let runtimeZeroGame: Phaser.Game | null = null

export function launchRuntimeZero(parent: HTMLElement): Phaser.Game {
  if (runtimeZeroGame) {
    runtimeZeroGame.destroy(true)
  }

  runtimeZeroGame = new Phaser.Game(createGameConfig(parent))

  window.advanceTime = async (ms: number): Promise<void> => {
    await new Promise<void>((resolve) => {
      window.setTimeout(resolve, Math.max(0, ms))
    })
  }

  return runtimeZeroGame
}
