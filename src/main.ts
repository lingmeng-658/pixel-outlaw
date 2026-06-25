import Phaser from 'phaser'
import './style.css'

const GAME_WIDTH = 800
const GAME_HEIGHT = 600

class MainScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite
  private bullets!: Phaser.Physics.Arcade.Group
  private enemies!: Phaser.Physics.Arcade.Group
  private items!: Phaser.Physics.Arcade.Group

  private keys!: Record<string, Phaser.Input.Keyboard.Key>

  private score = 0
  private health = 3
  private isStarted = false
  private isGameOver = false

  private scoreText!: Phaser.GameObjects.Text
  private healthText!: Phaser.GameObjects.Text
  private waveText!: Phaser.GameObjects.Text
  private titleText!: Phaser.GameObjects.Text
  private startText!: Phaser.GameObjects.Text
  private tipText!: Phaser.GameObjects.Text
  private gameOverText!: Phaser.GameObjects.Text

  private lastShotTime = 0
  private lastSpawnTime = 0
  private lastDamageTime = 0

  private normalPlayerSpeed = 220
  private boostedPlayerSpeed = 315
  private playerSpeed = 220
  private speedBoostUntil = 0

  private levelStartTime = 0
  private coffeeSpawned = false

  private wave = 1
  private enemiesToSpawn = 4
  private enemiesSpawned = 0
  private enemiesCleared = 0
  private isLevelClear = false

  constructor() {
    super('MainScene')
  }

  create() {
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

    this.healthText = this.add.text(24, 50, 'HP: 3', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#ffb3a7',
    })

    this.waveText = this.add.text(GAME_WIDTH - 24, 20, 'Wave: 1', {
      fontFamily: 'monospace',
      fontSize: '22px',
      color: '#ffe6a7',
    }).setOrigin(1, 0)

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

    this.tipText = this.add.text(GAME_WIDTH / 2, 370, 'Click START or press SPACE\nWASD move  |  Arrow keys shoot', {
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

    if (!this.input.keyboard) {
      throw new Error('Keyboard input is not available')
    }

    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,R') as Record<string, Phaser.Input.Keyboard.Key>

    this.startText.on('pointerdown', () => {
      this.startGame()
    })

    this.physics.add.overlap(this.player, this.enemies, (_playerObject, enemyObject) => {
      if (!this.isStarted || this.isGameOver) return

      const now = this.time.now
      if (now - this.lastDamageTime < 700) return

      this.lastDamageTime = now
      this.health -= 1
      this.healthText.setText(`HP: ${this.health}`)

      const enemy = enemyObject as Phaser.Physics.Arcade.Sprite
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
      }
    })
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

    this.updateLevelOne(time)
    this.updateSpeedBoost(time)
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
    this.health = 3
    this.isStarted = false
    this.isGameOver = false

    this.lastShotTime = 0
    this.lastSpawnTime = 0
    this.lastDamageTime = 0
    
    this.playerSpeed = this.normalPlayerSpeed
    this.speedBoostUntil = 0
    this.levelStartTime = 0
    this.coffeeSpawned = false

    this.wave = 1
    this.enemiesToSpawn = 4
    this.enemiesSpawned = 0
    this.enemiesCleared = 0
    this.isLevelClear = false
  }

  private handleStartInput() {
    if (Phaser.Input.Keyboard.JustDown(this.keys.SPACE)) {
      this.startGame()
    }
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
    this.isGameOver = true
    this.player.setVelocity(0, 0)

    this.enemies.clear(true, true)
    this.bullets.clear(true, true)
    this.clearItems()

    this.gameOverText.setText(`GAME OVER\nScore: ${this.score}\nPress R to restart`)
  }

    private updateLevelOne(time: number) {
    if (this.levelStartTime === 0 || this.coffeeSpawned || this.isLevelClear) return

    const elapsed = time - this.levelStartTime

    if (elapsed >= 9000) {
      this.spawnCoffee(true)
      this.coffeeSpawned = true
    }
  }

  private spawnCoffee(showLabel = true) {
    const x = GAME_WIDTH / 2
    const y = GAME_HEIGHT / 2 + 90

    const glow = this.add.image(x, y, 'itemGlow')
    glow.setAlpha(0.65)
    glow.setDepth(1)

    const coffee = this.physics.add.sprite(x, y, 'coffee')
    coffee.setData('type', 'coffee')
    coffee.setData('glow', glow)
    coffee.setDepth(2)
    this.items.add(coffee)

    this.tweens.add({
      targets: [coffee, glow],
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
      this.showFloatingText(coffee.x, coffee.y - 30, 'COFFEE')
    }
  }

  private activateSpeedBoost(time: number) {
    this.playerSpeed = this.boostedPlayerSpeed
    this.speedBoostUntil = time + 4500

    this.showFloatingText(this.player.x, this.player.y - 34, 'SPEED UP')
  }

  private updateSpeedBoost(time: number) {
    if (this.speedBoostUntil === 0) return

    if (time >= this.speedBoostUntil) {
      this.playerSpeed = this.normalPlayerSpeed
      this.speedBoostUntil = 0
    }
  }

  private showWaveClearText() {
    const text = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 80, 'WAVE CLEAR', {
      fontFamily: 'monospace',
      fontSize: '38px',
      color: '#fff0a3',
      stroke: '#2b1d16',
      strokeThickness: 6,
    }).setOrigin(0.5)

    text.setAlpha(0)
    text.setScale(0.92)

    this.tweens.add({
      targets: text,
      alpha: 1,
      scale: 1.08,
      y: text.y - 4,
      duration: 220,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: text,
          y: text.y - 28,
          alpha: 0,
          scale: 1.16,
          duration: 650,
          delay: 900,
          ease: 'Sine.easeInOut',
          onComplete: () => {
            text.destroy()
          },
        })
      },
    })
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
    const shootCooldown = 180

    if (time - this.lastShotTime < shootCooldown) return

    const bulletSpeed = 460
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
    this.showWaveClearText()
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
    const spawnCooldown = 900

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
    const preCoffeePressure = !this.coffeeSpawned && elapsed >= 5000 ? 12 : 0

    enemy.setData('speed', Phaser.Math.Between(70, 105) + preCoffeePressure)
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
