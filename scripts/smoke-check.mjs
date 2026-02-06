import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

function expect(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

const stagesSource = read('src/game/data/stages.ts')
const stageNameMatches = stagesSource.match(/makeStage[1-8]\(\)/g) ?? []
expect(stageNameMatches.length >= 8, 'Expected 8 stage factories in stages.ts')

const sceneKeysSource = read('src/game/core/sceneKeys.ts')
expect(sceneKeysSource.includes('MAIN_MENU'), 'Missing MAIN_MENU scene key')
expect(sceneKeysSource.includes('STAGE_SELECT'), 'Missing STAGE_SELECT scene key')
expect(sceneKeysSource.includes('STAGE_PLAY'), 'Missing STAGE_PLAY scene key')
expect(sceneKeysSource.includes('RESULT'), 'Missing RESULT scene key')
expect(sceneKeysSource.includes('TUNING'), 'Missing TUNING scene key')
expect(sceneKeysSource.includes('OPTIONS_MENU'), 'Missing OPTIONS_MENU scene key')

const stagePlaySource = read('src/game/scenes/StagePlayScene.ts')
expect(stagePlaySource.includes("patchState = 'raw'"), 'Missing Raw Data state handling')
expect(stagePlaySource.includes("patchState = 'encapsulated'"), 'Missing Encapsulated state handling')
expect(stagePlaySource.includes('this.sudoTimerMs = BINARY_SUDO_DURATION_MS'), 'Missing Sudo Mode trigger')
expect(stagePlaySource.includes('this.hasCompiler = true'), 'Missing Compiler / Debug Shot unlock')
expect(stagePlaySource.includes('this.finishRun(true, \'goal\')'), 'Missing goal completion path')

console.log('Smoke checks passed: stage data, scene keys, and gameplay state hooks are present.')
