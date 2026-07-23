import type { ContestedPickupType, EnemyKind } from './types'

export type LevelTwoBatch = {
  chasers: number
  chargers: number
  gunslingers: number
  aliveCap: number
}

export type PlannedPickup = {
  type: ContestedPickupType
  progress: number
}

export const LEVEL_TWO_CONFIG = {
  batches: [
    { chasers: 12, chargers: 0, gunslingers: 0, aliveCap: 10 },
    { chasers: 14, chargers: 1, gunslingers: 0, aliveCap: 12 },
    { chasers: 14, chargers: 1, gunslingers: 1, aliveCap: 14 },
    { chasers: 12, chargers: 2, gunslingers: 1, aliveCap: 16 },
    { chasers: 16, chargers: 2, gunslingers: 2, aliveCap: 18 },
  ] satisfies LevelTwoBatch[],
  spawnInterval: 600,
  nextBatchDelay: 2500,
  nextBatchDefeatRatio: 0.65,
  enemy: {
    chaser: { health: 1, speed: [82, 112] as const },
    charger: {
      health: 2,
      speed: 92,
      prepareDistance: 230,
      telegraphMs: 700,
      chargeSpeed: 330,
      chargeMs: 720,
      recoverMs: 650,
      coffeeSpeedMultiplier: 1.22,
      coffeeRecoveryMultiplier: 0.72,
    },
    gunslinger: {
      health: 2,
      speed: 88,
      preferredDistance: 285,
      distanceTolerance: 55,
      attackCooldown: 2400,
      telegraphMs: 520,
      shotGapMs: 150,
      bulletSpeed: 250,
      bulletDamage: 1,
      predictionMs: 240,
      adaptiveObserveMs: 220,
      adaptiveRetargetMs: 100,
      finalAttackOffset: [0, 550] as const,
    },
  },
  playerBuffs: {
    ammoDuration: 6000,
    ammoShootCooldown: 95,
    buckshotDuration: 6000,
    buckshotSpreadDegrees: 16,
    dynamiteCharges: 4,
    dynamiteRadius: 76,
    dynamiteDamage: 1,
  },
  explosion: {
    radius: 92,
    warningMs: 500,
    proximity: 92,
  },
  contestedPickup: {
    landingWarningMs: 650,
    reactionDelayMs: 450,
    gunslingerInterceptMs: 700,
    enemyPickupHoldMs: 320,
    pickupDistance: 25,
    minPlayerDistance: 150,
    edgePadding: 130,
    plans: [
      { type: 'coffee', progress: 0.08 },
      { type: 'dynamite', progress: 0.18 },
      { type: 'ammo', progress: 0.31 },
      { type: 'buckshot', progress: 0.43 },
      { type: 'coffee', progress: 0.54 },
      { type: 'dynamite', progress: 0.63 },
      { type: 'ammo', progress: 0.72 },
      { type: 'buckshot', progress: 0.81 },
      { type: 'dynamite', progress: 0.90 },
      { type: 'coffee', progress: 0.95 },
    ] satisfies PlannedPickup[],
  },
  heartDrop: {
    cooldownMs: [8000, 12000] as const,
    cooldownKills: [4, 6] as const,
    chanceByHealth: [0, 0.42, 0.18, 0] as const,
    mercyCooldownMs: 1800,
    mercyKills: 1,
    mercyChance: 0.65,
    mercyAttempts: 3,
  },
  shieldProgress: 0.84,
  coinDropChance: 0.16,
  completionRewardHealth: 1,
} as const

export function expandBatch(batch: LevelTwoBatch): EnemyKind[] {
  return [
    ...Array<EnemyKind>(batch.chasers).fill('chaser'),
    ...Array<EnemyKind>(batch.chargers).fill('charger'),
    ...Array<EnemyKind>(batch.gunslingers).fill('gunslinger'),
  ]
}

export const LEVEL_TWO_TOTAL_ENEMIES = LEVEL_TWO_CONFIG.batches.reduce(
  (total, batch) => total + batch.chasers + batch.chargers + batch.gunslingers,
  0,
)
