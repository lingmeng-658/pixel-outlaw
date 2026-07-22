# Next Task: 简化 Continue 为关卡级检查点

## 背景

当前版本已经实现了“阶段起点检查点式 Continue Saved Game”，但试玩发现该设计在第一关中途会产生不自然体验：

- 玩家在 Heart / Coffee / Shield 阶段保存退出后，Continue 会回到该阶段起点。
- 因为阶段会重新开始，道具也可能重新生成，导致玩家可以重复获得血瓶、Coffee 或 Shield。
- 这说明阶段级检查点对当前 Pixel Outlaw 的代码和玩法粒度过细。

本轮决定收窄设计：**Save Progress & Quit 不再保存第一关中途波次；未通关时 Continue 一律从当前关卡开头重新开始。**

---

## 本次目标

将 Continue Saved Game 从“阶段级检查点恢复”简化为“关卡级检查点恢复”。

玩家层面的新规则：

1. 如果第一关尚未通关：
   - Continue 后从 Dusty Outskirts 第一关开头重新开始。
   - 不恢复 Heart / Coffee / Shield / final 等中途阶段。
   - 不恢复中途道具、敌人、子弹、金币掉落进度或临时效果。

2. 如果第一关已经通关，且保存时在 Dusty Outskirts：
   - Continue 后恢复已通关的 Dusty Outskirts。
   - 北侧出口开放。

3. 如果第一关已经通关，且保存时在 Town Road：
   - Continue 后恢复 Town Road。
   - 可以返回已通关的 Dusty Outskirts。

---

## 不做什么

- 不恢复完整战场快照。
- 不恢复第一关中途波次。
- 不新增删除存档按钮。
- 不新增商店、第二关、新道具或道具争夺机制。
- 不重构 MainScene。
- 不修改敌人数量、道具效果、关卡节奏或金币掉落平衡。
- 不自动 push。

---

## 具体修改要求

### 1. Continue 逻辑

修改 `src/main.ts` 的恢复逻辑：

- 当 `saveData.levelCompleted === false` 时：
  - 不再调用 Heart / Coffee / Shield / final 的阶段恢复。
  - 直接从 Dusty Outskirts 第一关开头开始。
  - 新游戏式初始化战斗相关状态。
  - 建议恢复为：
    - `score = 0`
    - `health = MAX_HEALTH`
    - `coins = 0`
    - `currentArea = 'dustyOutskirts'`
    - `levelCompleted = false`
    - `stage = 'intro'` 或等价的第一关初始状态
    - 金币掉落按新游戏重新随机

- 当 `saveData.levelCompleted === true && saveData.area === 'dustyOutskirts'` 时：
  - 恢复已通关的 Dusty Outskirts。
  - 出口开放。

- 当 `saveData.levelCompleted === true && saveData.area === 'townRoad'` 时：
  - 恢复 Town Road。
  - 保证返回 Dusty Outskirts 后不会重新刷第一关。

### 2. 标题页 Continue 显示

修复“看似无存档但仍显示 Continue”的问题。请先判断是否确实是浏览器 localStorage 中存在旧存档；如果代码层面存在误判，需要修正。

要求：

- 清空 `localStorage.removeItem('pixel-outlaw-save')` 后，刷新标题页不应显示 Continue。
- 只有 `loadLevelOneSaveData()` 返回有效存档时才显示 Continue。
- 损坏存档、非法存档、不支持版本不显示 Continue，Start Game 仍可用。

### 3. 存档结构

可以保留当前 version 2 结构，但不要再依赖 `stage` 恢复中途波次。

建议处理：

- 未通关保存时，`stage` 可以继续写入当前推导值，但 Continue 时应忽略中途阶段并从 intro 开始。
- 或者未通关保存时统一写入 `stage: 'intro'`，但必须保持逻辑清晰。
- v1 旧存档：
  - `stage === 'clear'` 视为已通关。
  - 其他阶段视为未通关，从关卡开头开始。
  - 不补发金币，不恢复金币进度。

### 4. 文档同步

更新：

- `PROJECT_CONTEXT.md`
- `docs/AI_HANDOFF.md`

将原来的“阶段起点检查点恢复”调整为“关卡级检查点恢复”：

- 未通关：从第一关开头继续。
- 已通关：恢复区域和出口状态。
- 不保存第一关中途波次。

---

## 验收标准

1. `npm run build` 通过。
2. 清空 localStorage 后，标题页不显示 Continue。
3. 无存档时 Start Game / SPACE 正常开始新游戏。
4. 第一关未通关时保存退出，Continue 从第一关开头开始。
5. 未通关 Continue 不会重复恢复 Heart / Coffee / Shield 中途阶段。
6. 通关后保存退出，Continue 恢复已通关 Dusty Outskirts，出口开放。
7. Town Road 保存退出，Continue 回到 Town Road，并能返回已通关的 Dusty Outskirts。
8. New Game 不继承旧存档的 score / health / coins / 阶段。
9. 损坏存档或非法存档不崩溃，Continue 不显示或不可用。
10. `git diff --stat` 和 `git status` 输出符合本轮预期修改文件。
11. 本轮结束后更新 `docs/AI_HANDOFF.md`。

---

## Codex 收尾要求

完成后请输出并同步记录到 `docs/AI_HANDOFF.md`：

- 本轮目标
- 修改了哪些文件
- 修改了哪些函数 / 模块
- 是否改变玩法
- `npm run build` 结果
- `git diff --stat`
- `git status`
- 当前风险
- 人工试玩清单
- 是否 commit

如果 build 通过，并且只修改本轮预期文件，可以 commit：

```txt
fix: 简化继续游戏为关卡级检查点
```

不要 push。