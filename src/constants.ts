export const GAME_WIDTH = 800
export const GAME_HEIGHT = 600

export const MAX_HEALTH = 3

export const PLAYER_SPEED = {
  normal: 220,
  boosted: 315,
} as const

export const BULLET_SPEED = 460

export const TIMING = {
  shootCooldown: 180,
  enemySpawnCooldown: 900,
  damageCooldown: 700,
  speedBoostDuration: 4500,
  shieldDuration: 7500,
  waveTransitionDelay: 750,
  heartPickupDelay: 700,
  pickupDelay: 1800,
  coinLifetime: 12000,
  coinExpiryWarning: 2500,
} as const
