export type PlayerFacing =
  | 'down'
  | 'down-right'
  | 'right'
  | 'up-right'
  | 'up'
  | 'up-left'
  | 'left'
  | 'down-left'

export type PlayerAnimationDirection =
  | 'down'
  | 'down-right'
  | 'right'
  | 'up-right'
  | 'up'

export function getPlayerFacing(
  vx: number,
  vy: number,
  fallback: PlayerFacing,
): PlayerFacing {
  const horizontal = Math.sign(vx)
  const vertical = Math.sign(vy)

  if (horizontal === 0 && vertical === 0) return fallback
  if (horizontal === 0) return vertical > 0 ? 'down' : 'up'
  if (vertical === 0) return horizontal > 0 ? 'right' : 'left'
  if (horizontal > 0) return vertical > 0 ? 'down-right' : 'up-right'
  return vertical > 0 ? 'down-left' : 'up-left'
}

export function getPlayerAnimationDirection(
  facing: PlayerFacing,
): PlayerAnimationDirection {
  if (facing === 'left') return 'right'
  if (facing === 'down-left') return 'down-right'
  if (facing === 'up-left') return 'up-right'
  return facing
}

export function shouldFlipPlayer(facing: PlayerFacing) {
  return facing === 'right' || facing === 'down-right' || facing === 'up-right'
}
