# Next Task: 玩家双帧跑动动画实验

## 任务状态

已由 Codex 完成代码接入和自动静态验收，等待用户浏览器试玩与主观视觉确认。

当前实现基线：

```txt
a4b03fe feat: 添加玩家跑动帧素材
```

目标提交：

```txt
feat: 接入玩家跑动动画
```

## 本轮实现

- 纹理 `playerIdleDown`：`src/assets/sprites/player/player-idle-down.png`
- 纹理 `playerRunA`：`src/assets/sprites/player/player-run-a.png`
- 纹理 `playerRunB`：`src/assets/sprites/player/player-run-b.png`
- 动画 key：`playerRun`
- 动画参数：`frameRate: 6`、`repeat: -1`
- 动画创建前通过 `this.anims.exists('playerRun')` 检查，Scene restart 不会重复创建。
- `handlePlayerMove()` 设置本帧最终速度后调用 `updatePlayerAnimation()`。
- 玩家实际速度非零时播放 `playerRun`；停止时立即停止动画并恢复 `playerIdleDown`。
- 暂停、区域切换和 Game Over 主动恢复 idle；动画与纹理状态判断避免每帧重复切换。
- 对角移动使用相同动画；不根据移动或射击方向旋转、翻转或更换方向帧。
- 保持玩家原生 32×32 显示与现有 28×28 居中 Arcade body；未修改 origin、scale、depth、出生位置、世界边界或移动速度。

## 自动验收

- 修改前 `npm run build`：通过。
- 修改后 `npm run build`：通过。
- `git diff --check`：通过。
- 仅有既有 Vite 大 chunk 警告，未处理。
- 按用户要求未使用浏览器插件，因此 Codex 未执行浏览器自动验收和 Console 检查。

## 用户试玩清单

运行：

```bash
npm run dev
```

确认：

1. 标题页玩家保持隐藏，START GAME 与 SPACE 正常；
2. 静止时显示 `playerIdleDown`；
3. W、A、S、D 与对角移动时循环播放 `playerRun`；
4. 松开移动键后立即恢复 idle；
5. 动画持续切换 A/B，没有因每帧重启卡在第一帧；
6. 玩家速度、方向和 28×28 碰撞手感不变；
7. 方向键八方向射击不受影响；
8. ESC 暂停时玩家恢复 idle，恢复后移动动画正常；
9. Restart Level 后动画正常；
10. Save Progress & Quit / Continue 后动画正常；
11. Console 无新增未捕获错误或重复动画 key 警告。

## 主观视觉风险

两张跑动帧姿态差异较明显，可能产生身体重心、脚步位置或外轮廓跳动。用户需要主观判断双帧衔接是否比静态贴图滑动更自然。

这是实验版本，不代表正式玩家动画定稿。本轮提交后停止，不继续制作敌人素材、方向帧或更多动画。
