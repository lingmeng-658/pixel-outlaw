# Pixel Outlaw 项目上下文

## 项目定位

Pixel Outlaw 是一个基于 Vite + TypeScript + Phaser 的西部像素风俯视角射击小游戏。

当前目标不是做一次性 demo，而是逐步做成一个能给朋友试玩的小作品。

## 当前技术栈

- Vite
- TypeScript
- Phaser
- 本地开发：npm run dev
- 正式检查：npm run build

## 当前核心玩法

- 标题页 Start Game
- WASD 移动
- 方向键八方向射击
- 敌人从边缘生成并追踪玩家
- 子弹击中敌人加分
- 玩家碰到敌人扣血
- HP 使用爱心 UI 显示
- Game Over 后按 R 重开
- ESC 打开暂停菜单

## 当前第一关设计

第一关主题：教玩家如何活下来。

阶段顺序大致为：

1. 初始基础战斗
2. 如果玩家掉血，插入血瓶教学
3. Coffee 加速教学
4. Shield 护盾教学
5. 最终压力波
6. 关底补给血瓶

内部波次不显示大号 WAVE CLEAR，以免打断爽感。阶段之间通过短暂停顿和道具出现自然过渡。

## 已实现道具

### Coffee

- 拾取后短时间稳定提高玩家速度
- 效果持续期间 HP 区域持续鼓动
- 到期后速度恢复正常，鼓动停止

### Heart / Potion

- 缺血时恢复 1 点 HP
- 满血时显示 FULL HP
- 中途教学时偏中心随机出现
- 关底补给时固定出现在中央偏下位置

### Shield

- 拾取后获得 1 次格挡
- 有持续时间
- 玩家身上出现护盾光环
- HP 后方显示护盾图标和数字
- 撞敌时显示 BLOCK，不扣血，护盾立即消失
- 快到期时护盾图标和光环闪烁，越接近结束闪得越快

## 暂停菜单

按 ESC 打开暂停菜单。

菜单选项：

- ESC Continue
- R Restart Level
- S Save Progress & Quit

当前 Save Progress 只保存第一关内置阶段进度，不保存完整战场快照。

localStorage key：

```txt
pixel-outlaw-save
