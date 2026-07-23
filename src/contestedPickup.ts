import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH } from './constants'
import { LEVEL_TWO_CONFIG } from './levelTwo'
import type { ContestedPickupType, EnemyKind } from './types'

type ContestedPickupHooks = {
  getEnemies: () => Phaser.Physics.Arcade.Sprite[]
  getPlayer: () => Phaser.Physics.Arcade.Sprite
  spawnPickup: (
    type: ContestedPickupType,
    label: string,
    x: number,
    y: number,
  ) => Phaser.Physics.Arcade.Sprite
  applyEnemyPickup: (enemy: Phaser.Physics.Arcade.Sprite, type: ContestedPickupType) => void
  startGunslingerAttack: (enemy: Phaser.Physics.Arcade.Sprite, time: number) => void
}

const PICKUP_LABELS: Record<ContestedPickupType, string> = {
  coffee: 'COFFEE',
  ammo: 'AMMO',
  buckshot: 'BUCKSHOT',
  dynamite: 'DYNAMITE',
}

export class ContestedPickupController {
  private readonly scene: Phaser.Scene
  private readonly hooks: ContestedPickupHooks
  private nextLevelTwoPickup = 0
  private pendingContestedPickup = false
  private contestedPickup?: Phaser.Physics.Arcade.Sprite
  private primaryContender?: Phaser.Physics.Arcade.Sprite
  private contenderEnabledAt = 0
  private contenderInterceptUntil = 0
  private landingWarning?: Phaser.GameObjects.Arc
  private landingTimer?: Phaser.Time.TimerEvent

  constructor(scene: Phaser.Scene, hooks: ContestedPickupHooks) {
    this.scene = scene
    this.hooks = hooks
  }

  reset() {
    this.clear()
    this.nextLevelTwoPickup = 0
    this.contenderEnabledAt = 0
  }

  clear() {
    this.landingTimer?.remove(false)
    this.landingTimer = undefined
    this.destroyLandingWarning()
    this.pendingContestedPickup = false
    this.destroyContestedPickup()
    this.clearPrimaryContender()
    this.clearPickupHolds()
    this.contenderEnabledAt = 0
    this.contenderInterceptUntil = 0
  }

  updatePlan(time: number, defeatProgress: number) {
    if (this.contestedPickup?.active || this.pendingContestedPickup) return
    const plan = LEVEL_TWO_CONFIG.contestedPickup.plans[this.nextLevelTwoPickup]
    if (!plan || defeatProgress < plan.progress) return
    if (this.getEligibleContenders(plan.type).length === 0) return

    this.pendingContestedPickup = true
    const position = this.chooseLandingPosition()
    this.showLandingWarning(position.x, position.y)
    const { landingWarningMs, reactionDelayMs } = LEVEL_TWO_CONFIG.contestedPickup
    this.landingTimer = this.scene.time.delayedCall(landingWarningMs, () => {
      this.landingTimer = undefined
      this.destroyLandingWarning()
      if (!this.pendingContestedPickup) return

      this.contestedPickup = this.hooks.spawnPickup(
        plan.type,
        PICKUP_LABELS[plan.type],
        position.x,
        position.y,
      )
      this.contenderEnabledAt = time + landingWarningMs + reactionDelayMs
      this.pendingContestedPickup = false
      this.nextLevelTwoPickup += 1
      this.assignPrimaryContender(plan.type)
    })
  }

  updatePrimaryContender() {
    if (!this.contestedPickup?.active) return
    if (this.primaryContender?.active) {
      const marker = this.primaryContender.getData('contenderMarker') as Phaser.GameObjects.Text | undefined
      marker?.setPosition(this.primaryContender.x, this.primaryContender.y - 46)
      return
    }

    const type = this.contestedPickup.getData('type') as ContestedPickupType
    this.assignPrimaryContender(type)
  }

  updateEnemyMovement(enemy: Phaser.Physics.Arcade.Sprite, time: number) {
    const pickup = this.contestedPickup
    if (!pickup?.active || time < this.contenderEnabledAt) return false
    const type = pickup.getData('type') as ContestedPickupType
    if (!this.getEligibleContenders(type).includes(enemy)) return false

    const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, pickup.x, pickup.y)
    const isPrimary = enemy === this.primaryContender
    if (!isPrimary && distance > 52) return false

    if (this.shouldGunslingerIntercept(enemy, pickup, distance, isPrimary, time)) {
      const player = this.hooks.getPlayer()
      this.scene.physics.moveTo(
        enemy,
        (player.x + pickup.x) / 2,
        (player.y + pickup.y) / 2,
        LEVEL_TWO_CONFIG.enemy.gunslinger.speed,
      )
      const nextAttack = (enemy.getData('nextAttack') as number | undefined) ?? time
      if (!enemy.getData('busy') && time >= nextAttack) this.hooks.startGunslingerAttack(enemy, time)
      return true
    }

    if (distance <= LEVEL_TWO_CONFIG.contestedPickup.pickupDistance) {
      const holdUntil = enemy.getData('pickupHoldUntil') as number | undefined
      if (!holdUntil) {
        enemy.setData('pickupHoldUntil', time + LEVEL_TWO_CONFIG.contestedPickup.enemyPickupHoldMs)
        enemy.setVelocity(0, 0)
      } else if (time >= holdUntil && pickup.active) {
        this.hooks.applyEnemyPickup(enemy, type)
        this.destroyContestedPickup()
        this.clearPrimaryContender()
        this.clearPickupHolds()
        this.contenderEnabledAt = 0
        this.contenderInterceptUntil = 0
      }
      return true
    }

    enemy.setData('pickupHoldUntil', undefined)
    this.scene.physics.moveToObject(enemy, pickup, (enemy.getData('speed') as number) || 90)
    return true
  }

  handlePlayerCollected(pickup: Phaser.Physics.Arcade.Sprite) {
    if (pickup !== this.contestedPickup) return
    this.contestedPickup = undefined
    this.clearPrimaryContender()
    this.clearPickupHolds()
    this.contenderEnabledAt = 0
    this.contenderInterceptUntil = 0
  }

  handleEnemyRemoved(enemy: Phaser.Physics.Arcade.Sprite) {
    const marker = enemy.getData('contenderMarker') as Phaser.GameObjects.Text | undefined
    if (marker?.active) {
      this.scene.tweens.killTweensOf(marker)
      marker.destroy()
    }
    enemy.setData('contenderMarker', undefined)
    if (enemy === this.primaryContender) this.primaryContender = undefined
  }

  private chooseLandingPosition() {
    const { edgePadding, minPlayerDistance } = LEVEL_TWO_CONFIG.contestedPickup
    const player = this.hooks.getPlayer()
    let x = GAME_WIDTH / 2
    let y = GAME_HEIGHT / 2
    for (let attempt = 0; attempt < 12; attempt += 1) {
      const candidateX = Phaser.Math.Between(edgePadding, GAME_WIDTH - edgePadding)
      const candidateY = Phaser.Math.Between(edgePadding, GAME_HEIGHT - edgePadding)
      if (Phaser.Math.Distance.Between(candidateX, candidateY, player.x, player.y) >= minPlayerDistance) {
        x = candidateX
        y = candidateY
        break
      }
    }
    return { x, y }
  }

  private showLandingWarning(x: number, y: number) {
    this.destroyLandingWarning()
    this.landingWarning = this.scene.add.circle(x, y, 28, 0xffd166, 0.14)
      .setStrokeStyle(2, 0xffd166, 0.9).setDepth(3)
    this.scene.tweens.add({
      targets: this.landingWarning,
      scale: 1.35,
      duration: 180,
      yoyo: true,
      repeat: 2,
    })
  }

  private destroyLandingWarning() {
    if (!this.landingWarning) return
    this.scene.tweens.killTweensOf(this.landingWarning)
    this.landingWarning.destroy()
    this.landingWarning = undefined
  }

  private getEligibleContenders(type: ContestedPickupType) {
    const enemies = this.hooks.getEnemies()
    if ((type === 'ammo' || type === 'buckshot')
      && enemies.some((enemy) => enemy.active && enemy.getData('upgrade'))) return []

    return enemies.filter((enemy) => {
      if (!enemy.active || enemy.getData('busy') || enemy.getData('state') === 'charge' || enemy.getData('state') === 'telegraph') {
        return false
      }
      const kind = enemy.getData('kind') as EnemyKind
      return type === 'ammo' || type === 'buckshot'
        ? kind === 'gunslinger'
        : kind === 'chaser' || kind === 'charger'
    })
  }

  private assignPrimaryContender(type: ContestedPickupType) {
    const candidates = this.getEligibleContenders(type)
    if (candidates.length === 0) return

    this.primaryContender = Phaser.Utils.Array.GetRandom(candidates)
    this.contenderInterceptUntil = this.scene.time.now + LEVEL_TWO_CONFIG.contestedPickup.gunslingerInterceptMs
    const marker = this.scene.add.text(this.primaryContender.x, this.primaryContender.y - 46, '!', {
      fontFamily: 'monospace',
      fontSize: '24px',
      color: '#ffdf64',
      stroke: '#2b1d16',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(10)
    this.primaryContender.setData('contenderMarker', marker)
  }

  private shouldGunslingerIntercept(
    enemy: Phaser.Physics.Arcade.Sprite,
    pickup: Phaser.Physics.Arcade.Sprite,
    enemyDistance: number,
    isPrimary: boolean,
    time: number,
  ) {
    if (!isPrimary || enemy.getData('kind') !== 'gunslinger' || time >= this.contenderInterceptUntil) return false
    const player = this.hooks.getPlayer()
    const playerDistance = Phaser.Math.Distance.Between(player.x, player.y, pickup.x, pickup.y)
    return playerDistance < LEVEL_TWO_CONFIG.contestedPickup.minPlayerDistance
      && enemyDistance > LEVEL_TWO_CONFIG.contestedPickup.pickupDistance
  }

  private destroyContestedPickup() {
    const pickup = this.contestedPickup
    if (pickup?.active) {
      const glow = pickup.getData('glow') as Phaser.GameObjects.Image | undefined
      glow?.destroy()
      pickup.destroy()
    }
    this.contestedPickup = undefined
  }

  private clearPrimaryContender() {
    if (!this.primaryContender) return
    this.handleEnemyRemoved(this.primaryContender)
    this.primaryContender = undefined
  }

  private clearPickupHolds() {
    this.hooks.getEnemies().forEach((enemy) => {
      enemy.setData('pickupHoldUntil', undefined)
    })
  }
}
