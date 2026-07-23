# Next Task: 修复关卡重开、存档与新游戏状态污染

## 任务状态

等待 Codex 执行。

当前代码基线：

```txt
1b3186f refactor: 拆分道具争夺控制
```

用户已经实际发现以下问题：

1. 完成第二关后，在 Town Road 暂停并选择 `Restart Level`，第二关无法正常回到未完成的准备阶段；
2. 完成第二关后，`Save Progress & Quit` 的保存 / 退出 / 恢复行为异常；
3. 完成第二关并返回 Dusty Outskirts 后选择 Restart，会从第一关开头开始，但错误保留第二关增加的最大生命和其他运行时数据。

本轮必须停止继续拆分模块，只修复上述状态生命周期问题。

---

## 开始前必须阅读

1. `AGENTS.md`
2. `PROJECT_CONTEXT.md`
3. `docs/AI_HANDOFF.md`
4. 本文件
5. 当前 Git 历史、分支与工作树状态
6. 当前源码，重点包括：
   - `src/main.ts`
   - `src/save.ts`
   - `src/townRoadFlow.ts`
   - `src/contestedPickup.ts`
   - `src/encounter.ts`

开始前运行：

```bash
git pull --ff-only
npm run build
git status
```

修改前先输出：

- 本轮目标；
- 不做什么；
- 验收标准；
- 预计修改文件；
- 主要风险；
- 当前 `git status`。

---

# 一、已确认的根因

## 1. `clearLevelCompleteText()` 混入了游戏状态重置

当前函数本应只负责销毁 `DUSTY OUTSKIRTS CLEAR` 文本，却同时重置：

```ts
levelTwoCompleted
levelTwoDefeats
ContinuousEncounter
ContestedPickupController
武器与炸药状态
第二关掉落状态
townCheckpoint
```

这会导致：

- 第一关完成文字消失时，第二关完成状态可能被悄悄改回未完成；
- 从存档恢复到 Dusty Outskirts 后，完成文字自动消失会破坏已恢复的 `levelTwoCompleted`；
- 进入 Town Road 时刚记录的入口检查点可能被立刻覆盖为默认值；
- 保存本身即使成功，恢复后的状态仍可能随后被 UI 清理函数改写。

### 必须修复

`clearLevelCompleteText()` 必须变成纯视觉清理：

- 停止该文本 tween；
- 销毁文本；
- 清空引用；
- 不修改任何关卡、奖励、检查点、遭遇、争夺、武器或存档状态。

游戏状态重置必须放进语义明确的运行重置路径，不能再由 UI helper 隐式承担。

## 2. `resetGameState()` 没有完整重置一次运行的数据

Phaser 的 `scene.restart()` 会复用同一个 Scene 实例，类字段初始化不会替代显式重置。

当前 `resetGameState()` 重置了基础分数、生命和第一关部分字段，但遗漏了至少：

```ts
maxHealth
levelTwoCompleted
levelTwoDefeats
townCheckpoint
weaponMode
weaponModeUntil
dynamiteCharges
shotActionId
explosiveActions
adaptiveSecondBusy
heartDropReadyAt
heartDropKillsRemaining
mercyDropAttempts
mercyArmed
levelTwoShieldSpawned
finalGunslingersSpawned
chargerIntroducedThisRun
gunslingerIntroducedThisRun
```

以及场景重启后仍可能持有旧引用的第二关控制器 / 遭遇运行时状态。

### 必须修复

建立明确、完整且可审查的“新运行重置”路径：

- 新游戏必须恢复 `MAX_HEALTH`；
- 第二关完成奖励不得继承到新游戏；
- 分数、金币、当前生命、最大生命、武器、炸药、护盾、遭遇、争夺、检查点和第二关进度均回到干净初始状态；
- 场景绑定的控制器不能继续保存上一个 Scene 生命周期中的 GameObject、Timer 或敌人引用；
- 不得在物理组尚未创建时调用依赖 `this.enemies` / `this.items` 的清理逻辑。

可以通过小型具名 helper、在合适的 `create()` 阶段重新建立控制器，或其他明确且安全的方式实现；不要进行无关架构重写。

---

# 二、目标行为

## 1. 在 Town Road 重开第二关

第二关无论处于战斗中还是已经完成，只要当前区域仍是 Town Road，暂停后选择 `Restart Level`：

- 回到 Town Road 南侧准备区；
- 第二关回到未完成状态；
- 不立即出怪；
- 可以返回 Dusty Outskirts；
- 向北越线后重新开始第二关；
- 分数、金币、当前生命、最大生命恢复到第一次进入 Town Road 时的 `townCheckpoint`；
- 已发放的第二关最大生命奖励被回滚，不得叠加；
- 争夺预警、黄色 `!`、道具、敌人、子弹和旧计时器无残留。

## 2. 第二关完成后保存并退出

在 Town Road 完成第二关后暂停并选择 `Save Progress & Quit`：

- 存档写入成功；
- 返回干净的标题页；
- 标题页运行时不得继续显示或继承上一局增加后的生命、武器、炸药、护盾等状态；
- `CONTINUE SAVED GAME` 可用；
- Continue 后恢复第二关已完成状态；
- 最大生命奖励只保留一次；
- Town Road 南侧入口开放；
- 不显示战斗触发线，不重新开战。

## 3. 在 Dusty Outskirts 保存已完成第二关的进度

完成第二关并返回 Dusty Outskirts 后保存：

- Continue 后仍保留 `levelTwoCompleted = true`；
- 第一关完成文字自动消失时不得改写第二关状态；
- 再进入 Town Road 时不重新开战；
- 不重复发放第二关生命奖励。

## 4. 在 Dusty Outskirts 重开

完成第二关并返回 Dusty Outskirts 后选择 `Restart Level`：

- 按当前语义，从第一关开头开始一局全新的游戏；
- 分数为 0；
- 金币为 0；
- 当前生命和最大生命均恢复基础值；
- 第二关完成状态、检查点、武器、炸药、护盾和其他运行时数据全部清空；
- 不继承上一局任何第二关奖励。

---

# 三、实现边界

## 本轮可以做

- 让 `clearLevelCompleteText()` 只负责视觉；
- 补全或拆分 `resetGameState()` 的明确重置职责；
- 让 `restartCurrentLevel()` 明确区分 Town Road 检查点重开和 Dusty Outskirts 全新运行；
- 修复保存后返回标题页的运行时污染；
- 确保 `restoreSavedGame()` 恢复的状态不会被后续 UI 清理破坏；
- 为场景生命周期安全地重置 / 重建 `ContinuousEncounter`、`TownRoadFlow`、`ContestedPickupController`；
- 增加少量纯函数或强类型辅助类型以避免重复。

## 本轮严格不做

- 不修改存档版本，除非现有 version 3 无法表达目标语义；从当前结构看原则上不需要升级；
- 不改变敌人数量、批次、速度、攻击、掉落和争夺数值；
- 不修改第二关完成奖励数值；
- 不调整第一关流程和波次数值；
- 不继续拆分敌人视觉、玩家、UI 或其他模块；
- 不实现第三关、商店或开发菜单；
- 不安装新依赖；
- 不通过删除存档规避恢复问题；
- 不让 Restart 与 Continue 共用含义模糊的布尔参数。

---

# 四、代码验收标准

1. `clearLevelCompleteText()` 不再修改任何游戏进度字段；
2. 新游戏重置路径完整覆盖最大生命、第二关完成状态、检查点和所有第二关运行时字段；
3. Town Road Restart 明确恢复入口检查点并重置第二关；
4. Dusty Outskirts Restart 明确开始干净新游戏；
5. Save & Quit 后标题页是干净运行时，但存档仍可继续；
6. Continue 能正确恢复在 Town Road 或 Dusty Outskirts 保存的第二关完成状态；
7. 控制器、Timer、Tween、GameObject 和敌人引用不跨 Scene 生命周期残留；
8. 不使用 `any`；
9. 不修改玩法配置；
10. `npm run build` 和 `git diff --check` 通过。

---

# 五、人工回归顺序

至少完成以下测试：

```txt
K → 进入 Town Road → L 完成第二关
→ ESC → R
→ 确认回到 Town Road 准备区
→ 确认最大生命和其他数据恢复入口检查点

K → 进入 Town Road → L 完成第二关
→ ESC → S 保存退出
→ 确认标题页干净
→ Continue
→ 确认第二关保持完成且奖励没有重复

完成第二关 → 返回 Dusty Outskirts
→ ESC → S 保存退出
→ Continue
→ 等待第一关完成文字自动消失
→ 再进入 Town Road
→ 确认不会重新开战

完成第二关 → 返回 Dusty Outskirts
→ ESC → R
→ 确认第一关从头开始
→ 确认基础最大生命、0 分、0 金币和无第二关残留
```

额外确认：

- 连续 Restart 不产生重复触发线、返回文字或黄色标记；
- Continue 后连续往返两张地图不重复奖励；
- 本地 `K`、`L` 快捷键仍正常；
- 线上行为不新增调试入口。

---

# 六、完成流程

完成后运行：

```bash
npm run build
npm run dev
git diff --check
git diff
git status
```

更新：

- `PROJECT_CONTEXT.md`：明确 Restart / Save / New Game 的状态语义；
- `docs/AI_HANDOFF.md`：记录根因、实际修改、构建结果和人工测试重点。

提交信息：

```txt
fix: 修复关卡重开与存档状态
```

commit 并 push `main` 后立即停止，不继续进行下一轮重构。