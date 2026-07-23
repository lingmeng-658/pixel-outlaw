import Phaser from 'phaser'
import { GAME_HEIGHT, GAME_WIDTH } from './constants'
import { LEVEL_TWO_CONFIG } from './levelTwo'

export class TownRoadFlow {
  private readonly scene: Phaser.Scene
  private combatStarted = false
  private returnOpen = false
  private combatTriggerObjects: Phaser.GameObjects.GameObject[] = []
  private returnObjects: Phaser.GameObjects.GameObject[] = []

  constructor(scene: Phaser.Scene) {
    this.scene = scene
  }

  enterPreparation() {
    this.combatStarted = false
    this.showCombatTrigger()
    this.setReturnOpen(true)
  }

  enterCompleted() {
    this.combatStarted = false
    this.clearCombatTrigger()
    this.setReturnOpen(true)
  }

  tryStartCombat(playerY: number) {
    if (this.combatStarted || playerY > LEVEL_TWO_CONFIG.combatEntry.triggerY) return false

    this.combatStarted = true
    this.clearCombatTrigger()
    this.setReturnOpen(false)
    return true
  }

  completeCombat() {
    this.combatStarted = false
    this.clearCombatTrigger()
    this.setReturnOpen(true)
  }

  leaveTownRoad() {
    this.combatStarted = false
    this.clearCombatTrigger()
    this.setReturnOpen(false)
  }

  canReturn() {
    return this.returnOpen
  }

  isCombatActive() {
    return this.combatStarted
  }

  private showCombatTrigger() {
    this.clearCombatTrigger()
    const { triggerY, lineWidth } = LEVEL_TWO_CONFIG.combatEntry
    const line = this.scene.add.rectangle(GAME_WIDTH / 2, triggerY, lineWidth, 4, 0xffc857, 0.82)
      .setStrokeStyle(1, 0x2b1d16).setDepth(6)
    const prompt = this.scene.add.text(GAME_WIDTH / 2, triggerY + 28, 'MOVE NORTH TO ENGAGE', {
      fontFamily: 'monospace',
      fontSize: '16px',
      color: '#ffe6a7',
      stroke: '#2b1d16',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(8)
    this.combatTriggerObjects = [line, prompt]
    this.scene.tweens.add({
      targets: prompt,
      alpha: 0.45,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })
  }

  private setReturnOpen(open: boolean) {
    this.returnOpen = open
    this.clearReturnObjects()
    if (!open) return

    const returnSign = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 76, 'BACK TO OUTSKIRTS', {
      fontFamily: 'monospace',
      fontSize: '15px',
      color: '#ffe6a7',
      stroke: '#2b1d16',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(8)
    const returnArrow = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 42, '↓', {
      fontFamily: 'monospace',
      fontSize: '28px',
      color: '#ffe6a7',
      stroke: '#2b1d16',
      strokeThickness: 4,
    }).setOrigin(0.5).setDepth(8)
    this.returnObjects = [returnSign, returnArrow]
  }

  private clearCombatTrigger() {
    this.destroyObjects(this.combatTriggerObjects)
    this.combatTriggerObjects = []
  }

  private clearReturnObjects() {
    this.destroyObjects(this.returnObjects)
    this.returnObjects = []
  }

  private destroyObjects(objects: Phaser.GameObjects.GameObject[]) {
    objects.forEach((object) => {
      this.scene.tweens.killTweensOf(object)
      object.destroy()
    })
  }
}
