import { MAX_HEALTH } from './constants'
import type { AreaId } from './types'

export type RunProgress = {
  score: number
  coins: number
  health: number
  maxHealth: number
  progression: {
    completedThrough: number
  }
}

export type LevelEntryCheckpoint = {
  level: number
  area: AreaId
  progress: RunProgress
}

export type SceneStartData =
  | { mode: 'title' }
  | { mode: 'newRun'; autoStart: true }
  | { mode: 'restartLevel'; checkpoint: LevelEntryCheckpoint }

export function createInitialRunProgress(): RunProgress {
  return {
    score: 0,
    coins: 0,
    health: MAX_HEALTH,
    maxHealth: MAX_HEALTH,
    progression: {
      completedThrough: 0,
    },
  }
}

export function createLevelEntryCheckpoint(
  level: number,
  area: AreaId,
  progress: RunProgress,
): LevelEntryCheckpoint {
  return {
    level,
    area,
    progress: cloneRunProgress(progress),
  }
}

export function createInitialLevelCheckpoint() {
  return createLevelEntryCheckpoint(1, 'dustyOutskirts', createInitialRunProgress())
}

export function cloneLevelCheckpoint(checkpoint: LevelEntryCheckpoint): LevelEntryCheckpoint {
  return createLevelEntryCheckpoint(checkpoint.level, checkpoint.area, checkpoint.progress)
}

export function cloneRunProgress(progress: RunProgress): RunProgress {
  return {
    ...progress,
    progression: { ...progress.progression },
  }
}
