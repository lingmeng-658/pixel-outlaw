import { MAX_HEALTH } from './constants'
import type { AreaId, LevelOneSaveStage } from './types'

export const SAVE_KEY = 'pixel-outlaw-save'

export type LevelOneCoinProgress = {
  dropTarget: number
  dropped: number
  enemyDefeats: number
  defeatTargets: number[]
}

export type LevelOneSaveData = {
  version: 2
  savedAt: string
  level: 1
  area: AreaId
  levelCompleted: boolean
  stage: LevelOneSaveStage
  score: number
  health: number
  coins: number
  heartIntroduced: boolean
  coinProgress: LevelOneCoinProgress
}

type CreateLevelOneSaveDataInput = Omit<LevelOneSaveData, 'version' | 'savedAt' | 'level'>

type VersionOneSaveData = {
  version: 1
  savedAt: string
  level: 1
  stage: LevelOneSaveStage
  score: number
  health: number
}

const SAVE_STAGES: LevelOneSaveStage[] = ['intro', 'heart', 'coffee', 'shield', 'final', 'clear']
const AREA_IDS: AreaId[] = ['dustyOutskirts', 'townRoad']

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 0
}

function isValidHealth(value: unknown): value is number {
  return Number.isInteger(value) && (value as number) >= 1 && (value as number) <= MAX_HEALTH
}

function isSaveStage(value: unknown): value is LevelOneSaveStage {
  return typeof value === 'string' && SAVE_STAGES.includes(value as LevelOneSaveStage)
}

function isAreaId(value: unknown): value is AreaId {
  return typeof value === 'string' && AREA_IDS.includes(value as AreaId)
}

function isValidCoinProgress(value: unknown): value is LevelOneCoinProgress {
  if (!isRecord(value)) return false

  const { dropTarget, dropped, enemyDefeats, defeatTargets } = value
  if (!isNonNegativeInteger(dropTarget) || !isNonNegativeInteger(dropped)) return false
  if (!isNonNegativeInteger(enemyDefeats) || !Array.isArray(defeatTargets)) return false
  if (dropped > dropTarget || defeatTargets.length !== dropTarget) return false
  if (!defeatTargets.every(isNonNegativeInteger)) return false

  return defeatTargets.every((target, index) => index === 0 || target > defeatTargets[index - 1])
}

function isVersionOneSaveData(value: unknown): value is VersionOneSaveData {
  if (!isRecord(value)) return false

  return value.version === 1
    && typeof value.savedAt === 'string'
    && value.level === 1
    && isSaveStage(value.stage)
    && isNonNegativeInteger(value.score)
    && isValidHealth(value.health)
}

function isVersionTwoSaveData(value: unknown): value is LevelOneSaveData {
  if (!isRecord(value)) return false

  return value.version === 2
    && typeof value.savedAt === 'string'
    && value.level === 1
    && isAreaId(value.area)
    && typeof value.levelCompleted === 'boolean'
    && isSaveStage(value.stage)
    && isNonNegativeInteger(value.score)
    && isValidHealth(value.health)
    && isNonNegativeInteger(value.coins)
    && typeof value.heartIntroduced === 'boolean'
    && isValidCoinProgress(value.coinProgress)
    && (value.area !== 'townRoad' || value.levelCompleted)
    && value.levelCompleted === (value.stage === 'clear')
}

function migrateVersionOneSaveData(saveData: VersionOneSaveData): LevelOneSaveData {
  const levelCompleted = saveData.stage === 'clear'

  return {
    version: 2,
    savedAt: saveData.savedAt,
    level: 1,
    area: 'dustyOutskirts',
    levelCompleted,
    stage: levelCompleted ? 'clear' : 'intro',
    score: levelCompleted ? saveData.score : 0,
    health: levelCompleted ? saveData.health : MAX_HEALTH,
    coins: 0,
    heartIntroduced: false,
    coinProgress: {
      dropTarget: 0,
      dropped: 0,
      enemyDefeats: 0,
      defeatTargets: [],
    },
  }
}

export function createLevelOneSaveData(input: CreateLevelOneSaveDataInput): LevelOneSaveData {
  return {
    version: 2,
    savedAt: new Date().toISOString(),
    level: 1,
    ...input,
  }
}

export function loadLevelOneSaveData(): LevelOneSaveData | null {
  try {
    const rawSaveData = localStorage.getItem(SAVE_KEY)
    if (rawSaveData === null) return null

    const parsedSaveData: unknown = JSON.parse(rawSaveData)

    if (isVersionTwoSaveData(parsedSaveData)) {
      return parsedSaveData
    }

    if (isVersionOneSaveData(parsedSaveData)) {
      return migrateVersionOneSaveData(parsedSaveData)
    }
  } catch {
    return null
  }

  return null
}
