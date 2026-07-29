import assert from 'node:assert/strict'
import test from 'node:test'

const {
  getPlayerAnimationDirection,
  getPlayerFacing,
  shouldFlipPlayer,
} = await import(process.env.PLAYER_DIRECTION_MODULE)

test('selects all eight facings from movement velocity', () => {
  const cases = [
    { velocity: [0, 1], expected: 'down' },
    { velocity: [1, 1], expected: 'down-right' },
    { velocity: [1, 0], expected: 'right' },
    { velocity: [1, -1], expected: 'up-right' },
    { velocity: [0, -1], expected: 'up' },
    { velocity: [-1, -1], expected: 'up-left' },
    { velocity: [-1, 0], expected: 'left' },
    { velocity: [-1, 1], expected: 'down-left' },
  ]

  for (const { velocity: [vx, vy], expected } of cases) {
    assert.equal(getPlayerFacing(vx, vy, 'down'), expected)
  }
})

test('keeps the previous facing when velocity is zero', () => {
  assert.equal(getPlayerFacing(0, 0, 'up-left'), 'up-left')
})

test('maps left facings onto reusable right-side animation directions', () => {
  assert.equal(getPlayerAnimationDirection('left'), 'right')
  assert.equal(getPlayerAnimationDirection('down-left'), 'down-right')
  assert.equal(getPlayerAnimationDirection('up-left'), 'up-right')
  assert.equal(getPlayerAnimationDirection('up'), 'up')
})

test('flips right-side facings because the reusable sprite frames face left', () => {
  assert.equal(shouldFlipPlayer('right'), true)
  assert.equal(shouldFlipPlayer('down-right'), true)
  assert.equal(shouldFlipPlayer('up-right'), true)
  assert.equal(shouldFlipPlayer('left'), false)
  assert.equal(shouldFlipPlayer('down-left'), false)
  assert.equal(shouldFlipPlayer('up-left'), false)
  assert.equal(shouldFlipPlayer('down'), false)
  assert.equal(shouldFlipPlayer('up'), false)
})
