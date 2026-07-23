# Next Task: 建立可复用关卡生命周期并修复状态污染

## 任务状态

等待 Codex 执行。

当前代码基线：

```txt
1b3186f refactor: 拆分道具争夺控制
bca68a2 docs: 安排关卡状态修复
```

用户实际发现：

1. 完成第二关后，在 Town Road 暂停并选择 `Restart Level`，无法正常重新开始第二关；
2. 完成第二关后，`Save Progress & Quit` 的保存、退出或恢复行为异常；
3. 完成第二关并返回 Dusty Outskirts 后 Restart，第一关虽然从头开始，却错误保留增加后的最大生命及其他旧运行数据。

用户进一步确认：本轮不能只写成第二关专用补丁。Restart、Save、Continue、New Game 和关卡入口检查点属于通用关卡生命周期，后续第三关、第四关必须能够复用。

本轮停止继续拆分战斗模块，先建立最小、清晰、可扩展的关卡生命周期边界，并用第一关 / 第二关完成首次接入。

---

## 一、开始前必须阅读

1. `AGENTS.md`
2. `PROJECT_CONTEXT.md`
3. `docs/AI_HANDOFF.md`
4. 本文件
5. 当前 Git 历史、分支与工作树状态
6. 当前源码，重点包括：
   - `src/main.ts`
   - `src/save.ts`
   - `src/types.ts`
   - `src/townRoadFlow.ts`
   - `src/contestedPickup.ts`
   - `src/encounter.ts`

开始前执行：

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

# 二、长期设计决定

## 1. 这不是 Town Road 专用修复

本轮要形成可供后续关卡复用的统一流程：

```txt
开始新运行
→ 进入未完成关卡时建立入口检查点
→ 当前关卡战斗与奖励只修改本次运行
→ Restart 恢复当前关卡入口检查点
→ Save & Quit 序列化运行进度并销毁场景运行时
→ Continue 从存档重建运行进度和对应关卡状态
```

第二关只是当前唯一需要检查点重开的后续关卡，不代表类型、方法或场景参数可以命名为 `townCheckpoint`、`restartTownRoad` 等第二关专用形式。

后续第三关、第四关接入时，应复用同一套：

- 入口检查点捕获；
- 当前关卡重开编排；
- 新游戏彻底重置；
- 保存退出后的运行时清理；
- Continue 恢复；
- 完成奖励幂等保护。

每个新关卡只应增加自己的“关卡运行时重置 / 进入关卡”适配，不应复制一整套 Restart、Save、Continue 和 New Game。

## 2. 明确区分四类状态

### A. 运行进度 Run Progress

跨关卡保留、可以进入存档或检查点的状态，例如：

- 分数；
- 金币；
- 当前生命；
- 最大生命；
- 已完成的前置关卡进度；
- 已经正式获得的永久奖励。

### B. 关卡入口检查点 Level Entry Checkpoint

进入一个尚未完成、允许重开的关卡时，对当时运行进度做快照。

检查点至少要有：

- 关卡 / 区域身份；
- 分数；
- 金币；
- 当前生命；
- 最大生命；
- 足以保留前置关卡完成状态的进度信息。

具体实现可以使用 `completedThrough`、强类型 progression snapshot 或语义相近的结构，但不得只保存第二关专用布尔值，也不得命名为 `townCheckpoint`。

未来进入第三关时，第三关检查点必须保留第二关已经完成及其合法奖励；Restart 第三关只回滚第三关，不得把第二关也清掉。

### C. 当前关卡运行时 Level Runtime

不能进入检查点或存档、Restart 时必须重新创建的状态，例如：

- 敌人、子弹、场上道具；
- 遭遇批次；
- Timer、Tween、GameObject 引用；
- 争夺预警和抢夺者；
- 当前关卡临时武器与炸药；
- 当前关卡临时 AI 状态。

### D. 纯视觉状态 View State

标题、通关文字、区域标题、提示标记等。

视觉清理函数只能清理视觉，绝不能顺便重置运行进度、关卡完成标志、检查点或遭遇状态。

---

# 三、建议的最小通用边界

具体名称允许调整，但语义必须清晰。

## 1. 通用检查点类型

可以新增小型强类型，例如：

```ts
type LevelCheckpoint = {
  level: number
  area: AreaId
  score: number
  coins: number
  health: number
  maxHealth: number
  progression: /* 足以恢复前置关卡完成状态的强类型快照 */
}
```

也可以把玩家资源和 progression 分成嵌套结构。

要求：

- 名称不得绑定 Town Road；
- 不使用 `any`；
- 只保存跨关卡运行进度，不保存敌人、坐标、Timer、Tween 或中途批次；
- 当前第二关接入后，未来第三关可以直接使用同一类型。

## 2. 明确的场景启动意图

当前 `create(data?: { autoStart?: boolean; townCheckpoint?: ... })` 语义模糊且绑定第二关。

改成可辨别的强类型启动数据，形式可类似：

```ts
type SceneStartData =
  | { mode: 'title' }
  | { mode: 'newRun'; autoStart: true }
  | { mode: 'restartLevel'; checkpoint: LevelCheckpoint }
```

确切结构可以调整，但必须做到：

- New Game、返回标题页、Restart Current Level 的意图互不混淆；
- 不再用多个可选布尔值拼出隐式状态；
- 不再使用 `townCheckpoint` 参数；
- Continue 可以继续从合法存档恢复，不必为了形式强行塞进 scene data。

## 3. 通用编排 + 关卡适配

建议形成语义明确的 helper：

```ts
captureLevelCheckpoint(...)
restoreLevelCheckpoint(...)
resetRunState()
resetCurrentLevelRuntime(...)
restartCurrentLevel()
```

名称可以调整。

其中：

- 检查点捕获、资源恢复、新运行重置和 Restart 编排是通用逻辑；
- `resetLevelTwoRuntime()`、Town Road 准备区恢复等仍是第二关适配；
- 后续第三关只增加 `resetLevelThreeRuntime()` / `enterLevelThreeFromCheckpoint()` 一类适配，不复制外层编排。

允许新增 `src/runProgress.ts`、`src/levelLifecycle.ts` 或语义相近的小模块，但只能放强类型、纯数据或纯函数边界。不要建立持有整个 Phaser Scene、几十个 callbacks 的万能管理器。

---

# 四、已确认根因

## 1. `clearLevelCompleteText()` 混入游戏状态重置

当前函数销毁第一关完成文字时，还会重置：

```txt
levelTwoCompleted
levelTwoDefeats
ContinuousEncounter
ContestedPickupController
武器与炸药状态
第二关掉落状态
townCheckpoint
```

导致：

- UI 文字淡出会修改游戏进度；
- Continue 恢复的第二关完成状态可能随后被清空；
- 进入 Town Road 时刚建立的检查点可能被立即覆盖；
- 保存本身成功，但恢复后的状态又被 UI helper 破坏。

必须让 `clearLevelCompleteText()` 变成纯视觉清理：

- 停止文本 tween；
- 销毁文本；
- 清空文本引用；
- 不修改任何运行、关卡、奖励、检查点、遭遇、争夺、武器或存档字段。

## 2. `resetGameState()` 没有完整重置一次运行

Phaser `scene.restart()` 会复用同一个 Scene 实例，字段初始化不能替代显式重置。

当前遗漏至少包括：

```txt
maxHealth
levelTwoCompleted
levelTwoDefeats
旧检查点
weaponMode / weaponModeUntil
dynamiteCharges
shotActionId / explosiveActions
adaptiveSecondBusy
回复掉落状态
第二关 Shield 与特殊敌人登场状态
ContinuousEncounter
TownRoadFlow
ContestedPickupController 内部引用
```

New Game 必须走完整 `resetRunState()`，而不是只重置部分第一关字段。

## 3. 已完成关卡重新进入可能覆盖旧检查点

检查点应表示“开始当前未完成关卡之前”的运行进度。

完成第二关、离开再返回时，不得把增加最大生命后的状态覆盖成第二关入口检查点，否则 Restart 后可能保留奖励并再次通关叠加奖励。

当前接入至少保证：

- 第一次进入未完成 Town Road 时捕获第二关入口检查点；
- 第二关完成不会覆盖这个检查点；
- 重新进入已完成 Town Road 不会把通关后进度写回第二关入口检查点；
- Restart 第二关恢复通关前检查点并重新开始，奖励可以重新获得但不能叠加。

未来进入下一未完成关卡时，再建立新的当前关卡检查点。

---

# 五、目标行为

## 1. Town Road Restart

第二关处于准备、战斗或刚完成状态，只要当前区域仍是 Town Road，暂停后选择 `Restart Level`：

- 恢复第二关入口检查点；
- 保留第一关已经完成的事实；
- 第二关恢复未完成；
- 回到南侧准备区；
- 不立即出怪；
- 可以返回 Dusty Outskirts；
- 向北越线后重新开始；
- 已发放的第二关最大生命奖励被回滚；
- 争夺预警、黄色 `!`、敌人、子弹、道具和旧计时器无残留。

## 2. 第二关完成后 Save & Quit

- 存档成功；
- 返回干净标题页；
- 标题页不继承上一局生命 UI、武器、炸药、护盾或控制器运行时；
- Continue 恢复第二关已完成状态；
- 最大生命奖励只保留一次；
- Town Road 返回入口开放；
- 不显示战斗触发线，不重新开战。

## 3. 完成第二关后在 Dusty Outskirts 保存

- Continue 后仍保留第二关完成状态；
- 第一关完成文字淡出不修改进度；
- 再进入 Town Road 不重新开战；
- 不重复奖励。

## 4. Dusty Outskirts Restart / New Game

按当前语义，从第一关开头开始一局干净的新运行：

- 分数 0；
- 金币 0；
- 当前生命和最大生命恢复基础值；
- 所有关卡完成状态、检查点、武器、炸药、护盾和运行时对象清空；
- 不继承第二关奖励。

## 5. 后续关卡复用验收

代码结构必须能表达：

```txt
完成第二关并获得奖励
→ 进入第三关时捕获第三关入口检查点
→ Restart 第三关
→ 保留第二关完成与奖励
→ 只重置第三关运行时
```

本轮不实现第三关，但不得留下必须复制 `restartCurrentLevel()`、`saveAndQuit()`、`resetGameState()` 才能接入第三关的结构。

---

# 六、实现边界

## 本轮可以做

- 让 UI 清理 helper 纯视觉；
- 建立通用关卡入口检查点类型和捕获 / 恢复 helper；
- 将 `townCheckpoint` 改为通用命名和结构；
- 建立完整的新运行重置路径；
- 用可辨别的 scene start data 区分标题页、新运行和当前关卡重开；
- 让 Restart 使用通用编排和第二关适配；
- 修复 Save & Quit 后标题页运行时污染；
- 确保 Continue 恢复不受 UI 淡出影响；
- 安全重置或重建场景绑定的 Controller / Encounter；
- 增加一个小型纯数据 / 纯函数模块；
- 更新 `PROJECT_CONTEXT.md`，记录可复用关卡生命周期设计。

## 本轮严格不做

- 不实现第三关或第四关；
- 不建立完整关卡注册表、依赖注入容器或多 Scene 框架；
- 不把所有现有 `levelCompleted` 布尔值强行一次性迁移成大型进度系统，除非最小修复确实需要；
- 不修改 version 3 存档结构，除非现有结构无法表达目标语义；
- 不改变敌人数量、批次、速度、攻击、掉落、争夺和奖励数值；
- 不继续拆分敌人、玩家、UI 或战斗模块；
- 不安装新依赖；
- 不通过删除存档规避恢复问题；
- 不建立持有整个 MainScene 的宽泛生命周期 service；
- 不使用 `any`。

---

# 七、代码验收标准

1. `clearLevelCompleteText()` 只负责文本生命周期；
2. 不再存在 `townCheckpoint` 这种第二关专用检查点命名；
3. 有强类型、可复用的关卡入口检查点结构；
4. scene restart data 能明确区分标题页、新运行和当前关卡重开；
5. New Game 完整清空整局进度和所有运行时引用；
6. Restart 当前关卡恢复入口检查点，只重置当前关卡；
7. Town Road Restart 回到未完成准备阶段并回滚第二关奖励；
8. Save & Quit 后标题页干净，存档仍可 Continue；
9. Continue 正确恢复 Town Road 或 Dusty Outskirts 的完成状态；
10. 已完成关卡重新进入不会错误覆盖其原入口检查点；
11. Timer、Tween、GameObject、敌人和控制器引用不跨 Scene 生命周期残留；
12. 新增第三关时可以复用外层生命周期，只增加关卡适配；
13. 不修改玩法配置；
14. `npm run build` 和 `git diff --check` 通过。

---

# 八、人工回归顺序

```txt
K → 进入 Town Road → L 完成第二关
→ ESC → R
→ 回到 Town Road 准备区
→ 最大生命、分数、金币和生命恢复第二关入口检查点
→ 再次越线并按 L
→ 奖励只增加一次

K → 进入 Town Road → L 完成第二关
→ ESC → S 保存退出
→ 标题页干净
→ Continue
→ 第二关保持完成，奖励不重复

完成第二关 → 返回 Dusty Outskirts
→ ESC → S 保存退出
→ Continue
→ 等待第一关完成文字消失
→ 再进入 Town Road
→ 不重新开战、不覆盖旧检查点

完成第二关 → 返回 Dusty Outskirts
→ ESC → R
→ 第一关从头开始
→ 基础最大生命、0 分、0 金币、无旧关卡状态
```

额外确认：

- 连续 Restart 不产生重复触发线、返回文字或黄色标记；
- 已完成 Town Road 离开并重新进入后，再 Restart 仍不会叠加最大生命奖励；
- Continue 后往返地图不重复奖励；
- 本地 `K`、`L` 快捷键正常；
- 线上不新增调试入口。

---

# 九、完成流程

完成后运行：

```bash
npm run build
npm run dev
git diff --check
git diff
git status
```

更新：

- `PROJECT_CONTEXT.md`：写入“通用关卡生命周期 = 运行进度 + 入口检查点 + 关卡运行时 + 纯视觉状态”，以及未来关卡复用方式；
- `docs/AI_HANDOFF.md`：记录根因、实际边界、修改文件、构建结果和人工回归重点。

提交信息：

```txt
fix: 修复可复用关卡生命周期
```

commit 并 push `main` 后立即停止，不继续下一轮功能或重构。