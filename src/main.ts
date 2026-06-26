import Phaser from 'phaser'
import './style.css'
import {
  BULLET_SPEED,
  GAME_HEIGHT,
  GAME_WIDTH,
  MAX_HEALTH,
  PLAYER_SPEED,
  TIMING,
} from './constants'
import { LEVEL_ONE_CONFIG } from './levelOne'
import type { LevelOneSaveStage, PickupType } from './types'

class MainScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite
  private bullets!: Phaser.Physics.Arcade.Group
  private enemies!: Phaser.Physics.Arcade.Group
  private items!: Phaser.Physics.Arcade.Group

  private keys!: Record<string, Phaser.Input.Keyboard.Key>

  private score = 0
  private health: number = MAX_HEALTH
  private isStarted = false
  private isGameOver = false
  private isPaused = false
  private pauseStartedAt = 0

  private scoreText!: Phaser.GameObjects.Text
  private healthText!: Phaser.GameObjects.Text
  private heartIcons: Phaser.GameObjects.Image[] = []
  private shieldIcon!: Phaser.GameObjects.Image
  private shieldCountText!: Phaser.GameObjects.Text
  private waveText!: Phaser.GameObjects.Text
  private titleText!: Phaser.GameObjects.Text
  private startText!: Phaser.GameObjects.Text
  private tipText!: Phaser.GameObjects.Text
  private gameOverText!: Phaser.GameObjects.Text
  private pauseOverlay!: Phaser.GameObjects.Rectangle
  private pauseText!: Phaser.GameObjects.Text

  private lastShotTime = 0
  private lastSpawnTime = 0
  private lastDamageTime = 0

  private normalPlayerSpeed: number = PLAYER_SPEED.normal
  private boostedPlayerSpeed: number = PLAYER_SPEED.boosted
  private playerSpeed: number = PLAYER_SPEED.normal
  private speedBoostUntil = 0
  private speedBoostPulse?: Phaser.Tweens.Tween

  private levelStartTime = 0

  private wave = 1
  private enemiesToSpawn: number = LEVEL_ONE_CONFIG.initialEnemies
  private enemiesSpawned = 0
  private enemiesCleared = 0
  private isLevelClear = false

  private maxHealth: number = MAX_HEALTH
  private hasTakenDamage = false
  private currentWaveItem: PickupType | null = null
  private itemSpawnedThisWave = false
  private heartIntroduced = false
  private coffeeIntroduced = false
  private shieldIntroduced = false
  private finalPressureWaveDone = false

  private shieldCharges = 0
  private shieldUntil = 0
  private shieldAura?: Phaser.GameObjects.Image

  constructor() {
    super('MainScene')
  }

  create(data?: { autoStart?: boolean }) {
    this.resetGameState()
    this.createTextures()

    this.cameras.main.setBackgroundColor('#2b1d16')
    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT)

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH - 48, GAME_HEIGHT - 48, 0x6b4a2b)
      .setStrokeStyle(4, 0xd2a15f)

    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH - 88, GAME_HEIGHT - 88, 0x7b5734)
      .setStrokeStyle(2, 0x3a2414)

    this.player = this.physics.add.sprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'player')
    this.player.setCollideWorldBounds(true)
    this.player.setVisible(false)

    this.bullets = this.physics.add.group()
    this.enemies = this.physics.add.group()
    this.items = this.physics.add.group()

    this.scoreText = this.add.text(24, 20, 'Score: 0', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#ffe6a7',
    })

    this.healthText = this.add.text(24, 50, 'HP', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffb3a7',
      stroke: '#1e1611',
      strokeThickness: 3,
    })

    this.heartIcons = []
    for (let i = 0; i < this.maxHealth; i += 1) {
      const heart = this.add.image(66 + i * 26, 62, 'hpHeartFull')
      heart.setOrigin(0.5)
      this.heartIcons.push(heart)
    }

    const shieldX = 66 + this.maxHealth * 26 + 14
    this.shieldIcon = this.add.image(shieldX, 62, 'shieldItem')
    this.shieldIcon.setScale(0.72)
    this.shieldIcon.setVisible(false)

    this.shieldCountText = this.add.text(shieldX + 10, 50, '1', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#8cc7ff',
      stroke: '#1e1611',
      strokeThickness: 3,
    }).setVisible(false)

    this.updateHealthDisplay()

    this.waveText = this.add.text(GAME_WIDTH - 24, 20, 'Wave: 1', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#ffe6a7',
    }).setOrigin(1, 0).setVisible(false)

    this.titleText = this.add.text(GAME_WIDTH / 2, 210, 'PIXEL OUTLAW', {
      fontFamily: 'monospace',
      fontSize: '54px',
      color: '#ffe6a7',
      stroke: '#2b1d16',
      strokeThickness: 8,
    }).setOrigin(0.5)

    this.startText = this.add.text(GAME_WIDTH / 2, 300, 'START GAME', {
      fontFamily: 'monospace',
      fontSize: '30px',
      color: '#2b1d16',
      backgroundColor: '#f5c16c',
      padding: {
        x: 20,
        y: 10,
      },
    }).setOrigin(0.5)

    this.startText.setInteractive({ useHandCursor: true })

    this.tipText = this.add.text(GAME_WIDTH / 2, 370, 'Click START or press SPACE\nWASD move  |  Arrow keys shoot  |  ESC pause', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#f5c16c',
      align: 'center',
      lineSpacing: 10,
    }).setOrigin(0.5)

    this.gameOverText = this.add.text(GAME_WIDTH / 2, 280, '', {
      fontFamily: 'monospace',
      fontSize: '34px',
      color: '#ffe6a7',
      align: 'center',
      stroke: '#2b1d16',
      strokeThickness: 6,
    }).setOrigin(0.5)

    this.pauseOverlay = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.46)
    this.pauseOverlay.setDepth(100)
    this.pauseOverlay.setVisible(false)

    this.pauseText = this.add.text(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      'PAUSED\n\n[ESC] Continue\n[R] Restart Level\n[S] Save Progress & Quit',
      {
        fontFamily: 'monospace',
        fontSize: '28px',
        color: '#ffe6a7',
        align: 'center',
        stroke: '#2b1d16',
        strokeThickness: 6,
        lineSpacing: 10,
      },
    ).setOrigin(0.5)
    this.pauseText.setDepth(101)
    this.pauseText.setVisible(false)

    if (!this.input.keyboard) {
      throw new Error('Keyboard input is not available')
    }

    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,R,ESC') as Record<string, Phaser.Input.Keyboard.Key>

    this.startText.on('pointerdown', () => {
      this.startGame()
    })

    this.physics.add.overlap(this.player, this.enemies, (_playerObject, enemyObject) => {
      if (!this.isStarted || this.isGameOver) return

      const now = this.time.now
      const enemy = enemyObject as Phaser.Physics.Arcade.Sprite

      if (this.shieldCharges > 0) {
        const enemyX = enemy.x
        const enemyY = enemy.y

        this.clearShield()

        enemy.destroy()
        this.cameras.main.shake(80, 0.004)
        this.showBlockFlash()
        this.showFloatingText(enemyX, enemyY - 20, 'BLOCK')

        this.enemiesCleared += 1
        this.checkWaveProgress()
        return
      }

      if (now - this.lastDamageTime < TIMING.damageCooldown) return

      this.lastDamageTime = now
      this.hasTakenDamage = true
      this.health -= 1
      this.updateHealthDisplay()

      enemy.destroy()

      this.cameras.main.shake(120, 0.008)

      if (this.health <= 0) {
        this.endGame()
        return
      }

      this.enemiesCleared += 1
      this.checkWaveProgress()
    })

    this.physics.add.overlap(this.player, this.items, (_playerObject, itemObject) => {
      if (!this.isStarted || this.isGameOver) return

      const item = itemObject as Phaser.Physics.Arcade.Sprite
      const itemType = item.getData('type') as string
      const glow = item.getData('glow') as Phaser.GameObjects.Image | undefined

      glow?.destroy()
      item.destroy()

      if (itemType === 'coffee') {
        this.activateSpeedBoost(this.time.now)
      } else if (itemType === 'heart') {
        this.activateHeal()
      } else if (itemType === 'shield') {
        this.activateShield(this.time.now)
      }
    })

    if (data?.autoStart) {
      this.startGame()
    }

  }

  update(time: number, delta: number) {
    if (!this.isStarted) {
      this.handleStartInput()
      return
    }

    if (this.isGameOver) {
      this.handleRestartInput()
      return
    }

    this.handlePauseInput()

    if (this.isPaused) {
      this.handlePauseMenuInput()
      return
    }

    this.updateLevelOne(time)
    this.updateSpeedBoost(time)
    this.updateShield(time)
    this.handlePlayerMove()
    this.handleShooting(time)
    this.moveBullets(delta)
    this.spawnEnemies(time)
    this.moveEnemies()
    this.checkBulletEnemyHits()
    this.cleanBullets()
  }

  private resetGameState() {
    this.score = 0
    this.health = MAX_HEALTH
    this.isStarted = false
    this.isGameOver = false
    this.isPaused = false
    this.pauseStartedAt = 0

    this.lastShotTime = 0
    this.lastSpawnTime = 0
    this.lastDamageTime = 0
    
    this.playerSpeed = this.normalPlayerSpeed
    this.speedBoostUntil = 0
    this.speedBoostPulse = undefined
    this.levelStartTime = 0

    this.wave = 1
    this.enemiesToSpawn = LEVEL_ONE_CONFIG.initialEnemies
    this.enemiesSpawned = 0
    this.enemiesCleared = 0
    this.isLevelClear = false

    this.hasTakenDamage = false
    this.currentWaveItem = null
    this.itemSpawnedThisWave = false
    this.heartIntroduced = false
    this.coffeeIntroduced = false
    this.shieldIntroduced = false
    this.finalPressureWaveDone = false

    this.shieldCharges = 0
    this.shieldUntil = 0
    this.shieldAura = undefined
  }

  private handleStartInput() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
      this.startGame()
    }
  }

  private handlePauseInput() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.ESC)) {
      this.togglePause()
    }
  }

  private handlePauseMenuInput() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.R)) {
      this.restartCurrentLevel()
      return
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.S)) {
      this.saveAndQuit()
    }
  }

  private togglePause() {
    if (!this.isStarted || this.isGameOver) return

    if (this.isPaused) {
      this.resumeGame()
    } else {
      this.pauseGame()
    }
  }

  private pauseGame() {
    if (this.isPaused) return

    this.isPaused = true
    this.pauseStartedAt = Date.now()

    this.player.setVelocity(0, 0)
    this.enemies.getChildren().forEach((child) => {
      const enemy = child as Phaser.Physics.Arcade.Sprite
      enemy.setVelocity(0, 0)
    })

    this.physics.world.pause()
    this.time.paused = true
    this.tweens.pauseAll()

    this.pauseOverlay.setVisible(true)
    this.pauseText.setVisible(true)
  }

  private resumeGame() {
    if (!this.isPaused) return

    const pausedDuration = Date.now() - this.pauseStartedAt

    if (this.speedBoostUntil > 0) {
      this.speedBoostUntil += pausedDuration
    }

    if (this.shieldUntil > 0) {
      this.shieldUntil += pausedDuration
    }

    if (this.levelStartTime > 0) {
      this.levelStartTime += pausedDuration
    }

    this.isPaused = false
    this.pauseStartedAt = 0

    this.physics.world.resume()
    this.time.paused = false
    this.tweens.resumeAll()

    this.pauseOverlay.setVisible(false)
    this.pauseText.setVisible(false)
  }

  private prepareSceneChangeFromPause() {
    this.isPaused = false
    this.pauseStartedAt = 0

    this.physics.world.resume()
    this.time.paused = false
    this.tweens.resumeAll()

    this.pauseOverlay.setVisible(false)
    this.pauseText.setVisible(false)
  }

  private restartCurrentLevel() {
    this.prepareSceneChangeFromPause()
    this.scene.restart({ autoStart: true })
  }

  private getLevelOneSaveStage(): LevelOneSaveStage {
    if (this.isLevelClear && this.finalPressureWaveDone) {
      return 'clear'
    }

    if (this.currentWaveItem === 'heart') {
      return 'heart'
    }

    if (this.currentWaveItem === 'coffee') {
      return 'coffee'
    }

    if (this.currentWaveItem === 'shield') {
      return 'shield'
    }

    if (this.finalPressureWaveDone && this.currentWaveItem === null) {
      return 'final'
    }

    return 'intro'
  }

  private saveAndQuit() {
    const saveData = {
      version: 1,
      savedAt: new Date().toISOString(),
      level: 1,
      stage: this.getLevelOneSaveStage(),
      score: this.score,
      health: this.health,
    }

    localStorage.setItem('pixel-outlaw-save', JSON.stringify(saveData))

    this.prepareSceneChangeFromPause()
    this.scene.restart()
  }

  private handleRestartInput() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.R)) {
      this.scene.restart()
    }
  }

  private startGame() {
    if (this.isStarted) return

    this.isStarted = true
    this.levelStartTime = this.time.now
    this.waveText.setText(`Wave: ${this.wave}`)
    this.player.setVisible(true)
    this.titleText.setVisible(false)
    this.startText.setVisible(false)
    this.tipText.setVisible(false)
  }

  private endGame() {
    if (this.isPaused) {
      this.prepareSceneChangeFromPause()
    }

    this.isGameOver = true
    this.player.setVelocity(0, 0)
    this.stopSpeedBoostPulse()
    this.clearShield()

    this.enemies.clear(true, true)
    this.bullets.clear(true, true)
    this.clearItems()

    this.gameOverText.setText(`GAME OVER\nScore: ${this.score}\nPress R to restart`)
  }

    private updateLevelOne(time: number) {
    if (this.levelStartTime === 0 || this.isLevelClear) return
    if (!this.currentWaveItem || this.itemSpawnedThisWave) return

    const elapsed = time - this.levelStartTime
    const itemSpawnDelay = this.currentWaveItem === 'heart' ? TIMING.heartPickupDelay : TIMING.pickupDelay

    if (elapsed >= itemSpawnDelay) {
      this.spawnPickup(this.currentWaveItem, true)
      this.itemSpawnedThisWave = true
    }
  }


  private getPickupSpawnPosition(type: PickupType) {
    if (type === 'heart') {
      return {
        x: Phaser.Math.Between(GAME_WIDTH / 2 - 120, GAME_WIDTH / 2 + 120),
        y: Phaser.Math.Between(GAME_HEIGHT / 2 - 80, GAME_HEIGHT / 2 + 110),
      }
    }

    return {
      x: Phaser.Math.Between(110, GAME_WIDTH - 110),
      y: Phaser.Math.Between(110, GAME_HEIGHT - 110),
    }
  }

  private spawnPickup(type: PickupType, showLabel = true) {
    if (type === 'coffee') {
      this.coffeeIntroduced = true
      this.spawnCoffee(showLabel)
    } else if (type === 'heart') {
      this.heartIntroduced = true
      this.spawnHeart(showLabel)
    } else if (type === 'shield') {
      this.shieldIntroduced = true
      this.spawnShield(showLabel)
    }
  }

  private spawnCoffee(showLabel = true) {
    const { x, y } = this.getPickupSpawnPosition('coffee')
    this.spawnPickupSprite('coffee', 'coffee', 'COFFEE', x, y, showLabel)
  }

  private spawnHeart(showLabel = true, fixedRewardPosition = false) {
    const { x, y } = fixedRewardPosition
      ? { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2 + 90 }
      : this.getPickupSpawnPosition('heart')

    this.spawnPickupSprite('heart', 'heart', 'POTION', x, y, showLabel)
  }

  private spawnShield(showLabel = true) {
    const { x, y } = this.getPickupSpawnPosition('shield')
    this.spawnPickupSprite('shield', 'shieldItem', 'SHIELD', x, y, showLabel)
  }

  private spawnPickupSprite(
    type: PickupType,
    texture: string,
    label: string,
    x: number,
    y: number,
    showLabel: boolean,
  ) {
    const glow = this.add.image(x, y, 'itemGlow')
    glow.setAlpha(0.65)
    glow.setDepth(1)

    const pickup = this.physics.add.sprite(x, y, texture)
    pickup.setData('type', type)
    pickup.setData('glow', glow)
    pickup.setDepth(2)
    this.items.add(pickup)

    this.tweens.add({
      targets: [pickup, glow],
      y: y - 6,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    this.tweens.add({
      targets: glow,
      scale: 1.18,
      alpha: 0.32,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    if (showLabel) {
      this.showFloatingText(pickup.x, pickup.y - 30, label)
    }
  }

  private activateSpeedBoost(time: number) {
    this.playerSpeed = this.boostedPlayerSpeed
    this.speedBoostUntil = time + TIMING.speedBoostDuration

    this.startSpeedBoostPulse()
    this.showFloatingText(this.player.x, this.player.y - 34, 'SPEED UP')
  }



  private updateSpeedBoost(time: number) {
    if (this.speedBoostUntil === 0) return

    if (time >= this.speedBoostUntil) {
      this.playerSpeed = this.normalPlayerSpeed
      this.speedBoostUntil = 0
      this.stopSpeedBoostPulse()
    }
  }


  private showLevelCompleteText() {
    const text = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 90, 'DUSTY OUTSKIRTS CLEAR', {
      fontFamily: 'monospace',
      fontSize: '30px',
      color: '#fff0a3',
      stroke: '#2b1d16',
      strokeThickness: 6,
    }).setOrigin(0.5)

    text.setAlpha(0)
    text.setScale(0.92)

    this.tweens.add({
      targets: text,
      alpha: 1,
      scale: 1.05,
      y: text.y - 4,
      duration: 260,
      ease: 'Back.easeOut',
    })
  }

  private pulseHealthUi() {
    const targets: Phaser.GameObjects.GameObject[] = [
      this.healthText,
      ...this.heartIcons,
    ]

    this.tweens.killTweensOf(targets)

    this.healthText.setScale(1)
    this.heartIcons.forEach((heart) => {
      heart.clearTint()
      heart.setScale(1)
    })

    this.tweens.add({
      targets,
      scale: 1.16,
      duration: 120,
      yoyo: true,
      repeat: 1,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.healthText.setScale(1)
        this.heartIcons.forEach((heart) => heart.setScale(1))

        if (this.speedBoostUntil > 0) {
          this.startSpeedBoostPulse()
        }
      },
    })
  }


  private startSpeedBoostPulse() {
    const targets: Phaser.GameObjects.GameObject[] = [
      this.healthText,
      ...this.heartIcons,
    ]

    this.tweens.killTweensOf(targets)

    this.healthText.setScale(1)
    this.heartIcons.forEach((heart) => heart.setScale(1))

    this.speedBoostPulse = this.tweens.add({
      targets,
      scale: 1.08,
      duration: 260,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  private stopSpeedBoostPulse() {
    const targets: Phaser.GameObjects.GameObject[] = [
      this.healthText,
      ...this.heartIcons,
    ]

    this.speedBoostPulse?.stop()
    this.speedBoostPulse = undefined

    this.tweens.killTweensOf(targets)

    this.healthText.setScale(1)
    this.heartIcons.forEach((heart) => heart.setScale(1))
  }

  private updateHealthDisplay() {
    this.heartIcons.forEach((heart, index) => {
      heart.setTexture(index < this.health ? 'hpHeartFull' : 'hpHeartEmpty')
    })
  }

  private activateHeal() {
    if (this.health < this.maxHealth) {
      this.health += 1
      this.updateHealthDisplay()
      this.showFloatingText(this.player.x, this.player.y - 34, 'HP +1')
    } else {
      this.showFloatingText(this.player.x, this.player.y - 34, 'FULL HP')
    }

    this.pulseHealthUi()
  }


  private activateShield(time: number) {
    this.shieldCharges = 1
    this.shieldUntil = time + TIMING.shieldDuration

    this.updateShieldStatus()
    this.startShieldAura()

    this.showFloatingText(this.player.x, this.player.y - 34, 'SHIELD +1')
  }


  private updateShieldStatus() {
    if (this.shieldCharges > 0) {
      this.shieldIcon.setVisible(true)
      this.shieldCountText.setText(`${this.shieldCharges}`)
      this.shieldCountText.setVisible(true)

      this.tweens.killTweensOf([this.shieldIcon, this.shieldCountText])

      this.shieldIcon.setScale(0.72)
      this.shieldCountText.setScale(1)

      this.tweens.add({
        targets: this.shieldIcon,
        scale: 0.9,
        duration: 160,
        yoyo: true,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.shieldIcon.setScale(0.72)
        },
      })

      this.tweens.add({
        targets: this.shieldCountText,
        scale: 1.18,
        duration: 160,
        yoyo: true,
        ease: 'Back.easeOut',
        onComplete: () => {
          this.shieldCountText.setScale(1)
        },
      })
    } else {
      this.shieldIcon.setVisible(false)
      this.shieldCountText.setVisible(false)
    }
  }


  private showBlockFlash() {
    const flash = this.add.image(this.player.x, this.player.y, 'shieldAura')
    flash.setDepth(3)
    flash.setAlpha(0.82)
    flash.setScale(0.85)

    this.tweens.add({
      targets: flash,
      scale: 1.45,
      alpha: 0,
      duration: 260,
      ease: 'Quad.easeOut',
      onComplete: () => {
        flash.destroy()
      },
    })
  }


  private startShieldAura() {
    if (this.shieldAura && this.shieldAura.active) {
      this.tweens.killTweensOf(this.shieldAura)
      this.shieldAura.destroy()
    }

    this.shieldAura = this.add.image(this.player.x, this.player.y, 'shieldAura')
    this.shieldAura.setDepth(2.5)
    this.shieldAura.setAlpha(0.58)
    this.shieldAura.setScale(0.9)

    this.tweens.add({
      targets: this.shieldAura,
      scale: 1.12,
      alpha: 0.34,
      duration: 520,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  private updateShield(time: number) {
    if (this.shieldCharges <= 0 || this.shieldUntil === 0) return

    const remaining = this.shieldUntil - time

    if (remaining <= 0) {
      this.clearShield()
      return
    }

    if (this.shieldAura && this.shieldAura.active) {
      this.shieldAura.setPosition(this.player.x, this.player.y)
    }

    let shouldShow = true

    if (remaining < 2500) {
      const progress = 1 - remaining / 2500
      const blinkInterval = Phaser.Math.Linear(240, 65, progress)
      shouldShow = Math.floor(time / blinkInterval) % 2 === 0
    }

    this.shieldIcon.setVisible(shouldShow)
    this.shieldCountText.setVisible(shouldShow)

    if (this.shieldAura && this.shieldAura.active) {
      this.shieldAura.setVisible(shouldShow)
    }
  }

  private clearShield() {
    this.shieldCharges = 0
    this.shieldUntil = 0

    this.shieldIcon.setVisible(false)
    this.shieldCountText.setVisible(false)

    if (this.shieldAura && this.shieldAura.active) {
      this.tweens.killTweensOf(this.shieldAura)
      this.shieldAura.destroy()
    }

    this.shieldAura = undefined
  }


  private showFloatingText(x: number, y: number, text: string) {
    const popup = this.add.text(x, y, text, {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#b8f28b',
      stroke: '#1e1611',
      strokeThickness: 3,
    }).setOrigin(0.5)

    this.tweens.add({
      targets: popup,
      y: y - 24,
      alpha: 0,
      duration: 700,
      ease: 'Quad.easeOut',
      onComplete: () => {
        popup.destroy()
      },
    })
  }

  private clearItems() {
    this.items.getChildren().forEach((child) => {
      const item = child as Phaser.Physics.Arcade.Sprite
      const glow = item.getData('glow') as Phaser.GameObjects.Image | undefined

      glow?.destroy()
      item.destroy()
    })
  }

  private handlePlayerMove() {
    const speed = this.playerSpeed
    let vx = 0
    let vy = 0

    if (this.keys.A.isDown) vx -= speed
    if (this.keys.D.isDown) vx += speed
    if (this.keys.W.isDown) vy -= speed
    if (this.keys.S.isDown) vy += speed

    this.player.setVelocity(vx, vy)

    if (vx !== 0 && vy !== 0) {
      this.player.body?.velocity.normalize().scale(speed)
    }
  }

  private handleShooting(time: number) {
    const shootCooldown = TIMING.shootCooldown

    if (time - this.lastShotTime < shootCooldown) return

    const bulletSpeed = BULLET_SPEED
    let dx = 0
    let dy = 0

    if (this.keys.LEFT.isDown) dx -= 1
    if (this.keys.RIGHT.isDown) dx += 1
    if (this.keys.UP.isDown) dy -= 1
    if (this.keys.DOWN.isDown) dy += 1

    if (dx === 0 && dy === 0) return

    const length = Math.hypot(dx, dy)
    const normalizedDx = dx / length
    const normalizedDy = dy / length

    const vx = normalizedDx * bulletSpeed
    const vy = normalizedDy * bulletSpeed

    this.lastShotTime = time

    const spawnOffset = 22
    const bullet = this.physics.add.image(
      this.player.x + normalizedDx * spawnOffset,
      this.player.y + normalizedDy * spawnOffset,
      'bullet',
    )

    bullet.setData('vx', vx)
    bullet.setData('vy', vy)
    this.bullets.add(bullet)
  }

  private moveBullets(delta: number) {
    const seconds = delta / 1000

    this.bullets.getChildren().forEach((child) => {
      const bullet = child as Phaser.Physics.Arcade.Image
      if (!bullet.active) return

      const vx = bullet.getData('vx') as number
      const vy = bullet.getData('vy') as number

      bullet.x += vx * seconds
      bullet.y += vy * seconds
    })
  }

  private checkBulletEnemyHits() {
    this.bullets.getChildren().forEach((bulletChild) => {
      const bullet = bulletChild as Phaser.Physics.Arcade.Image
      if (!bullet.active) return

      this.enemies.getChildren().forEach((enemyChild) => {
        const enemy = enemyChild as Phaser.Physics.Arcade.Sprite
        if (!enemy.active || !bullet.active) return

        const distance = Phaser.Math.Distance.Between(bullet.x, bullet.y, enemy.x, enemy.y)

        if (distance < 24) {
          const enemyX = enemy.x
          const enemyY = enemy.y

          bullet.destroy()
          enemy.destroy()

          this.addScore(10, enemyX, enemyY)
          this.enemiesCleared += 1
          this.checkWaveProgress()
        }
      })
    })
  }

  private checkWaveProgress() {
    if (this.isLevelClear) return
    if (this.enemiesCleared < this.enemiesToSpawn) return

    this.isLevelClear = true

    this.time.delayedCall(TIMING.waveTransitionDelay, () => {
      if (this.isGameOver) return
      this.startNextLevelOneWave()
    })
  }


  private startNextLevelOneWave() {
    if (this.hasTakenDamage && !this.heartIntroduced) {
      this.startLevelOneWave('heart', LEVEL_ONE_CONFIG.heartEnemies)
      return
    }

    if (!this.coffeeIntroduced) {
      this.startLevelOneWave('coffee', LEVEL_ONE_CONFIG.coffeeEnemies)
      return
    }

    if (!this.shieldIntroduced) {
      this.startLevelOneWave('shield', LEVEL_ONE_CONFIG.shieldEnemies)
      return
    }

    if (!this.finalPressureWaveDone) {
      this.finalPressureWaveDone = true
      this.startLevelOneWave(null, LEVEL_ONE_CONFIG.finalEnemies)
      return
    }

    this.finishLevelOne()
  }

  private startLevelOneWave(item: PickupType | null, enemiesToSpawn: number) {
    this.clearItems()

    this.wave += 1
    this.enemiesToSpawn = enemiesToSpawn
    this.enemiesSpawned = 0
    this.enemiesCleared = 0
    this.isLevelClear = false
    this.currentWaveItem = item
    this.itemSpawnedThisWave = false
    this.levelStartTime = this.time.now
    this.lastSpawnTime = 0

    this.waveText.setText(`Wave: ${this.wave}`)
  }

  private finishLevelOne() {
    this.clearItems()
    this.currentWaveItem = null
    this.itemSpawnedThisWave = false
    this.isLevelClear = true

    this.showLevelCompleteText()

    this.time.delayedCall(1000, () => {
      if (this.isGameOver) return

      this.spawnHeart(true, true)
      this.showFloatingText(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, 'SUPPLY DROP')
    })
  }

  private addScore(basePoints: number, x: number, y: number) {
    const isCritical = Math.random() < 0.05  //概率暴击
    const finalPoints = isCritical ? 15 : basePoints

    this.score += finalPoints
    this.scoreText.setText(`Score: ${this.score}`)
    this.showScorePopup(x, y, finalPoints, isCritical)
  }

  private showScorePopup(x: number, y: number, points: number, isCritical: boolean) {
    const popup = this.add.text(x, y, isCritical ? `+${points}!` : `+${points}`, {
      fontFamily: 'monospace',
      fontSize: isCritical ? '24px' : '18px',
      color: isCritical ? '#ff5a3d' : '#ffe6a7',
      stroke: '#2b1d16',
      strokeThickness: isCritical ? 5 : 3,
    }).setOrigin(0.5)

    popup.setScale(isCritical ? 1.2 : 1)

    this.tweens.add({
      targets: popup,
      y: y - (isCritical ? 42 : 28),
      alpha: 0,
      scale: isCritical ? 1.55 : 1.1,
      duration: isCritical ? 650 : 500,
      ease: 'Quad.easeOut',
      onComplete: () => {
        popup.destroy()
      },
    })
  }

  private spawnEnemies(time: number) {
    const spawnCooldown = TIMING.enemySpawnCooldown

    if (this.isLevelClear || this.enemiesSpawned >= this.enemiesToSpawn) return
    if (time - this.lastSpawnTime < spawnCooldown) return
    this.lastSpawnTime = time

    const side = Phaser.Math.Between(0, 3)
    let x = 0
    let y = 0

    if (side === 0) {
      x = Phaser.Math.Between(40, GAME_WIDTH - 40)
      y = 40
    } else if (side === 1) {
      x = GAME_WIDTH - 40
      y = Phaser.Math.Between(40, GAME_HEIGHT - 40)
    } else if (side === 2) {
      x = Phaser.Math.Between(40, GAME_WIDTH - 40)
      y = GAME_HEIGHT - 40
    } else {
      x = 40
      y = Phaser.Math.Between(40, GAME_HEIGHT - 40)
    }

    const enemy = this.physics.add.sprite(x, y, 'enemy')

    const elapsed = this.levelStartTime > 0 ? time - this.levelStartTime : 0
    const preItemPressure = this.currentWaveItem === 'coffee' && !this.itemSpawnedThisWave && elapsed >= 1200 ? 12 : 0
    const finalWavePressure = this.finalPressureWaveDone && this.currentWaveItem === null ? 14 : 0

    enemy.setData('speed', Phaser.Math.Between(70, 105) + preItemPressure + finalWavePressure)
    this.enemies.add(enemy)
    this.enemiesSpawned += 1
  }

  private moveEnemies() {
    this.enemies.getChildren().forEach((child) => {
      const enemy = child as Phaser.Physics.Arcade.Sprite
      if (!enemy.active) return

      const speed = enemy.getData('speed') as number
      this.physics.moveToObject(enemy, this.player, speed)
    })
  }

  private cleanBullets() {
    this.bullets.getChildren().forEach((child) => {
      const bullet = child as Phaser.Physics.Arcade.Image
      if (!bullet.active) return

      const outOfWorld =
        bullet.x < -20 ||
        bullet.x > GAME_WIDTH + 20 ||
        bullet.y < -20 ||
        bullet.y > GAME_HEIGHT + 20

      if (outOfWorld) {
        bullet.destroy()
      }
    })
  }

  private createTextures() {
    const g = this.make.graphics({ x: 0, y: 0 }, false)

    g.fillStyle(0xc68642)
    g.fillRect(4, 6, 20, 20)
    g.fillStyle(0x3b2414)
    g.fillRect(2, 2, 24, 8)
    g.fillStyle(0xf7d08a)
    g.fillRect(8, 10, 12, 10)
    g.fillStyle(0x1e1611)
    g.fillRect(9, 13, 3, 3)
    g.fillRect(16, 13, 3, 3)
    g.generateTexture('player', 28, 28)
    g.clear()

    g.fillStyle(0x7d2f2f)
    g.fillRect(4, 4, 22, 22)
    g.fillStyle(0xffd36b)
    g.fillRect(8, 10, 4, 4)
    g.fillRect(18, 10, 4, 4)
    g.fillStyle(0x3a1010)
    g.fillRect(9, 20, 12, 3)
    g.generateTexture('enemy', 30, 30)
    g.clear()

    g.fillStyle(0xffe066)
    g.fillCircle(5, 5, 5)
    g.generateTexture('bullet', 10, 10)
    g.clear()

    g.fillStyle(0xfff0a3, 0.28)
    g.fillCircle(18, 18, 16)
    g.lineStyle(2, 0xffd166, 0.85)
    g.strokeCircle(18, 18, 13)
    g.generateTexture('itemGlow', 36, 36)
    g.clear()

    g.fillStyle(0xffd166)
    g.fillRect(4, 7, 20, 18)

    g.fillStyle(0x8b5a2b)
    g.fillRect(6, 9, 16, 14)

    g.fillStyle(0xf5c16c)
    g.fillRect(8, 6, 12, 4)

    g.fillStyle(0xffffff)
    g.fillRect(21, 11, 5, 7)

    g.fillStyle(0x3a2414)
    g.fillRect(9, 12, 10, 7)

    g.fillStyle(0xfff0a3)
    g.fillRect(10, 4, 3, 2)
    g.fillRect(15, 4, 3, 2)

    g.generateTexture('coffee', 30, 30)
    g.clear()

    g.fillStyle(0xc92f2f)
    g.fillRect(9, 6, 12, 20)
    g.fillStyle(0xffb3b3)
    g.fillRect(11, 3, 8, 4)
    g.fillStyle(0xffffff)
    g.fillRect(13, 11, 4, 10)
    g.fillRect(10, 14, 10, 4)
    g.fillStyle(0x6b1515)
    g.fillRect(11, 22, 8, 3)
    g.generateTexture('heart', 30, 30)
    g.clear()

    g.fillStyle(0x8cc7ff)
    g.fillRect(8, 5, 14, 6)
    g.fillStyle(0x3d78c2)
    g.fillRect(6, 10, 18, 10)
    g.fillStyle(0x2d4f8f)
    g.fillRect(9, 20, 12, 5)
    g.fillStyle(0xffe6a7)
    g.fillRect(13, 10, 4, 10)
    g.fillRect(10, 13, 10, 4)
    g.generateTexture('shieldItem', 30, 30)
    g.clear()

    g.lineStyle(3, 0x8cc7ff, 0.75)
    g.strokeCircle(18, 18, 15)
    g.lineStyle(2, 0xffffff, 0.42)
    g.strokeCircle(18, 18, 11)
    g.generateTexture('shieldAura', 36, 36)
    g.clear()

    g.fillStyle(0xff4b4b)
    g.fillRect(5, 4, 5, 5)
    g.fillRect(12, 4, 5, 5)
    g.fillRect(3, 8, 16, 6)
    g.fillRect(5, 14, 12, 4)
    g.fillRect(8, 18, 6, 3)
    g.generateTexture('hpHeartFull', 22, 22)
    g.clear()

    g.fillStyle(0xff4b4b)
    g.fillRect(5, 4, 5, 5)
    g.fillRect(12, 4, 5, 5)
    g.fillRect(3, 8, 16, 6)
    g.fillRect(5, 14, 12, 4)
    g.fillRect(8, 18, 6, 3)

    g.fillStyle(0x1e1611)
    g.fillRect(6, 6, 3, 3)
    g.fillRect(13, 6, 3, 3)
    g.fillRect(5, 9, 12, 4)
    g.fillRect(7, 14, 8, 3)
    g.fillRect(9, 18, 4, 2)
    g.generateTexture('hpHeartEmpty', 22, 22)
    g.clear()

    g.destroy()
  }
}

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'app',
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  scene: MainScene,
}

new Phaser.Game(config)
