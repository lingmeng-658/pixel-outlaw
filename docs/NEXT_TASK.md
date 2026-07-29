# Next Task: 接入玩家 sprite sheet 动画

## 任务目标

将已经整理完成的正式玩家 sprite sheet 接入 Phaser，实现正式方向动画。

当前资源：

```txt
src/assets/sprites/player/player-sprite-sheet.png
```

资源规格：

- 240×192 RGBA PNG
- 单帧 48×48
- 5 列 × 4 行
- 共 20 帧

方向列：

- Down
- Down-right
- Right
- Up-right
- Up

动作行：

- Idle A
- Idle B
- Run A
- Run B

---

## 本轮只做

1. 使用 Phaser `load.spritesheet()` 加载玩家图集。

2. 创建玩家动画：

Idle：

- idle-down
- idle-down-right
- idle-right
- idle-up-right
- idle-up

Run：

- run-down
- run-down-right
- run-right
- run-up-right
- run-up

3. 增加最小玩家朝向状态：

- 移动时根据最终移动方向更新朝向；
- 停止移动时保持最后朝向播放 idle；
- 不修改射击方向逻辑。

4. 左侧方向复用右侧帧：

- left = right + flipX
- down-left = down-right + flipX
- up-left = up-right + flipX

---

## 本轮不做

禁止：

- 不修改玩家速度；
- 不修改射击系统；
- 不修改敌人；
- 不修改关卡；
- 不修改存档；
- 不修改碰撞数值；
- 不制作受击、死亡、翻滚动画；
- 不继续调整角色设计。

保持：

- 玩家视觉尺寸 48×48；
- Arcade Physics body 仍保持较小且居中；
- 玩法逻辑稳定。

---

## 实现要求

- 不进行大型重构；
- 优先在现有玩家动画逻辑基础上修改；
- 不拆大型 Player 类；
- 功能开发和重构分开。

---

## 验收标准

完成后：

1. `npm run build` 通过。
2. `git diff --check` 通过。
3. `git status` 检查状态。
4. 更新 `docs/AI_HANDOFF.md`：
   - 记录 sprite sheet 已接入；
   - 记录动画 key；
   - 记录朝向状态实现；
   - 记录验证结果和试玩重点。

提交信息：

```txt
feat: 接入玩家 sprite sheet 动画
```
