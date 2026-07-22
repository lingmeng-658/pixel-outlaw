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
  version: 3
  savedAt: string
  level: 1 | 2
  area: AreaId
  levelCompleted: boolean
  levelTwoCompleted: boolean
  stage: LevelOneSaveStage
  score: number
  health: number
  maxHealth: number
  coins: number
  heartIntroduced: boolean
  coinProgress: LevelOneCoinProgress
}

type CreateLevelOneSaveDataInput = Omit<LevelOneSaveData, 'version' | 'savedAt' | 'level'>
type VersionTwoSaveData = Omit<LevelOneSaveData, 'version' | 'levelTwoCompleted' | 'maxHealth'> & {
  version: 2
  level: 1
}
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

function isValidBaseHealth(value: unknown): value is number {
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
  return isNonNegativeInteger(dropTarget)
    && isNonNegativeInteger(dropped)
    && dropped <= dropTarget
    && isNonNegativeInteger(enemyDefeats)
    && Array.isArray(defeatTargets)
    && defeatTargets.length === dropTarget
    && defeatTargets.every(isNonNegativeInteger)
    && defeatTargets.every((target, index) => index === 0 || target > defeatTargets[index - 1])
}

function hasSharedSaveFields(value: Record<string, unknown>) {
  return typeof value.savedAt === 'string'
    && isAreaId(value.area)
    && typeof value.levelCompleted === 'boolean'
    && isSaveStage(value.stage)
    && isNonNegativeInteger(value.score)
    && isNonNegativeInteger(value.coins)
    && typeof value.heartIntroduced === 'boolean'
    && isValidCoinProgress(value.coinProgress)
    && (value.area !== 'townRoad' || value.levelCompleted)
    && value.levelCompleted === (value.stage === 'clear')
}

function isVersionThreeSaveData(value: unknown): value is LevelOneSaveData {
  if (!isRecord(value) || value.version !== 3 || (value.level !== 1 && value.level !== 2)) return false
  if (!hasSharedSaveFields(value)) return false
  if (typeof value.levelTwoCompleted !== 'boolean') return false
  if (!Number.isInteger(value.maxHealth) || (value.maxHealth as number) < MAX_HEALTH || (value.maxHealth as number) > MAX_HEALTH + 1) return false
  if (!Number.isInteger(value.health) || (value.health as number) < 1 || (value.health as number) > (value.maxHealth as number)) return false
  if (value.levelTwoCompleted && (!value.levelCompleted || value.maxHealth !== MAX_HEALTH + 1)) return false
  return value.level === (value.area === 'townRoad' ? 2 : 1)
}

function isVersionTwoSaveData(value: unknown): value is VersionTwoSaveData {
  return isRecord(value)
    && value.version === 2
    && value.level === 1
    && hasSharedSaveFields(value)
    && isValidBaseHealth(value.health)
}

function isVersionOneSaveData(value: unknown): value is VersionOneSaveData {
  return isRecord(value)
    && value.version === 1
    && typeof value.savedAt === 'string'
    && value.level === 1
    && isSaveStage(value.stage)
    && isNonNegativeInteger(value.score)
    && isValidBaseHealth(value.health)
}

function migrateVersionTwoSaveData(saveData: VersionTwoSaveData): LevelOneSaveData {
  return {
    ...saveData,
    version: 3,
    level: saveData.area === 'townRoad' ? 2 : 1,
    levelTwoCompleted: false,
    maxHealth: MAX_HEALTH,
  }
}

function migrateVersionOneSaveData(saveData: VersionOneSaveData): LevelOneSaveData {
  const levelCompleted = saveData.stage === 'clear'
  return {
    version: 3,
    savedAt: saveData.savedAt,
    level: 1,
    area: 'dustyOutskirts',
    levelCompleted,
    levelTwoCompleted: false,
    stage: levelCompleted ? 'clear' : 'intro',
    score: levelCompleted ? saveData.score : 0,
    health: levelCompleted ? saveData.health : MAX_HEALTH,
    maxHealth: MAX_HEALTH,
    coins: 0,
    heartIntroduced: false,
    coinProgress: { dropTarget: 0, dropped: 0, enemyDefeats: 0, defeatTargets: [] },
  }
}

export function createLevelOneSaveData(input: CreateLevelOneSaveDataInput): LevelOneSaveData {
  return {
    version: 3,
    savedAt: new Date().toISOString(),
    level: input.area === 'townRoad' ? 2 : 1,
    ...input,
  }
}

export function loadLevelOneSaveData(): LevelOneSaveData | null {
  try {
    const rawSaveData = localStorage.getItem(SAVE_KEY)
    if (rawSaveData === null) return null
    const parsedSaveData: unknown = JSON.parse(rawSaveData)
    if (isVersionThreeSaveData(parsedSaveData)) return parsedSaveData
    if (isVersionTwoSaveData(parsedSaveData)) return migrateVersionTwoSaveData(parsedSaveData)
    if (isVersionOneSaveData(parsedSaveData)) return migrateVersionOneSaveData(parsedSaveData)
  } catch {
    return null
  }
  return null
}
