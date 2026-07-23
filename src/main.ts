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
import { ContestedPickupController } from './contestedPickup'
import { LEVEL_ONE_CONFIG } from './levelOne'
import { ContinuousEncounter } from './encounter'
import { LEVEL_TWO_CONFIG, LEVEL_TWO_TOTAL_ENEMIES } from './levelTwo'
import { createLevelOneSaveData, loadLevelOneSaveData, SAVE_KEY } from './save'
import { createTextures } from './textures'
import { TownRoadFlow } from './townRoadFlow'
import type { LevelOneSaveData } from './save'
import type { AreaId, ContestedPickupType, EnemyKind, GunslingerUpgrade, PickupType } from './types'

class MainScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite
  private bullets!: Phaser.Physics.Arcade.Group
  private enemyBullets!: Phaser.Physics.Arcade.Group
  private enemies!: Phaser.Physics.Arcade.Group
  private items!: Phaser.Physics.Arcade.Group
  private coinPickups!: Phaser.Physics.Arcade.Group

  private keys!: Record<string, Phaser.Input.Keyboard.Key>

  private score = 0
  private coinCount = 0
  private health: number = MAX_HEALTH
  private isStarted = false
  private isGameOver = false
  private levelCompleted = false
  private isPaused = false
  private pauseStartedAt = 0

  private scoreText!: Phaser.GameObjects.Text
  private coinIcon!: Phaser.GameObjects.Image
  private coinText!: Phaser.GameObjects.Text
  private healthText!: Phaser.GameObjects.Text
  private heartIcons: Phaser.GameObjects.Image[] = []
  private shieldIcon!: Phaser.GameObjects.Image
  private shieldCountText!: Phaser.GameObjects.Text
  private waveText!: Phaser.GameObjects.Text
  private titleText!: Phaser.GameObjects.Text
  private startText!: Phaser.GameObjects.Text
  private continueText?: Phaser.GameObjects.Text
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

  private levelOneCoinDropTarget = 0
  private levelOneCoinsDropped = 0
  private levelOneEnemyDefeats = 0
  private levelOneCoinDropDefeatTargets: number[] = []

  private shieldCharges = 0
  private shieldUntil = 0
  private shieldAura?: Phaser.GameObjects.Image

  private currentArea: AreaId = 'dustyOutskirts'
  private isAreaExitOpen = false
  private isAreaTransitioning = false
  private areaTransitionReadyAt = 0
  private areaBackgroundObjects: Phaser.GameObjects.GameObject[] = []
  private exitMarkerObjects: Phaser.GameObjects.GameObject[] = []
  private areaTitleObjects: Phaser.GameObjects.GameObject[] = []
  private levelCompleteText?: Phaser.GameObjects.Text
  private savedGame: LevelOneSaveData | null = null
  private levelTwoEncounter = new ContinuousEncounter(
    LEVEL_TWO_CONFIG.batches,
    LEVEL_TWO_CONFIG.spawnInterval,
    LEVEL_TWO_CONFIG.nextBatchDelay,
    LEVEL_TWO_CONFIG.nextBatchDefeatRatio,
  )
  private levelTwoCompleted = false
  private townRoadFlow = new TownRoadFlow(this)
  private levelTwoDefeats = 0
  private contestedPickupFlow = new ContestedPickupController(this, {
    getEnemies: () => this.enemies.getChildren().map((child) => child as Phaser.Physics.Arcade.Sprite),
    getPlayer: () => this.player,
    spawnPickup: (type, label, x, y) => this.spawnPickupSprite(type, type, label, x, y, true),
    applyEnemyPickup: (enemy, type) => this.applyEnemyPickup(enemy, type),
    startGunslingerAttack: (enemy, time) => this.startGunslingerAttack(enemy, time),
  })
  private weaponMode: GunslingerUpgrade | null = null
  private weaponModeUntil = 0
  private dynamiteCharges = 0
  private shotActionId = 0
  private explosiveActions = new Set<number>()
  private adaptiveSecondBusy = false
  private heartDropReadyAt = 0
  private heartDropKillsRemaining = 0
  private mercyDropAttempts = 0
  private mercyArmed = false
  private levelTwoShieldSpawned = false
  private finalGunslingersSpawned = 0
  private chargerIntroducedThisRun = false
  private gunslingerIntroducedThisRun = false
  private townCheckpoint = { score: 0, health: MAX_HEALTH, coins: 0, maxHealth: MAX_HEALTH }

  constructor() {
    super('MainScene')
  }

  create(data?: { autoStart?: boolean; townCheckpoint?: { score: number; health: number; coins: number; maxHealth: number } }) {
    this.resetGameState()
    this.savedGame = loadLevelOneSaveData()
    createTextures(this)

    this.cameras.main.setBackgroundColor('#2b1d16')
    this.physics.world.setBounds(0, 0, GAME_WIDTH, GAME_HEIGHT)

    this.drawDustyOutskirtsBackground()

    this.player = this.physics.add.sprite(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'player')
    this.player.setCollideWorldBounds(true)
    this.player.setDepth(5)
    this.player.setVisible(false)

    this.bullets = this.physics.add.group()
    this.enemyBullets = this.physics.add.group()
    this.enemies = this.physics.add.group()
    this.items = this.physics.add.group()
    this.coinPickups = this.physics.add.group()

    this.scoreText = this.add.text(GAME_WIDTH - 24, 20, 'Score: 0', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#ffe6a7',
      stroke: '#2b1d16',
      strokeThickness: 3,
    }).setOrigin(1, 0)

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

    this.coinIcon = this.add.image(38, 94, 'coin')
    this.coinIcon.setOrigin(0.5)
    this.coinIcon.setScale(0.86)

    this.coinText = this.add.text(54, 82, '：0', {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#ffd166',
      stroke: '#2b1d16',
      strokeThickness: 3,
    })

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
    this.updateCoinDisplay()

    this.waveText = this.add.text(GAME_WIDTH - 24, GAME_HEIGHT - 24, 'Wave: 1', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffe6a7',
      stroke: '#2b1d16',
      strokeThickness: 3,
    }).setOrigin(1, 1).setVisible(false)

    this.titleText = this.add.text(GAME_WIDTH / 2, 210, 'PIXEL OUTLAW', {
      fontFamily: 'monospace',
      fontSize: '54px',
      color: '#ffe6a7',
      stroke: '#2b1d16',
      strokeThickness: 8,
    }).setOrigin(0.5)

    const hasSavedGame = this.savedGame !== null

    this.startText = this.add.text(GAME_WIDTH / 2, hasSavedGame ? 280 : 300, 'START GAME', {
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

    if (hasSavedGame) {
      this.continueText = this.add.text(GAME_WIDTH / 2, 345, 'CONTINUE SAVED GAME', {
        fontFamily: 'monospace',
        fontSize: '24px',
        color: '#ffe6a7',
        backgroundColor: '#704f32',
        padding: {
          x: 16,
          y: 9,
        },
      }).setOrigin(0.5)

      this.continueText.setInteractive({ useHandCursor: true })
    }

    this.tipText = this.add.text(
      GAME_WIDTH / 2,
      hasSavedGame ? 410 : 370,
      hasSavedGame
        ? 'SPACE New Game  |  C Continue\nWASD move  |  Arrow keys shoot  |  ESC pause'
        : 'Click START or press SPACE\nWASD move  |  Arrow keys shoot  |  ESC pause',
      {
      fontFamily: 'monospace',
      fontSize: '20px',
      color: '#f5c16c',
      align: 'center',
      lineSpacing: 10,
      },
    ).setOrigin(0.5)

    this.gameOverText = this.add.text(GAME_WIDTH / 2, 280, '', {
      fontFamily: 'monospace',
      fontSize: '34px',
      color: '#ffe6a7',
      align: 'center',
      stroke: '#2b1d16',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(20)

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

    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,C,R,ESC,K,L') as Record<string, Phaser.Input.Keyboard.Key>

    this.startText.on('pointerdown', () => {
      this.startGame()
    })

    this.continueText?.on('pointerdown', () => {
      this.continueSavedGame()
    })

    this.physics.add.overlap(this.player, this.enemies, (_playerObject, enemyObject) => {
      if (!this.isStarted || this.isGameOver || this.isAreaTransitioning) return

      const now = this.time.now
      const enemy = enemyObject as Phaser.Physics.Arcade.Sprite
      if (enemy.getData('dying')) return

      if (this.shieldCharges > 0) {
        const enemyX = enemy.x
        const enemyY = enemy.y

        this.clearShield()

        this.defeatEnemy(enemy, this.currentArea === 'townRoad')
        this.cameras.main.shake(80, 0.004)
        this.showBlockFlash()
        this.showFloatingText(enemyX, enemyY - 20, 'BLOCK')

        return
      }

      if (now - this.lastDamageTime < TIMING.damageCooldown) return

      if (enemy.getData('explosive')) {
        this.armExplosiveEnemy(enemy, LEVEL_TWO_CONFIG.explosion.warningMs)
        this.damagePlayer(now)
        return
      }
      this.defeatEnemy(enemy, this.currentArea === 'townRoad')
      this.damagePlayer(now)
    })

    this.physics.add.overlap(this.player, this.items, (_playerObject, itemObject) => {
      if (!this.isStarted || this.isGameOver || this.isAreaTransitioning) return

      const item = itemObject as Phaser.Physics.Arcade.Sprite
      this.collectPlayerPickup(item)
    })

    this.physics.add.overlap(this.player, this.coinPickups, (_playerObject, coinObject) => {
      if (!this.isStarted || this.isGameOver || this.isAreaTransitioning) return

      const coin = coinObject as Phaser.Physics.Arcade.Sprite
      const amount = coin.getData('amount') as number | undefined

      this.destroyCoinPickup(coin)
      this.coinCount += amount ?? 1
      this.updateCoinDisplay()
      this.pulseCoinUi()
      this.showFloatingText(this.player.x, this.player.y - 34, '+1 GOLD')
    })

    this.physics.add.overlap(this.player, this.enemyBullets, (_playerObject, bulletObject) => {
      if (!this.isStarted || this.isGameOver || this.isAreaTransitioning) return
      const bullet = bulletObject as Phaser.Physics.Arcade.Image
      bullet.destroy()
      this.damagePlayer(this.time.now)
    })

    if (data?.autoStart) {
      this.startGame()
      if (data.townCheckpoint) {
        this.score = data.townCheckpoint.score
        this.health = data.townCheckpoint.health
        this.coinCount = data.townCheckpoint.coins
        this.maxHealth = data.townCheckpoint.maxHealth
        this.restoreCompletedLevelOneState()
        this.scoreText.setText(`Score: ${this.score}`)
        this.updateCoinDisplay()
        this.rebuildHealthDisplay()
        this.enterTownRoad()
      }
    }
  }

  update(time: number, delta: number) {
    this.handleDevShortcuts()

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

    if (this.isAreaTransitioning) {
      this.player.setVelocity(0, 0)
      return
    }

    if (this.currentArea === 'townRoad') {
      this.handleTownRoadInput()
      this.updateLevelTwo(time)
    }

    if (this.currentArea === 'dustyOutskirts') {
      this.updateLevelOne(time)
    }

    this.updateSpeedBoost(time)
    this.updateShield(time)
    this.handlePlayerMove()
    this.handleShooting(time)
    this.moveBullets(delta)
    this.moveEnemyBullets(delta)

    if (this.currentArea === 'dustyOutskirts') {
      this.spawnEnemies(time)
      this.moveEnemies()
      this.checkBulletEnemyHits()
      this.checkAreaExit()
    } else {
      this.moveEnemies()
      this.checkBulletEnemyHits()
    }

    this.cleanBullets()
  }

  private clearAreaBackground() {
    this.areaBackgroundObjects.forEach((object) => object.destroy())
    this.areaBackgroundObjects = []
  }

  private clearExitMarkers() {
    this.exitMarkerObjects.forEach((object) => {
      this.tweens.killTweensOf(object)
      object.destroy()
    })
    this.exitMarkerObjects = []
  }

  private clearAreaTitle() {
    this.areaTitleObjects.forEach((object) => {
      this.tweens.killTweensOf(object)
      object.destroy()
    })
    this.areaTitleObjects = []
  }

  private clearLevelCompleteText() {
    if (!this.levelCompleteText) return

    this.tweens.killTweensOf(this.levelCompleteText)
    this.levelCompleteText.destroy()
    this.levelCompleteText = undefined
    this.levelTwoEncounter.reset()
    this.levelTwoCompleted = false
    this.levelTwoDefeats = 0
    this.contestedPickupFlow.reset()
    this.weaponMode = null
    this.weaponModeUntil = 0
    this.dynamiteCharges = 0
    this.shotActionId = 0
    this.explosiveActions.clear()
    this.adaptiveSecondBusy = false
    this.heartDropReadyAt = 0
    this.heartDropKillsRemaining = 0
    this.mercyDropAttempts = 0
    this.mercyArmed = false
    this.levelTwoShieldSpawned = false
    this.finalGunslingersSpawned = 0
    this.chargerIntroducedThisRun = false
    this.gunslingerIntroducedThisRun = false
    this.townCheckpoint = { score: 0, health: MAX_HEALTH, coins: 0, maxHealth: MAX_HEALTH }
  }

  private drawDustyOutskirtsBackground() {
    this.clearAreaBackground()

    const outerGround = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH - 48,
      GAME_HEIGHT - 48,
      0x6b4a2b,
    )
    outerGround.setStrokeStyle(4, 0xd2a15f)
    outerGround.setDepth(-5)

    const innerGround = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH - 88,
      GAME_HEIGHT - 88,
      0x7b5734,
    )
    innerGround.setStrokeStyle(2, 0x3a2414)
    innerGround.setDepth(-4)

    this.areaBackgroundObjects = [outerGround, innerGround]
  }

  private drawTownRoadBackground() {
    this.clearAreaBackground()

    const outerGround = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH - 48,
      GAME_HEIGHT - 48,
      0x56613c,
    )
    outerGround.setStrokeStyle(4, 0xd2a15f)
    outerGround.setDepth(-5)

    const innerGround = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      GAME_WIDTH - 88,
      GAME_HEIGHT - 88,
      0x667849,
    )
    innerGround.setStrokeStyle(2, 0x2f3a22)
    innerGround.setDepth(-4)

    const road = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2,
      122,
      GAME_HEIGHT - 120,
      0x755036,
      0.78,
    )
    road.setDepth(-3)

    const roadHighlight = this.add.rectangle(
      GAME_WIDTH / 2 - 20,
      GAME_HEIGHT / 2,
      24,
      GAME_HEIGHT - 140,
      0x8a6241,
      0.28,
    )
    roadHighlight.setDepth(-2)

    const southTrail = this.add.rectangle(
      GAME_WIDTH / 2,
      GAME_HEIGHT - 42,
      156,
      74,
      0x755036,
      0.78,
    )
    southTrail.setDepth(-3)

    this.areaBackgroundObjects = [
      outerGround,
      innerGround,
      road,
      roadHighlight,
      southTrail,
    ]
  }

  private resetGameState() {
    this.score = 0
    this.coinCount = 0
    this.health = MAX_HEALTH
    this.isStarted = false
    this.isGameOver = false
    this.levelCompleted = false
    this.isPaused = false
    this.pauseStartedAt = 0
    this.continueText = undefined

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

    this.levelOneCoinDropTarget = Phaser.Math.Between(2, 3)
    this.levelOneCoinsDropped = 0
    this.levelOneEnemyDefeats = 0
    this.levelOneCoinDropDefeatTargets = this.levelOneCoinDropTarget === 3
      ? [
          Phaser.Math.Between(2, 4),
          Phaser.Math.Between(8, 11),
          Phaser.Math.Between(16, 21),
        ]
      : [
          Phaser.Math.Between(3, 5),
          Phaser.Math.Between(12, 17),
        ]

    this.shieldCharges = 0
    this.shieldUntil = 0
    this.shieldAura = undefined

    this.currentArea = 'dustyOutskirts'
    this.isAreaExitOpen = false
    this.isAreaTransitioning = false
    this.areaTransitionReadyAt = 0
    this.areaBackgroundObjects = []
    this.exitMarkerObjects = []
    this.areaTitleObjects = []
    this.levelCompleteText = undefined
    this.townRoadFlow.leaveTownRoad()
  }

  private handleStartInput() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
      this.startGame()
      return
    }

    if (this.savedGame && Phaser.Input.Keyboard.JustDown(this.keys.C)) {
      this.continueSavedGame()
    }
  }

  private handleDevShortcuts() {
    const isLocalDevHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

    if (!isLocalDevHost) return

    if (Phaser.Input.Keyboard.JustDown(this.keys.K)) {
      if (!this.isStarted) {
        this.startGame()
      }

      this.debugOpenDustyOutskirtsExit()
    }

    if (Phaser.Input.Keyboard.JustDown(this.keys.L)) {
      this.debugCompleteTownRoad()
    }
  }

  private debugCompleteTownRoad() {
    if (!this.isStarted || this.currentArea !== 'townRoad' || this.levelTwoCompleted) return
    if (this.isAreaTransitioning || this.isGameOver) return

    this.clearEnemies()
    this.bullets.clear(true, true)
    this.enemyBullets.clear(true, true)
    this.clearItems()
    this.clearCoinPickups()
    this.completeLevelTwo()
    this.showFloatingText(GAME_WIDTH / 2, 160, 'DEBUG TOWN ROAD CLEAR')
  }

  private handleTownRoadInput() {
    this.checkTownRoadReturnExit()
    this.checkLevelTwoCombatTrigger()
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
    if (!this.isStarted || this.isGameOver || this.isAreaTransitioning) return

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
    this.pauseText.setText('PAUSED\n\n[ESC] Continue\n[R] Restart Level\n[S] Save Progress & Quit')

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
    if (this.currentArea === 'townRoad') {
      this.scene.restart({ autoStart: true, townCheckpoint: this.townCheckpoint })
    } else {
      this.scene.restart({ autoStart: true })
    }
  }

  private saveAndQuit() {
    const isCompletedSave = this.levelCompleted
    const saveData = createLevelOneSaveData({
      area: isCompletedSave ? this.currentArea : 'dustyOutskirts',
      levelCompleted: isCompletedSave,
      levelTwoCompleted: isCompletedSave && this.levelTwoCompleted,
      stage: isCompletedSave ? 'clear' : 'intro',
      score: isCompletedSave ? this.score : 0,
      health: isCompletedSave ? this.health : MAX_HEALTH,
      maxHealth: isCompletedSave ? this.maxHealth : MAX_HEALTH,
      coins: isCompletedSave ? this.coinCount : 0,
      heartIntroduced: false,
      coinProgress: isCompletedSave
        ? {
            dropTarget: this.levelOneCoinDropTarget,
            dropped: this.levelOneCoinsDropped,
            enemyDefeats: this.levelOneEnemyDefeats,
            defeatTargets: [...this.levelOneCoinDropDefeatTargets],
          }
        : {
            dropTarget: 0,
            dropped: 0,
            enemyDefeats: 0,
            defeatTargets: [],
          },
    })

    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData))
    } catch {
      this.pauseText.setText('SAVE FAILED\n\n[ESC] Continue\n[R] Restart Level\n[S] Try Again')
      return
    }

    this.prepareSceneChangeFromPause()
    this.scene.restart()
  }

  private handleRestartInput() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.R)) {
      if (this.currentArea === 'townRoad') this.scene.restart({ autoStart: true, townCheckpoint: this.townCheckpoint })
      else this.scene.restart()
    }
  }

  private startGame() {
    if (this.isStarted) return

    this.isStarted = true
    this.levelStartTime = this.time.now
    this.waveText.setText(`Wave: ${this.wave}`)
    this.waveText.setVisible(true)
    this.player.setVisible(true)
    this.titleText.setVisible(false)
    this.startText.setVisible(false)
    this.continueText?.setVisible(false)
    this.tipText.setVisible(false)
  }

  private continueSavedGame() {
    if (this.isStarted) return

    const saveData = loadLevelOneSaveData()
    if (!saveData) {
      this.savedGame = null
      this.continueText?.setVisible(false)
      this.tipText.setText('Saved game is unavailable\nClick START or press SPACE')
      this.tipText.setY(370)
      return
    }

    this.savedGame = saveData
    this.startGame()
    this.restoreSavedGame(saveData)
  }

  private restoreSavedGame(saveData: LevelOneSaveData) {
    if (!saveData.levelCompleted) {
      return
    }

    this.score = saveData.score
    this.health = saveData.health
    this.maxHealth = saveData.maxHealth
    this.coinCount = saveData.coins
    this.levelCompleted = saveData.levelCompleted
    this.levelTwoCompleted = saveData.levelTwoCompleted
    this.heartIntroduced = saveData.heartIntroduced
    this.levelOneCoinDropTarget = saveData.coinProgress.dropTarget
    this.levelOneCoinsDropped = saveData.coinProgress.dropped
    this.levelOneEnemyDefeats = saveData.coinProgress.enemyDefeats
    this.levelOneCoinDropDefeatTargets = [...saveData.coinProgress.defeatTargets]

    this.scoreText.setText(`Score: ${this.score}`)
    this.rebuildHealthDisplay()
    this.updateCoinDisplay()

    this.restoreCompletedLevelOneState()

    if (saveData.area === 'townRoad') {
      this.enterTownRoad()
      return
    }

    this.restoreCompletedDustyOutskirts()
  }

  private restoreCompletedLevelOneState() {
    this.levelCompleted = true
    this.isLevelClear = true
    this.currentWaveItem = null
    this.itemSpawnedThisWave = false
    this.coffeeIntroduced = true
    this.shieldIntroduced = true
    this.finalPressureWaveDone = true
  }

  private restoreCompletedDustyOutskirts() {
    this.currentArea = 'dustyOutskirts'
    this.player.setPosition(GAME_WIDTH / 2, GAME_HEIGHT / 2)
    this.waveText.setText('Area: Dusty Outskirts')
    this.showLevelCompleteText()
    this.unlockAreaExit()
  }

  private endGame() {
    if (this.isPaused) {
      this.prepareSceneChangeFromPause()
    }

    this.isGameOver = true
    this.player.setVelocity(0, 0)
    this.stopSpeedBoostPulse()
    this.clearShield()
    this.levelTwoEncounter.stop()

    this.clearEnemies()
    this.bullets.clear(true, true)
    this.enemyBullets.clear(true, true)
    this.clearItems()
    this.clearCoinPickups()

    this.gameOverText.setText(`GAME OVER\nScore: ${this.score}\nGold: ${this.coinCount}\nPress R to restart`)
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

    return pickup
  }

  private collectPlayerPickup(item: Phaser.Physics.Arcade.Sprite) {
    if (!item.active) return
    const itemType = item.getData('type') as PickupType
    const glow = item.getData('glow') as Phaser.GameObjects.Image | undefined
    glow?.destroy()
    item.destroy()
    this.contestedPickupFlow.handlePlayerCollected(item)

    if (itemType === 'coffee') this.activateSpeedBoost(this.time.now)
    else if (itemType === 'heart') this.activateHeal()
    else if (itemType === 'shield') this.activateShield(this.time.now)
    else if (itemType === 'ammo' || itemType === 'buckshot') {
      this.weaponMode = itemType
      this.weaponModeUntil = this.time.now + (itemType === 'ammo'
        ? LEVEL_TWO_CONFIG.playerBuffs.ammoDuration
        : LEVEL_TWO_CONFIG.playerBuffs.buckshotDuration)
      this.showFloatingText(this.player.x, this.player.y - 34, itemType === 'ammo' ? 'QUICK FIRE' : 'BUCKSHOT')
    } else if (itemType === 'dynamite') {
      this.dynamiteCharges += LEVEL_TWO_CONFIG.playerBuffs.dynamiteCharges
      this.showFloatingText(this.player.x, this.player.y - 34, `DYNAMITE x${this.dynamiteCharges}`)
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
    this.clearLevelCompleteText()

    const text = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 90, 'DUSTY OUTSKIRTS CLEAR', {
      fontFamily: 'monospace',
      fontSize: '30px',
      color: '#fff0a3',
      stroke: '#2b1d16',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(12)

    this.levelCompleteText = text

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

    this.tweens.add({
      targets: text,
      alpha: 0,
      delay: 1500,
      duration: 500,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.clearLevelCompleteText()
      },
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

  private rebuildHealthDisplay() {
    this.heartIcons.forEach((heart) => heart.destroy())
    this.heartIcons = []
    for (let i = 0; i < this.maxHealth; i += 1) {
      const heart = this.add.image(66 + i * 26, 62, i < this.health ? 'hpHeartFull' : 'hpHeartEmpty')
      heart.setOrigin(0.5)
      this.heartIcons.push(heart)
    }
    const shieldX = 66 + this.maxHealth * 26 + 14
    this.shieldIcon.setX(shieldX)
    this.shieldCountText.setX(shieldX + 10)
  }

  private updateCoinDisplay() {
    this.coinText.setText(`：${this.coinCount}`)
  }

  private pulseCoinUi() {
    const targets = [this.coinIcon, this.coinText]

    this.tweens.killTweensOf(targets)

    this.coinIcon.setScale(0.86)
    this.coinText.setScale(1)

    this.tweens.add({
      targets,
      scale: 1.16,
      duration: 120,
      yoyo: true,
      repeat: 1,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.coinIcon.setScale(0.86)
        this.coinText.setScale(1)
      },
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
    if (this.health >= 2) {
      this.mercyArmed = false
      this.mercyDropAttempts = 0
    }
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
    }).setOrigin(0.5).setDepth(15)

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
    this.contestedPickupFlow.clear()
  }

  private clearCoinPickups() {
    this.coinPickups.getChildren().forEach((child) => {
      this.destroyCoinPickup(child as Phaser.Physics.Arcade.Sprite)
    })
  }

  private destroyCoinPickup(coin: Phaser.Physics.Arcade.Sprite) {
    if (!coin.active) return
    const warningTimer = coin.getData('warningTimer') as Phaser.Time.TimerEvent | undefined
    const expiryTimer = coin.getData('expiryTimer') as Phaser.Time.TimerEvent | undefined
    warningTimer?.remove(false)
    expiryTimer?.remove(false)
    this.tweens.killTweensOf(coin)
    coin.destroy()
  }

  private clearEnemies() {
    this.enemies.getChildren().forEach((child) => {
      this.destroyEnemyVisuals(child as Phaser.Physics.Arcade.Sprite)
    })
    this.enemies.clear(true, true)
  }

  private destroyEnemyVisuals(enemy: Phaser.Physics.Arcade.Sprite) {
    this.contestedPickupFlow.handleEnemyRemoved(enemy)
    const keys = ['warning', 'explosionWarning', 'upgradeMarker', 'aimCue'] as const
    keys.forEach((key) => {
      const object = enemy.getData(key) as Phaser.GameObjects.GameObject | undefined
      if (object?.active) {
        this.tweens.killTweensOf(object)
        object.destroy()
      }
      enemy.setData(key, undefined)
    })
    const healthPips = enemy.getData('healthPips') as Phaser.GameObjects.Rectangle[] | undefined
    healthPips?.forEach((pip) => pip.destroy())
    enemy.setData('healthPips', undefined)
    const introVisuals = enemy.getData('introVisuals') as Phaser.GameObjects.GameObject[] | undefined
    introVisuals?.forEach((object) => {
      this.tweens.killTweensOf(object)
      object.destroy()
    })
    enemy.setData('introVisuals', undefined)
  }

  private createEnemyHealthPips(enemy: Phaser.Physics.Arcade.Sprite) {
    const existing = enemy.getData('healthPips') as Phaser.GameObjects.Rectangle[] | undefined
    existing?.forEach((pip) => pip.destroy())
    const pips = [-5, 5].map((offset) => this.add.rectangle(enemy.x + offset, enemy.y - 27, 7, 4, 0xffd166)
      .setStrokeStyle(1, 0x2b1d16).setDepth(11))
    enemy.setData('healthPips', pips)
    this.updateEnemyIndicators(enemy)
  }

  private updateEnemyIndicators(enemy: Phaser.Physics.Arcade.Sprite) {
    const health = (enemy.getData('health') as number | undefined) ?? 1
    const pips = enemy.getData('healthPips') as Phaser.GameObjects.Rectangle[] | undefined
    pips?.forEach((pip, index) => {
      pip.setPosition(enemy.x + (index === 0 ? -5 : 5), enemy.y - 27)
      pip.setFillStyle(index < health ? 0xffd166 : 0x4b4038, index < health ? 1 : 0.7)
    })
    const marker = enemy.getData('upgradeMarker') as Phaser.GameObjects.Text | undefined
    marker?.setPosition(enemy.x, enemy.y + 26)
  }

  private setEnemyUpgradeMarker(enemy: Phaser.Physics.Arcade.Sprite, type: ContestedPickupType) {
    const existing = enemy.getData('upgradeMarker') as Phaser.GameObjects.Text | undefined
    existing?.destroy()
    const visual = {
      coffee: { text: '»', color: '#ffc35a' },
      dynamite: { text: '◆', color: '#ff624d' },
      ammo: { text: '▥', color: '#78b7ff' },
      buckshot: { text: '•••', color: '#ffd166' },
    }[type]
    const marker = this.add.text(enemy.x, enemy.y + 26, visual.text, {
      fontFamily: 'monospace', fontSize: '14px', color: visual.color,
      stroke: '#1e1611', strokeThickness: 3,
    }).setOrigin(0.5).setDepth(10)
    enemy.setData('upgradeMarker', marker)
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
    if (this.weaponModeUntil > 0 && time >= this.weaponModeUntil) {
      this.weaponMode = null
      this.weaponModeUntil = 0
    }
    const shootCooldown = this.weaponMode === 'ammo'
      ? LEVEL_TWO_CONFIG.playerBuffs.ammoShootCooldown
      : TIMING.shootCooldown

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

    this.lastShotTime = time
    this.shotActionId += 1
    const baseAngle = Math.atan2(normalizedDy, normalizedDx)
    const spread = Phaser.Math.DegToRad(LEVEL_TWO_CONFIG.playerBuffs.buckshotSpreadDegrees)
    const angles = this.weaponMode === 'buckshot'
      ? [baseAngle - spread, baseAngle, baseAngle + spread]
      : [baseAngle]
    angles.forEach((angle) => this.spawnPlayerBullet(angle, bulletSpeed, this.shotActionId))
  }

  private spawnPlayerBullet(angle: number, speed: number, actionId: number) {
    const dx = Math.cos(angle)
    const dy = Math.sin(angle)
    const bullet = this.physics.add.image(this.player.x + dx * 22, this.player.y + dy * 22, 'bullet')
    bullet.setData('vx', dx * speed)
    bullet.setData('vy', dy * speed)
    bullet.setData('actionId', actionId)
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

  private moveEnemyBullets(delta: number) {
    const seconds = delta / 1000
    this.enemyBullets.getChildren().forEach((child) => {
      const bullet = child as Phaser.Physics.Arcade.Image
      bullet.x += (bullet.getData('vx') as number) * seconds
      bullet.y += (bullet.getData('vy') as number) * seconds
    })
  }

  private damagePlayer(now: number) {
    if (this.shieldCharges > 0) {
      this.clearShield()
      this.showBlockFlash()
      this.showFloatingText(this.player.x, this.player.y - 20, 'BLOCK')
      return
    }
    if (now - this.lastDamageTime < TIMING.damageCooldown) return

    this.lastDamageTime = now
    this.hasTakenDamage = true
    this.health -= 1
    this.updateHealthDisplay()
    if (this.currentArea === 'townRoad' && this.health === 1 && !this.mercyArmed && !this.hasPickupType('heart')) {
      this.mercyArmed = true
      this.mercyDropAttempts = LEVEL_TWO_CONFIG.heartDrop.mercyAttempts
      const mercyReadyAt = now + LEVEL_TWO_CONFIG.heartDrop.mercyCooldownMs
      this.heartDropReadyAt = this.heartDropReadyAt > now ? Math.min(this.heartDropReadyAt, mercyReadyAt) : mercyReadyAt
      this.heartDropKillsRemaining = Math.min(this.heartDropKillsRemaining, LEVEL_TWO_CONFIG.heartDrop.mercyKills)
    }
    this.cameras.main.shake(120, 0.008)
    if (this.health <= 0) this.endGame()
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
          const actionId = (bullet.getData('actionId') as number | undefined) ?? -1
          const hitX = enemy.x
          const hitY = enemy.y
          bullet.destroy()
          const health = (enemy.getData('health') as number | undefined) ?? 1
          if (health > 1) {
            enemy.setData('health', health - 1)
            this.updateEnemyIndicators(enemy)
            enemy.setTint(0xffffff)
            this.time.delayedCall(70, () => enemy.active && enemy.clearTint())
          } else {
            if (enemy.getData('explosive')) this.armExplosiveEnemy(enemy, LEVEL_TWO_CONFIG.explosion.warningMs)
            else this.defeatEnemy(enemy, true)
          }
          if (this.dynamiteCharges > 0 && !this.explosiveActions.has(actionId)) {
            this.explosiveActions.add(actionId)
            this.dynamiteCharges -= 1
            this.explodeAt(hitX, hitY, LEVEL_TWO_CONFIG.playerBuffs.dynamiteRadius, false)
          }
        }
      })
    })
  }

  private defeatEnemy(enemy: Phaser.Physics.Arcade.Sprite, awardKill: boolean) {
    if (!enemy.active) return
    const x = enemy.x
    const y = enemy.y
    const batchIndex = enemy.getData('batchIndex') as number | undefined
    this.destroyEnemyVisuals(enemy)
    enemy.destroy()

    if (awardKill) {
      this.addScore(10, x, y)
      this.registerEnemyDefeat(x, y)
    }
    if (this.currentArea === 'dustyOutskirts') {
      this.enemiesCleared += 1
      this.checkWaveProgress()
    } else if (batchIndex !== undefined) {
      this.levelTwoDefeats += 1
      this.levelTwoEncounter.registerDefeat(batchIndex)
      if (awardKill) this.rollLevelTwoDrops(x, y)
    }
  }

  private explodeAt(x: number, y: number, radius: number, damagesPlayer: boolean) {
    const ring = this.add.circle(x, y, radius, 0xff6b35, 0.22).setStrokeStyle(3, 0xffd166, 0.9).setDepth(6)
    this.tweens.add({ targets: ring, scale: 1.18, alpha: 0, duration: 260, onComplete: () => ring.destroy() })
    const victims = this.enemies.getChildren()
      .map((child) => child as Phaser.Physics.Arcade.Sprite)
      .filter((enemy) => enemy.active && Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y) <= radius)
    victims.forEach((enemy) => {
      const health = (enemy.getData('health') as number | undefined) ?? 1
      if (health <= LEVEL_TWO_CONFIG.playerBuffs.dynamiteDamage) {
        if (enemy.getData('explosive')) this.armExplosiveEnemy(enemy, LEVEL_TWO_CONFIG.explosion.warningMs)
        else this.defeatEnemy(enemy, true)
      }
      else {
        enemy.setData('health', health - LEVEL_TWO_CONFIG.playerBuffs.dynamiteDamage)
        this.updateEnemyIndicators(enemy)
      }
    })
    if (damagesPlayer && Phaser.Math.Distance.Between(x, y, this.player.x, this.player.y) <= radius) {
      this.damagePlayer(this.time.now)
    }
  }

  private hasPickupType(type: PickupType) {
    return this.items.getChildren().some((child) => child.active && child.getData('type') === type)
  }

  private rollLevelTwoDrops(x: number, y: number) {
    if (Math.random() < LEVEL_TWO_CONFIG.coinDropChance) this.spawnCoin(x, y)
    if (this.health >= this.maxHealth || this.hasPickupType('heart')) return

    this.heartDropKillsRemaining = Math.max(0, this.heartDropKillsRemaining - 1)
    if (this.time.now < this.heartDropReadyAt || this.heartDropKillsRemaining > 0) return

    const baseChance = LEVEL_TWO_CONFIG.heartDrop.chanceByHealth[Math.min(this.health, 3)] ?? 0
    const chance = this.mercyDropAttempts > 0 ? Math.max(baseChance, LEVEL_TWO_CONFIG.heartDrop.mercyChance) : baseChance
    if (Math.random() < chance || this.mercyDropAttempts === 1) {
      this.spawnPickupSprite('heart', 'heart', 'POTION', x, y, true)
      this.resetHeartDropCooldown()
      this.mercyDropAttempts = 0
      return
    }
    if (this.mercyDropAttempts > 0) this.mercyDropAttempts -= 1
  }

  private resetHeartDropCooldown() {
    const [minMs, maxMs] = LEVEL_TWO_CONFIG.heartDrop.cooldownMs
    const [minKills, maxKills] = LEVEL_TWO_CONFIG.heartDrop.cooldownKills
    this.heartDropReadyAt = this.time.now + Phaser.Math.Between(minMs, maxMs)
    this.heartDropKillsRemaining = Phaser.Math.Between(minKills, maxKills)
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
    this.levelCompleted = true
    this.currentWaveItem = null
    this.itemSpawnedThisWave = false
    this.isLevelClear = true
    this.isAreaExitOpen = false

    this.showLevelCompleteText()

    this.time.delayedCall(900, () => {
      if (this.isGameOver || this.currentArea !== 'dustyOutskirts') return

      this.spawnHeart(true, true)
      this.showFloatingText(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, 'SUPPLY DROP')
    })

    this.time.delayedCall(1400, () => {
      if (this.isGameOver || this.currentArea !== 'dustyOutskirts') return

      this.unlockAreaExit()
    })
  }

  private debugOpenDustyOutskirtsExit() {
    if (this.currentArea !== 'dustyOutskirts') return

    if (this.isPaused) {
      this.prepareSceneChangeFromPause()
    }

    this.clearEnemies()
    this.bullets.clear(true, true)
    this.enemyBullets.clear(true, true)
    this.clearItems()

    this.currentWaveItem = null
    this.itemSpawnedThisWave = false
    this.levelCompleted = true
    this.finalPressureWaveDone = true
    this.isLevelClear = true

    this.showLevelCompleteText()
    this.unlockAreaExit()
    this.showFloatingText(GAME_WIDTH / 2, 132, 'DEBUG EXIT OPEN')
  }

  private unlockAreaExit() {
    if (this.isAreaExitOpen || this.currentArea !== 'dustyOutskirts') return

    this.clearExitMarkers()
    this.isAreaExitOpen = true

    const road = this.add.rectangle(GAME_WIDTH / 2, 42, 184, 84, 0x3f2b1b, 0.92)
    road.setStrokeStyle(3, 0xf5c16c)
    road.setDepth(1)

    const arrow = this.add.text(GAME_WIDTH / 2, 26, '↑', {
      fontFamily: 'monospace',
      fontSize: '34px',
      color: '#ffe6a7',
      stroke: '#2b1d16',
      strokeThickness: 5,
    }).setOrigin(0.5).setDepth(8)

    const sign = this.add.text(GAME_WIDTH / 2, 55, 'ROAD TO TOWN', {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffe6a7',
      stroke: '#2b1d16',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(8)

    const prompt = this.add.text(GAME_WIDTH / 2, 96, 'Move north to continue', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#f5c16c',
      stroke: '#2b1d16',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(8)

    this.exitMarkerObjects = [road, arrow, sign, prompt]

    this.tweens.add({
      targets: prompt,
      alpha: 0.45,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    this.showFloatingText(GAME_WIDTH / 2, 126, 'EXIT OPEN')
  }

  private checkAreaExit() {
    if (!this.isAreaExitOpen || this.currentArea !== 'dustyOutskirts') return
    if (this.isPaused || this.isGameOver || this.isAreaTransitioning) return
    if (this.time.now < this.areaTransitionReadyAt) return

    const isInsideExitX = Math.abs(this.player.x - GAME_WIDTH / 2) <= 92
    const reachedNorthRoad = this.player.y <= 88

    if (isInsideExitX && reachedNorthRoad) {
      this.transitionToTownRoad()
    }
  }

  private transitionToTownRoad() {
    if (this.currentArea !== 'dustyOutskirts' || this.isAreaTransitioning) return

    this.isAreaTransitioning = true
    this.player.setVelocity(0, 0)
    this.physics.world.pause()

    this.cameras.main.fadeOut(280, 0, 0, 0)

    this.time.delayedCall(320, () => {
      this.enterTownRoad()
      this.physics.world.resume()
      this.cameras.main.fadeIn(280, 0, 0, 0)
      this.isAreaTransitioning = false
      this.areaTransitionReadyAt = this.time.now + 300
    })
  }

  private checkTownRoadReturnExit() {
    if (!this.canReturnFromTownRoad() || this.isAreaTransitioning) return
    if (this.time.now < this.areaTransitionReadyAt) return

    const isInsideSouthExitX = Math.abs(this.player.x - GAME_WIDTH / 2) <= LEVEL_TWO_CONFIG.townRoadReturn.halfWidth
    const reachedSouthRoad = this.player.y >= LEVEL_TWO_CONFIG.townRoadReturn.triggerY

    if (isInsideSouthExitX && reachedSouthRoad) {
      this.transitionToDustyOutskirts()
    }
  }

  private canReturnFromTownRoad() {
    return this.currentArea === 'townRoad' && this.townRoadFlow.canReturn()
  }

  private transitionToDustyOutskirts() {
    if (!this.canReturnFromTownRoad() || this.isAreaTransitioning) return

    this.isAreaTransitioning = true
    this.player.setVelocity(0, 0)
    this.physics.world.pause()

    this.cameras.main.fadeOut(280, 0, 0, 0)

    this.time.delayedCall(320, () => {
      this.enterDustyOutskirtsFromTownRoad()
      this.physics.world.resume()
      this.cameras.main.fadeIn(280, 0, 0, 0)
      this.isAreaTransitioning = false
      this.areaTransitionReadyAt = this.time.now + 300
    })
  }

  private enterTownRoad() {
    if (this.currentArea !== 'townRoad') {
      this.townCheckpoint = { score: this.score, health: this.health, coins: this.coinCount, maxHealth: this.maxHealth }
    }
    this.currentArea = 'townRoad'
    this.levelCompleted = true
    this.isAreaExitOpen = false
    this.isLevelClear = true
    this.currentWaveItem = null
    this.itemSpawnedThisWave = false

    this.clearEnemies()
    this.bullets.clear(true, true)
    this.enemyBullets.clear(true, true)
    this.clearItems()
    this.clearCoinPickups()
    this.clearShield()
    this.clearExitMarkers()
    this.clearAreaTitle()
    this.clearLevelCompleteText()

    this.drawTownRoadBackground()

    this.player.setPosition(GAME_WIDTH / 2, GAME_HEIGHT - 116)
    this.player.setVelocity(0, 0)
    this.player.setDepth(5)

    this.waveText.setVisible(true)
    this.waveText.setText('Area: Town Road')

    this.showAreaTitle('TOWN ROAD', 'Stay sharp. The road is contested.')
    if (!this.levelTwoCompleted) {
      this.resetLevelTwoRuntime()
      this.townRoadFlow.enterPreparation()
    } else {
      this.townRoadFlow.enterCompleted()
    }
  }

  private enterDustyOutskirtsFromTownRoad() {
    this.levelTwoEncounter.stop()
    this.contestedPickupFlow.clear()
    this.townRoadFlow.leaveTownRoad()
    this.currentArea = 'dustyOutskirts'
    this.levelCompleted = true
    this.isLevelClear = true
    this.currentWaveItem = null
    this.itemSpawnedThisWave = false

    this.clearEnemies()
    this.bullets.clear(true, true)
    this.enemyBullets.clear(true, true)
    this.clearItems()
    this.clearCoinPickups()
    this.clearShield()
    this.clearAreaTitle()
    this.clearLevelCompleteText()

    this.drawDustyOutskirtsBackground()

    this.player.setPosition(GAME_WIDTH / 2, 124)
    this.player.setVelocity(0, 0)
    this.player.setDepth(5)

    this.waveText.setVisible(true)
    this.waveText.setText('Area: Dusty Outskirts')

    this.unlockAreaExit()
    this.showAreaTitle('DUSTY OUTSKIRTS', 'Road to town remains open')
  }

  private resetLevelTwoRuntime() {
    this.levelTwoEncounter.reset()
    this.levelTwoDefeats = 0
    this.contestedPickupFlow.reset()
    this.levelTwoShieldSpawned = false
    this.finalGunslingersSpawned = 0
    this.chargerIntroducedThisRun = false
    this.gunslingerIntroducedThisRun = false
    this.adaptiveSecondBusy = false
    this.weaponMode = null
    this.weaponModeUntil = 0
    this.dynamiteCharges = 0
    this.explosiveActions.clear()
    this.resetHeartDropCooldown()
    this.mercyArmed = false
    this.mercyDropAttempts = 0
  }

  private checkLevelTwoCombatTrigger() {
    if (this.currentArea !== 'townRoad' || this.levelTwoCompleted || this.isAreaTransitioning) return
    if (!this.townRoadFlow.tryStartCombat(this.player.y)) return

    this.levelTwoEncounter.start(this.time.now)
    this.showFloatingText(GAME_WIDTH / 2, LEVEL_TWO_CONFIG.combatEntry.triggerY - 26, 'AMBUSH STARTED')
  }

  private showAreaTitle(title: string, subtitle: string) {
    this.clearAreaTitle()
    this.clearLevelCompleteText()

    const titleText = this.add.text(GAME_WIDTH / 2, 104, title, {
      fontFamily: 'monospace',
      fontSize: '32px',
      color: '#ffe6a7',
      stroke: '#2b1d16',
      strokeThickness: 6,
    }).setOrigin(0.5).setDepth(12)

    const subtitleText = this.add.text(GAME_WIDTH / 2, 144, subtitle, {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#f5c16c',
      stroke: '#2b1d16',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(12)

    this.areaTitleObjects = [titleText, subtitleText]

    this.tweens.add({
      targets: this.areaTitleObjects,
      alpha: 0,
      delay: 1500,
      duration: 600,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        this.clearAreaTitle()
      },
    })
  }

  private addScore(basePoints: number, x: number, y: number) {
    const isCritical = Math.random() < 0.05
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

  private registerEnemyDefeat(x: number, y: number) {
    if (this.currentArea !== 'dustyOutskirts') return
    if (this.levelOneCoinsDropped >= this.levelOneCoinDropTarget) return

    this.levelOneEnemyDefeats += 1

    const nextDropDefeat = this.levelOneCoinDropDefeatTargets[this.levelOneCoinsDropped]
    if (nextDropDefeat === undefined) return
    if (this.levelOneEnemyDefeats < nextDropDefeat) return

    this.levelOneCoinsDropped += 1
    this.spawnCoin(x, y)
  }

  private spawnCoin(x: number, y: number) {
    const coinX = Phaser.Math.Clamp(x + Phaser.Math.Between(-12, 12), 48, GAME_WIDTH - 48)
    const coinY = Phaser.Math.Clamp(y + Phaser.Math.Between(-12, 12), 48, GAME_HEIGHT - 48)

    const coin = this.physics.add.sprite(coinX, coinY, 'coin')
    coin.setDepth(3)
    coin.setScale(0.95)
    coin.setData('amount', 1)
    this.coinPickups.add(coin)

    this.tweens.add({
      targets: coin,
      y: coinY - 5,
      duration: 620,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    const warningTimer = this.time.delayedCall(TIMING.coinLifetime - TIMING.coinExpiryWarning, () => {
      if (!coin.active) return
      this.tweens.killTweensOf(coin)
      coin.setY(coinY)
      this.tweens.add({
        targets: coin,
        alpha: 0.28,
        duration: 180,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      })
    })
    const expiryTimer = this.time.delayedCall(TIMING.coinLifetime, () => {
      if (coin.active) this.destroyCoinPickup(coin)
    })
    coin.setData('warningTimer', warningTimer)
    coin.setData('expiryTimer', expiryTimer)
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
      this.updateEnemyIndicators(enemy)
      if (enemy.getData('dying')) {
        enemy.setVelocity(0, 0)
        return
      }

      if (this.currentArea === 'townRoad' && enemy.getData('explosive')) {
        const explosiveState = this.updateExplosiveEnemy(enemy)
        if (explosiveState) return
      }

      if (this.currentArea === 'townRoad' && this.contestedPickupFlow.updateEnemyMovement(enemy, this.time.now)) return

      if (this.currentArea === 'townRoad') {
        const kind = enemy.getData('kind') as EnemyKind
        if (kind === 'charger') {
          this.updateCharger(enemy, this.time.now)
          return
        }
        if (kind === 'gunslinger') {
          this.updateGunslinger(enemy, this.time.now)
          return
        }
      }

      const speed = enemy.getData('speed') as number
      this.physics.moveToObject(enemy, this.player, speed)
    })
  }

  private updateCharger(enemy: Phaser.Physics.Arcade.Sprite, time: number) {
    const config = LEVEL_TWO_CONFIG.enemy.charger
    const state = (enemy.getData('state') as string | undefined) ?? 'track'
    const stateUntil = (enemy.getData('stateUntil') as number | undefined) ?? 0

    if (state === 'charge') {
      if (time >= stateUntil || enemy.x <= 34 || enemy.x >= GAME_WIDTH - 34 || enemy.y <= 34 || enemy.y >= GAME_HEIGHT - 34) {
        if (enemy.getData('explosive')) {
          this.armExplosiveEnemy(enemy, LEVEL_TWO_CONFIG.explosion.warningMs)
          return
        }
        enemy.setData('state', 'recover')
        const recovery = enemy.getData('coffeeBoosted') ? config.recoverMs * config.coffeeRecoveryMultiplier : config.recoverMs
        enemy.setData('stateUntil', time + recovery)
        enemy.setVelocity(0, 0)
      }
      return
    }
    if (state === 'recover') {
      enemy.setVelocity(0, 0)
      if (time >= stateUntil) enemy.setData('state', 'track')
      return
    }
    if (state === 'telegraph') {
      enemy.setVelocity(0, 0)
      if (time >= stateUntil) {
        const dx = enemy.getData('chargeDx') as number
        const dy = enemy.getData('chargeDy') as number
        const warning = enemy.getData('warning') as Phaser.GameObjects.Line | undefined
        warning?.destroy()
        enemy.setData('warning', undefined)
        enemy.setData('state', 'charge')
        enemy.setData('stateUntil', time + config.chargeMs)
        const multiplier = enemy.getData('coffeeBoosted') ? config.coffeeSpeedMultiplier : 1
        enemy.setVelocity(dx * config.chargeSpeed * multiplier, dy * config.chargeSpeed * multiplier)
        enemy.clearTint()
      }
      return
    }

    const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y)
    if (distance <= config.prepareDistance) {
      const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y)
      const dx = Math.cos(angle)
      const dy = Math.sin(angle)
      const warning = this.add.line(0, 0, enemy.x, enemy.y, enemy.x + dx * 230, enemy.y + dy * 230, 0xff8c42, 0.75)
        .setOrigin(0, 0).setDepth(4)
      enemy.setData('warning', warning)
      enemy.setData('chargeDx', dx)
      enemy.setData('chargeDy', dy)
      enemy.setData('state', 'telegraph')
      enemy.setData('stateUntil', time + config.telegraphMs)
      enemy.setVelocity(0, 0)
      enemy.setTint(0xffb347)
      return
    }
    const speed = config.speed * (enemy.getData('coffeeBoosted') ? config.coffeeSpeedMultiplier : 1)
    this.physics.moveToObject(enemy, this.player, speed)
  }

  private updateExplosiveEnemy(enemy: Phaser.Physics.Arcade.Sprite) {
    const kind = enemy.getData('kind') as EnemyKind
    if (kind === 'chaser') {
      const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y)
      if (distance <= LEVEL_TWO_CONFIG.explosion.proximity) {
        this.armExplosiveEnemy(enemy, LEVEL_TWO_CONFIG.explosion.warningMs)
        return true
      }
    }
    return false
  }

  private armExplosiveEnemy(enemy: Phaser.Physics.Arcade.Sprite, delay: number) {
    if (!enemy.active || enemy.getData('dying')) return
    enemy.setData('dying', true)
    enemy.setVelocity(0, 0)
    const radius = LEVEL_TWO_CONFIG.explosion.radius
    const warning = this.add.circle(enemy.x, enemy.y, radius, 0xff4d2e, 0.12)
      .setStrokeStyle(3, 0xff704d, 0.9).setDepth(3)
    enemy.setData('explosionWarning', warning)
    this.tweens.add({ targets: warning, alpha: 0.4, duration: 110, yoyo: true, repeat: -1 })
    this.time.delayedCall(delay, () => {
      if (!enemy.active || this.currentArea !== 'townRoad') {
        warning.destroy()
        return
      }
      const x = enemy.x
      const y = enemy.y
      warning.destroy()
      this.defeatEnemy(enemy, true)
      this.explodeAt(x, y, radius, true)
    })
  }

  private updateGunslinger(enemy: Phaser.Physics.Arcade.Sprite, time: number) {
    const config = LEVEL_TWO_CONFIG.enemy.gunslinger
    const distance = Phaser.Math.Distance.Between(enemy.x, enemy.y, this.player.x, this.player.y)
    const busy = enemy.getData('busy') as boolean | undefined
    if (!busy) {
      if (distance < config.preferredDistance - config.distanceTolerance) {
        const angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, enemy.x, enemy.y)
        enemy.setVelocity(Math.cos(angle) * config.speed, Math.sin(angle) * config.speed)
      } else if (distance > config.preferredDistance + config.distanceTolerance) {
        this.physics.moveToObject(enemy, this.player, config.speed)
      } else {
        const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, this.player.x, this.player.y) + Math.PI / 2
        enemy.setVelocity(Math.cos(angle) * config.speed * 0.45, Math.sin(angle) * config.speed * 0.45)
      }
    }

    const nextAttack = (enemy.getData('nextAttack') as number | undefined) ?? time
    if (!busy && time >= nextAttack) this.startGunslingerAttack(enemy, time)
  }

  private startGunslingerAttack(enemy: Phaser.Physics.Arcade.Sprite, time: number) {
    const config = LEVEL_TWO_CONFIG.enemy.gunslinger
    enemy.setData('busy', true)
    enemy.setVelocity(0, 0)
    enemy.setTint(0xffd166)
    this.showGunslingerAimCue(enemy, config.telegraphMs)
    const vx = this.player.body?.velocity.x ?? 0
    const vy = this.player.body?.velocity.y ?? 0
    const targets = [
      { x: this.player.x, y: this.player.y },
      { x: this.player.x + vx * config.predictionMs / 1000, y: this.player.y + vy * config.predictionMs / 1000 },
    ]

    const upgrade = enemy.getData('upgrade') as GunslingerUpgrade | undefined

    this.time.delayedCall(config.telegraphMs, () => {
      if (!enemy.active || this.currentArea !== 'townRoad') return
      if (upgrade === 'buckshot') this.fireEnemySpread(enemy, targets[0], 23)
      else this.fireEnemyBullet(enemy, targets[0])
      this.time.delayedCall(config.shotGapMs, () => {
        if (!enemy.active || this.currentArea !== 'townRoad') return
        if (!upgrade) {
          this.fireEnemyBullet(enemy, targets[1])
          this.finishGunslingerAttack(enemy, time)
          return
        }
        if (upgrade === 'ammo') this.fireEnemyBullet(enemy, targets[1])
        const observedX = this.player.x
        const observedY = this.player.y
        this.time.delayedCall(config.adaptiveObserveMs, () => {
          if (!enemy.active || this.currentArea !== 'townRoad') return
          const dx = this.player.x - observedX
          const dy = this.player.y - observedY
          const length = Math.max(1, Math.hypot(dx, dy))
          const direction = { x: dx / length, y: dy / length }
          const secondTarget = { x: this.player.x + direction.x * 75, y: this.player.y + direction.y * 75 }
          const farTarget = { x: this.player.x + direction.x * 145, y: this.player.y + direction.y * 145 }
          this.beginAdaptiveSecondGroup(enemy, time, upgrade, secondTarget, farTarget)
        })
      })
    })
  }

  private beginAdaptiveSecondGroup(
    enemy: Phaser.Physics.Arcade.Sprite,
    attackStartedAt: number,
    upgrade: GunslingerUpgrade,
    target: { x: number; y: number },
    farTarget: { x: number; y: number },
  ) {
    if (this.adaptiveSecondBusy) {
      this.time.delayedCall(60, () => enemy.active
        && this.beginAdaptiveSecondGroup(enemy, attackStartedAt, upgrade, target, farTarget))
      return
    }
    this.adaptiveSecondBusy = true
    enemy.setTint(0xffffff)
    this.showGunslingerAimCue(enemy, LEVEL_TWO_CONFIG.enemy.gunslinger.adaptiveRetargetMs)
    this.time.delayedCall(LEVEL_TWO_CONFIG.enemy.gunslinger.adaptiveRetargetMs, () => {
      if (!enemy.active || this.currentArea !== 'townRoad') {
        this.adaptiveSecondBusy = false
        return
      }
      if (upgrade === 'buckshot') {
        this.fireEnemySpread(enemy, target, 17)
        this.adaptiveSecondBusy = false
        this.finishGunslingerAttack(enemy, attackStartedAt)
      } else {
        this.fireEnemyBullet(enemy, target)
        this.time.delayedCall(LEVEL_TWO_CONFIG.enemy.gunslinger.shotGapMs, () => {
          if (enemy.active && this.currentArea === 'townRoad') this.fireEnemyBullet(enemy, farTarget)
          this.adaptiveSecondBusy = false
          if (enemy.active) this.finishGunslingerAttack(enemy, attackStartedAt)
        })
      }
    })
  }

  private finishGunslingerAttack(enemy: Phaser.Physics.Arcade.Sprite, attackStartedAt: number) {
    enemy.clearTint()
    enemy.setData('busy', false)
    enemy.setData('nextAttack', attackStartedAt + LEVEL_TWO_CONFIG.enemy.gunslinger.attackCooldown)
  }

  private showGunslingerAimCue(enemy: Phaser.Physics.Arcade.Sprite, duration: number) {
    const existing = enemy.getData('aimCue') as Phaser.GameObjects.Arc | undefined
    existing?.destroy()
    const cue = this.add.circle(enemy.x, enemy.y, 19, 0x78b7ff, 0.08)
      .setStrokeStyle(2, 0x9ed0ff, 0.9).setDepth(4)
    enemy.setData('aimCue', cue)
    this.tweens.add({
      targets: cue,
      scale: 0.55,
      alpha: 0.9,
      duration,
      onComplete: () => {
        if (enemy.active && enemy.getData('aimCue') === cue) enemy.setData('aimCue', undefined)
        cue.destroy()
      },
    })
  }

  private fireEnemySpread(enemy: Phaser.Physics.Arcade.Sprite, target: { x: number; y: number }, spreadDegrees: number) {
    const base = Phaser.Math.Angle.Between(enemy.x, enemy.y, target.x, target.y)
    const spread = Phaser.Math.DegToRad(spreadDegrees)
    ;[base - spread, base, base + spread].forEach((angle) => {
      const distance = 100
      this.fireEnemyBullet(enemy, { x: enemy.x + Math.cos(angle) * distance, y: enemy.y + Math.sin(angle) * distance })
    })
  }

  private fireEnemyBullet(enemy: Phaser.Physics.Arcade.Sprite, target: { x: number; y: number }) {
    const speed = LEVEL_TWO_CONFIG.enemy.gunslinger.bulletSpeed
    const angle = Phaser.Math.Angle.Between(enemy.x, enemy.y, target.x, target.y)
    const bullet = this.physics.add.image(enemy.x, enemy.y, 'enemyBullet')
    bullet.setData('vx', Math.cos(angle) * speed)
    bullet.setData('vy', Math.sin(angle) * speed)
    this.enemyBullets.add(bullet)
  }

  private updateLevelTwo(time: number) {
    if (this.levelTwoCompleted || !this.townRoadFlow.isCombatActive()) return

    const kind = this.levelTwoEncounter.update(time, this.enemies.countActive(true))
    if (kind) this.spawnLevelTwoEnemy(kind)
    this.contestedPickupFlow.updatePlan(time, this.levelTwoDefeats / LEVEL_TWO_TOTAL_ENEMIES)
    this.contestedPickupFlow.updatePrimaryContender()
    if (!this.levelTwoShieldSpawned && this.levelTwoDefeats / LEVEL_TWO_TOTAL_ENEMIES >= LEVEL_TWO_CONFIG.shieldProgress) {
      this.levelTwoShieldSpawned = true
      this.spawnShield(true)
      this.showFloatingText(GAME_WIDTH / 2, 120, 'SHIELD SUPPLY')
    }

    if (this.levelTwoEncounter.isComplete(this.enemies.countActive(true))) {
      this.completeLevelTwo()
    }
  }

  private completeLevelTwo() {
    if (this.levelTwoCompleted) return

    this.levelTwoCompleted = true
    this.levelTwoEncounter.stop()
    this.enemyBullets.clear(true, true)
    this.clearItems()
    this.townRoadFlow.completeCombat()
    this.maxHealth += LEVEL_TWO_CONFIG.completionRewardHealth
    this.health = Math.min(this.maxHealth, this.health + LEVEL_TWO_CONFIG.completionRewardHealth)
    this.rebuildHealthDisplay()
    this.showAreaTitle('TOWN ROAD CLEAR', 'The road is safe... for now')
  }

  private applyEnemyPickup(enemy: Phaser.Physics.Arcade.Sprite, type: ContestedPickupType) {
    const kind = enemy.getData('kind') as EnemyKind
    if (type === 'coffee') {
      if (kind === 'chaser') {
        enemy.setData('kind', 'charger')
        enemy.setTexture('charger')
        enemy.setData('health', LEVEL_TWO_CONFIG.enemy.charger.health)
        enemy.setData('state', 'track')
        enemy.body?.setSize(28, 28, true)
        this.createEnemyHealthPips(enemy)
      } else {
        enemy.setData('coffeeBoosted', true)
      }
      this.setEnemyUpgradeMarker(enemy, type)
    } else if (type === 'dynamite') {
      enemy.setData('explosive', true)
      this.setEnemyUpgradeMarker(enemy, type)
    } else if (kind === 'gunslinger') {
      enemy.setData('upgrade', type)
      this.setEnemyUpgradeMarker(enemy, type)
    }
    this.showFloatingText(enemy.x, enemy.y - 30, 'ENEMY POWER UP')
  }

  private spawnLevelTwoEnemy(kind: EnemyKind) {
    const isFinalGunslinger = kind === 'gunslinger'
      && this.levelTwoEncounter.getCurrentBatchIndex() === LEVEL_TWO_CONFIG.batches.length - 1
    const side = isFinalGunslinger ? (this.finalGunslingersSpawned === 0 ? 3 : 1) : Phaser.Math.Between(0, 3)
    if (isFinalGunslinger) this.finalGunslingersSpawned += 1
    const x = side === 1 ? GAME_WIDTH - 40 : side === 3 ? 40 : Phaser.Math.Between(40, GAME_WIDTH - 40)
    const y = side === 0 ? 40 : side === 2 ? GAME_HEIGHT - 40 : Phaser.Math.Between(40, GAME_HEIGHT - 40)
    const enemy = this.physics.add.sprite(x, y, kind === 'chaser' ? 'enemy' : kind)
    if (kind !== 'chaser') enemy.body?.setSize(28, 28, true)
    const [minSpeed, maxSpeed] = LEVEL_TWO_CONFIG.enemy.chaser.speed

    enemy.setData('kind', kind)
    enemy.setData('health', kind === 'chaser' ? 1 : 2)
    enemy.setData('speed', Phaser.Math.Between(minSpeed, maxSpeed))
    enemy.setData('batchIndex', this.levelTwoEncounter.getCurrentBatchIndex())
    enemy.setData('state', 'track')
    if (kind === 'gunslinger') {
      const gunslingers = this.enemies.getChildren().filter((child) => child.getData('kind') === 'gunslinger').length
      const offsetIndex = Math.min(gunslingers, LEVEL_TWO_CONFIG.enemy.gunslinger.finalAttackOffset.length - 1)
      enemy.setData('nextAttack', this.time.now + LEVEL_TWO_CONFIG.enemy.gunslinger.finalAttackOffset[offsetIndex])
    }
    this.enemies.add(enemy)
    if (kind !== 'chaser') this.createEnemyHealthPips(enemy)
    this.showSpecialEnemyIntroduction(enemy, kind)
  }

  private showSpecialEnemyIntroduction(enemy: Phaser.Physics.Arcade.Sprite, kind: EnemyKind) {
    if (kind === 'chaser') return
    const alreadyIntroduced = kind === 'charger' ? this.chargerIntroducedThisRun : this.gunslingerIntroducedThisRun
    if (alreadyIntroduced) return
    if (kind === 'charger') this.chargerIntroducedThisRun = true
    else this.gunslingerIntroducedThisRun = true

    const color = kind === 'charger' ? 0xffa24a : 0x78b7ff
    const label = this.add.text(enemy.x, enemy.y - 42, kind === 'charger' ? 'CHARGER' : 'GUNSLINGER', {
      fontFamily: 'monospace', fontSize: '16px', color: kind === 'charger' ? '#ffb45e' : '#8cc7ff',
      stroke: '#1e1611', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(14)
    const effect = kind === 'charger'
      ? this.add.triangle(enemy.x, enemy.y, 0, 16, 34, 0, 34, 32, color, 0.18).setStrokeStyle(2, color, 0.9)
      : this.add.circle(enemy.x, enemy.y, 27, color, 0.12).setStrokeStyle(2, color, 0.9)
    effect.setDepth(4)
    enemy.setData('introVisuals', [label, effect])
    const forgetVisual = (object: Phaser.GameObjects.GameObject) => {
      object.destroy()
      if (!enemy.active) return
      const visuals = enemy.getData('introVisuals') as Phaser.GameObjects.GameObject[] | undefined
      enemy.setData('introVisuals', visuals?.filter((visual) => visual !== object))
    }
    this.tweens.add({ targets: effect, scale: 1.45, alpha: 0, duration: 400, onComplete: () => forgetVisual(effect) })
    this.tweens.add({ targets: label, y: label.y - 12, alpha: 0, delay: 650, duration: 350, onComplete: () => forgetVisual(label) })
  }

  private cleanBullets() {
    const cleanGroup = (group: Phaser.Physics.Arcade.Group) => group.getChildren().forEach((child) => {
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
    cleanGroup(this.bullets)
    cleanGroup(this.enemyBullets)
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
