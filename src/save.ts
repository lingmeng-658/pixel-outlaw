import type { LevelOneSaveStage } from './types'

export const SAVE_KEY = 'pixel-outlaw-save'

export type LevelOneSaveData = {
  version: 1
  savedAt: string
  level: 1
  stage: LevelOneSaveStage
  score: number
  health: number
}

type CreateLevelOneSaveDataInput = {
  stage: LevelOneSaveStage
  score: number
  health: number
}

export function createLevelOneSaveData(input: CreateLevelOneSaveDataInput): LevelOneSaveData {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    level: 1,
    stage: input.stage,
    score: input.score,
    health: input.health,
  }
}
