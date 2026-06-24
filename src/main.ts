import Phaser from 'phaser'
import './style.css'

const GAME_WIDTH = 800
const GAME_HEIGHT = 600

class MainScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite
  private bullets!: Phaser.Physics.Arcade.Group
  private enemies!: Phaser.Physics.Arcade.Group

  private keys!: Record<string, Phaser.Input.Keyboard.Key>

  private score = 0
  private health = 3
  private isStarted = false
  private isGameOver = false

  private scoreText!: Phaser.GameObjects.Text
  private healthText!: Phaser.GameObjects.Text
  private titleText!: Phaser.GameObjects.Text
  private startText!: Phaser.GameObjects.Text
  private tipText!: Phaser.GameObjects.Text
  private gameOverText!: Phaser.GameObjects.Text

  private lastShotTime = 0
  private lastSpawnTime = 0
  private lastDamageTime = 0

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

    this.gameOhandleShootingverText.setText(`GAME OVER\nScore: ${this.score}\nPress R to restart`)
  }

  private handlePlayerMove() {
    const speed = 220
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
        }
      })
    })
  }

  private addScore(points: number, x: number, y: number) {
    this.score += points
    this.scoreText.setText(`Score: ${this.score}`)
    this.showScorePopup(x, y, points)
  }

  private showScorePopup(x: number, y: number, points: number) {
    const popup = this.add.text(x, y, `+${points}`, {
      fontFamily: 'monospace',
      fontSize: '18px',
      color: '#ffe6a7',
      stroke: '#2b1d16',
      strokeThickness: 3,
    }).setOrigin(0.5)

    this.tweens.add({
      targets: popup,
      y: y - 28,
      alpha: 0,
      duration: 500,
      ease: 'Quad.easeOut',
      onComplete: () => {
        popup.destroy()
      },
    })
  }

  private spawnEnemies(time: number) {
    const spawnCooldown = 900

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
    enemy.setData('speed', Phaser.Math.Between(70, 105))
    this.enemies.add(enemy)
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
