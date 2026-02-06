import Phaser from 'phaser'
import { BootScene } from '../scenes/BootScene'
import { ControlsScene } from '../scenes/ControlsScene'
import { CreditsScene } from '../scenes/CreditsScene'
import { MainMenuScene } from '../scenes/MainMenuScene'
import { OptionsMenuScene } from '../scenes/OptionsMenuScene'
import { ResultScene } from '../scenes/ResultScene'
import { StagePlayScene } from '../scenes/StagePlayScene'
import { StageSelectScene } from '../scenes/StageSelectScene'
import { TuningScene } from '../scenes/TuningScene'
import { TitleScene } from '../scenes/TitleScene'

export const GAME_WIDTH = 960
export const GAME_HEIGHT = 540

export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    backgroundColor: '#07111f',
    render: {
      antialias: false,
      pixelArt: true,
    },
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    scene: [
      BootScene,
      TitleScene,
      MainMenuScene,
      OptionsMenuScene,
      ControlsScene,
      StageSelectScene,
      StagePlayScene,
      ResultScene,
      TuningScene,
      CreditsScene,
    ],
  }
}
