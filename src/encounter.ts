import { expandBatch, type LevelTwoBatch } from './levelTwo'
import type { EnemyKind } from './types'

export class ContinuousEncounter {
  private readonly batches: readonly LevelTwoBatch[]
  private readonly spawnInterval: number
  private readonly nextBatchDelay: number
  private readonly nextBatchDefeatRatio: number
  private running = false
  private batchIndex = -1
  private queue: EnemyKind[] = []
  private batchTotal = 0
  private batchDefeated = 0
  private lastSpawnAt = 0
  private batchFullySpawnedAt = 0

  constructor(
    batches: readonly LevelTwoBatch[],
    spawnInterval: number,
    nextBatchDelay: number,
    nextBatchDefeatRatio: number,
  ) {
    this.batches = batches
    this.spawnInterval = spawnInterval
    this.nextBatchDelay = nextBatchDelay
    this.nextBatchDefeatRatio = nextBatchDefeatRatio
  }

  start(now: number) {
    this.reset()
    this.running = true
    this.activateNextBatch(now)
  }

  stop() {
    this.running = false
    this.queue = []
  }

  reset() {
    this.running = false
    this.batchIndex = -1
    this.queue = []
    this.batchTotal = 0
    this.batchDefeated = 0
    this.lastSpawnAt = 0
    this.batchFullySpawnedAt = 0
  }

  update(now: number, alive: number): EnemyKind | null {
    if (!this.running) return null

    this.maybeActivateNextBatch(now)
    const batch = this.batches[this.batchIndex]
    if (!batch || this.queue.length === 0 || alive >= batch.aliveCap) return null
    if (now - this.lastSpawnAt < this.spawnInterval) return null

    this.lastSpawnAt = now
    const next = this.queue.shift() ?? null
    if (this.queue.length === 0) this.batchFullySpawnedAt = now
    return next
  }

  registerDefeat(batchIndex: number) {
    if (!this.running || batchIndex !== this.batchIndex) return
    this.batchDefeated += 1
  }

  isComplete(alive: number) {
    return this.running
      && this.batchIndex === this.batches.length - 1
      && this.queue.length === 0
      && alive === 0
  }

  getCurrentBatchIndex() {
    return this.batchIndex
  }

  private maybeActivateNextBatch(now: number) {
    if (this.queue.length > 0 || this.batchIndex >= this.batches.length - 1) return
    if (this.batchFullySpawnedAt === 0) return

    const elapsed = now - this.batchFullySpawnedAt
    const defeatRatio = this.batchTotal === 0 ? 0 : this.batchDefeated / this.batchTotal
    if (elapsed >= this.nextBatchDelay || defeatRatio >= this.nextBatchDefeatRatio) {
      this.activateNextBatch(now)
    }
  }

  private activateNextBatch(now: number) {
    this.batchIndex += 1
    const batch = this.batches[this.batchIndex]
    if (!batch) return

    this.queue.push(...expandBatch(batch))
    this.batchTotal = this.queue.length
    this.batchDefeated = 0
    this.batchFullySpawnedAt = 0
    this.lastSpawnAt = now - this.spawnInterval
  }
}
