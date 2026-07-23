# AI Handoff

本文件是 Pixel Outlaw 项目的 AI 交接板，用于同步用户、ChatGPT 和 Codex 的当前理解。

使用原则：

- Codex 每次完成审查或修改后更新本文件。
- ChatGPT 接手讨论时优先读取本文件和 `PROJECT_CONTEXT.md`。
- 本文件记录当前状态、最近任务、风险、待讨论问题和下一步建议。
- 本文件不替代源码，源码仍以 GitHub 当前代码为准。

---

## Last Updated

- Date: 2026-07-23
- Updated by: Codex
- Branch: main
- Commit: pending `fix: 优化敌人争抢道具行为`
- Related commits:
  - `docs: 添加 Codex 仓库协作规则`
  - `docs: 添加 AI 交接文档`

---

## Current Project Snapshot

Pixel Outlaw 已经不是刚搭起来的 demo，而是一个完成度较高的第一关垂直切片。

当前项目已具备：

- 标题页开始游戏
- WASD 移动
- 方向键八方向射击
- 敌人从边缘生成并追踪玩家
- 子弹击杀、分数、暴击飘字反馈
- 玩家受伤、HP 爱心 UI、死亡与重开
- 第一关教学波次
- Coffee / Potion / Shield 三种生存道具
- ESC 暂停菜单
- Save Progress & Quit 与 Continue Saved Game 存档闭环
- 金币掉落与拾取的第一版
- Dusty Outskirts 与 Town Road 的区域切换雏形
- Town Road 第二关第一版代码已接通，等待用户真实试玩验收

### 2026-07-23 阶段 A：优化敌人争抢道具行为

本轮目标：让第二关单个主要抢夺者可靠完成争夺闭环，限制枪手拦截玩家的时间，并缩短最终拾取停留；严格未开始阶段 B。

实际修改：

- `src/levelTwo.ts`：在争夺配置中新增 `gunslingerInterceptMs: 700`，并将 `enemyPickupHoldMs` 从 480ms 调整为 320ms。
- `src/main.ts`：新增场景级 `contenderInterceptUntil`；每次分配主要抢夺者时建立独立窗口，统一争夺清理时归零；提取 `shouldGunslingerInterceptPickup()` 判断。窗口到期后不再因玩家靠近而重复拦截，已开始的枪手攻击仍按原流程完成，随后继续前往道具。
- `docs/AI_HANDOFF.md`：同步本轮实际实现和验证状态。

验证结果：`git diff --check` 通过；`npm run build` 通过，仅有既有 Vite 大 chunk 警告。未进行浏览器自动化或人工试玩。

当前风险：700ms 从主要抢夺者被分配时开始计算，包含既有反应延迟；枪手攻击中的 `busy` 状态继续沿用原流程。实际拦截观感、攻击结束后转向道具、死亡接替和连续多次争夺仍需真实试玩确认。

人工试玩重点：玩家不干预 Ammo / Buckshot 时枪手能完成强化；玩家贴近道具时只能短暂被拦截；拾取前击杀主要枪手后新抢夺者可接替；玩家抢先拾取后标记和状态清除；多次争夺互不污染；Coffee / Dynamite 近战争夺保持原样。

范围确认：未实现阶段 B 的 Town Road 安全准备区或战斗触发线；未修改边界感知走位、升级树、商店、批次、敌人数、枪手弹道、冲锋者、存档或关卡奖励。

提交状态：待使用 `fix: 优化敌人争抢道具行为` 提交并 push `main`。建议下一步先由用户和 ChatGPT 审查提交并运行 `npm run dev` 完成上述试玩验收；在收到新指令前不得开始阶段 B。

### 2026-07-22 第二关可读性与金币生命周期调优

本轮目标：依据首次真实试玩结论，改善第二关特殊敌人登场顺序、身份与状态可读性，并为两关金币增加统一生命周期；不改变核心战斗平衡、争夺、掉落、第一关或存档语义。

实际修改：

- `src/levelTwo.ts`：隐藏批次调整为第 1 批无特殊敌人、第 2 批首次冲锋者、第 3 批首次枪手，第 4/5 批组合压力；总量仍为 68 追踪者、6 冲锋者、4 枪手；生成间隔改为 600ms。
- `src/textures.ts`：冲锋者改为宽肩厚重轮廓，枪手改为窄身、宽帽檐和侧枪轮廓。
- `src/main.ts`：保持特殊敌人约 28×28 碰撞体；增加每轮首次登场标签/特效、动态两格生命、四种独立强化标记、分层 `!`、枪手瞄准圈和统一附属视觉清理；金币拾取、自然到期与清场共用销毁入口。
- `src/constants.ts`：集中配置金币 12 秒存续与最后 2.5 秒警告。
- `PROJECT_CONTEXT.md`、`docs/NEXT_TASK.md`、本文件：同步实际实现状态。

验证结果：阶段 A、B、C、D 均运行 `npm run build` 并通过；仅有既有 Vite 大 chunk 警告。最终 `git diff --check`、build、diff 和 status 结果以本轮收尾输出为准。

未完成与风险：未执行自动浏览器试玩；灰度轮廓区分、首次提示时长、生命点/强化/抢夺者层级、最终混战可读性，以及金币在暂停临界点的剩余时间表现需用户运行 `npm run dev` 验证。代码实现完成不代表用户试玩验收通过。

人工试玩重点：前三批特殊敌人顺序；Coffee 转换后的纹理/碰撞体/2 HP；四种强化与 `!` 同屏；特殊敌人受击、爆炸和离区清理；最终组合压力；两关金币 9.5 秒后闪烁、12 秒消失、拾取和清场；金币即将消失时暂停再恢复。

提交状态：待使用普通 Git 命令 commit 并 push `main`，不创建 PR。

### 2026-07-22 第二关第一版实现

本轮目标：完整实现 `docs/NEXT_TASK.md` 已确认的 Town Road 第二关第一版，同时保持第一关和既有 Continue 规则稳定。

修改文件：

- `src/levelTwo.ts`：第二关全部主要数值、5 个隐藏批次、强化计划与掉落配置。
- `src/encounter.ts`：连续遭遇调度器的 start / stop / reset、接续、队列、动态上限和完成判定。
- `src/types.ts`：敌人和新道具类型。
- `src/textures.ts`：特殊敌人、敌方子弹与新道具临时像素纹理。
- `src/main.ts`：第二关入口、敌人行为、敌方弹幕、统一死亡入口、争夺、玩家/敌人强化、掉落、奖励、重开和区域生命周期。
- `src/save.ts`：version 3、第二关完成与 `maxHealth`，兼容 version 1 / 2。
- `PROJECT_CONTEXT.md`、`docs/NEXT_TASK.md`、本文件：同步实际完成状态。

主流程：第一关通关后从北侧进入 Town Road；`ContinuousEncounter` 按隐藏批次持续补怪；全部计划敌人生成且场上清空后完成，清除残留敌弹/道具并首次发放最大生命 +1。Town Road 中途保存、死亡重开或重进均从明确入口检查点重新开始，不恢复中途战场或临时强化。

关键接口：所有敌人死亡通过 `defeatEnemy()` 汇总分数、金币/Heart、遭遇进度和抢夺者重分配；争夺由 `updateContestedPickupPlan()`、`getEligibleContenders()`、`ensurePrimaryContender()` 和 `applyEnemyPickup()` 接通；第二关掉落由 `rollLevelTwoDrops()` 独立结算。

实现核对：完整实现项、部分实现项和尚未实现项已逐项写入 `docs/NEXT_TASK.md` 顶部。主要取舍是开放场地轻量站位、Buckshot 以玩家实际位移而非独立空隙编号预测，以及用区域守卫让离区延迟回调失效。

验证：阶段 A、B、C、D 和收尾均执行 `npm run build`；当前全部通过，仅有既有 Vite 大 chunk 警告。`git diff --check` 通过。按用户要求，游戏内主要测试留给用户执行。

已知风险：78 敌人完整节奏、冲锋预警可读性、最终双枪手同场压力、自适应第二组、爆炸连锁、同帧争夺、Heart 保底和 v1/v2/v3 存档组合尚未真实试玩。`MainScene` 本轮因功能增长明显变大，若后续整理必须作为独立重构任务，不与本轮平衡修复混做。

提交状态：未执行 git add、commit 或 push。

当前主要问题：

- `src/main.ts` 职责仍然较多，后续继续堆功能会增加维护风险。
- 区域状态、关卡完成状态、出口开放状态还需要更明确的模型。
- 金币目前只有收集价值，还没有消费或升级用途。

---

## Current Code Understanding

### Core Combat

当前核心战斗循环基本可玩：

- 玩家移动和射击已接通。
- 敌人生成、追踪、碰撞伤害已接通。
- 子弹命中、敌人死亡、分数反馈已接通。
- HP、受伤反馈、死亡重开已接通。

短期内核心战斗不缺基础功能，缺的是更多敌人行为、武器变化、命中手感和数值打磨。

### Level One

第一关已经从无限刷怪原型变成有阶段推进的关卡雏形。

当前流程大致是：

1. 初始基础战斗。
2. 如果玩家受伤，插入回血教学。
3. Coffee 教学波。
4. Shield 教学波。
5. 最终压力波。
6. 关卡完成提示与关底补给。
7. 开放北侧出口。
8. 进入 Town Road。
9. 可从 Town Road 返回已通关的 Dusty Outskirts。

### Pickup System

当前道具系统已完成基础抽象：

- Coffee：限时加速和 UI 动效。
- Potion：回血与满血反馈。
- Shield：限时一次格挡、角色光环和临期闪烁。

已有通用道具生成函数，但道具效果判断仍偏集中式。继续加入 Ammo Box、武器或叠层效果时，需要小心避免 if/else 膨胀。

### Coin System

金币系统已接入第一版：

- 第一关随机掉落 2 到 3 枚。
- 根据击杀进度分散掉落。
- 玩家可以拾取。
- HUD 显示金币数量。
- 拾取时有动效和飘字。
- Game Over 会显示本局金币。

金币仍缺少消费闭环，比如商店、回血、射速强化或永久升级。

### Save System

当前已完成最小检查点式存档闭环。

已有：

- Save Progress & Quit 按钮。
- localStorage 读写、JSON 解析和运行时校验。
- version 2 存档以及 version 1 保守迁移。
- 标题页鼠标/C 键 Continue 入口。
- 未通关存档统一为关卡开头状态，Continue 从 Dusty Outskirts 第一关开头重来。
- 已通关存档恢复 score、health、coins、区域和出口状态。
- Dusty Outskirts 通关出口与 Town Road 区域恢复。

### Save Loop Design Review

2026-07-22 最初设计为阶段起点检查点恢复；试玩后已由后续任务收窄为**关卡级检查点恢复**，本节原阶段方案不再作为当前实现依据。

当前决策：未通关存档只代表“可从第一关开头继续”；已通关存档才恢复 HUD、区域和出口。Continue 仍需通过运行时校验，损坏或不支持的存档不显示入口。

### 2026-07-22 Continue Implementation

本轮完成检查点式 Continue Saved Game。合法存档会在标题页显示 Continue，支持鼠标和 C 键；恢复 score、health、coins、area、levelCompleted、stage 及金币掉落进度，并从稳定阶段起点继续。

修改文件与模块：

- `src/save.ts`：version 2 数据结构、localStorage 读取、JSON 异常处理、运行时校验及 version 1 保守迁移。
- `src/main.ts`：标题 Continue 入口、`saveAndQuit()` 扩展、`continueSavedGame()`、存档/阶段/区域恢复函数和显式 `levelCompleted` 状态。
- `PROJECT_CONTEXT.md`：记录检查点恢复、不恢复完整战场快照的设计决策。
- `docs/AI_HANDOFF.md`：同步本轮实现与验收状态。

玩法影响：未改变关卡数值、敌人数量、道具效果或金币掉落平衡；只补全存档读取与检查点恢复流程。v1 存档保留阶段、分数和生命，金币归零且不会补发历史金币。

验证结果：

- `npm run build`：通过；仅有既有的大 chunk 警告。
- `git diff --check`：通过。
- `git diff --stat`：
  - `PROJECT_CONTEXT.md | 3 +-`
  - `docs/AI_HANDOFF.md | 92 ++++++++++++++++++-----------`
  - `src/main.ts | 169 ++++++++++++++++++++++++++++++++++++++++++++++++++---`
  - `src/save.ts | 138 ++++++++++++++++++++++++++++++++++++++++---`
- `git status`：仅上述四个本轮预期文件有修改。
- 提交状态：已本地提交，提交信息为 `feat: 添加检查点式继续游戏`；未 push。

当前风险：六个阶段和 v1/v2 损坏存档组合尚未在真实浏览器中逐项试玩；v1 缺少历史金币数据，只能按保守策略归零；临时 Coffee/Shield 效果和战场对象按设计不会恢复。

人工试玩清单：

- 验证无存档、损坏存档仍可 Start Game，合法存档显示鼠标/C 键 Continue。
- 分别验证 intro、heart、coffee、shield、final、clear 的 HUD 和阶段起点恢复。
- 验证 v1 迁移不补发金币，v2 金币及掉落进度不重复。
- 验证 clear 后 Dusty Outskirts 出口、Town Road 恢复及返回 Outskirts。
- 验证新游戏、死亡重开、再次保存以及保存失败路径。

下一步建议：先完成上述真实试玩验收；发现问题时单独做最小修复，不在验收轮顺手重构。

### 2026-07-22 Level Checkpoint Simplification

本轮目标：将 Continue 从阶段级恢复简化为关卡级恢复，消除中途道具和阶段被重复恢复的问题。

修改文件与模块：

- `src/main.ts`：调整 `saveAndQuit()` 和 `restoreSavedGame()`，删除中途阶段恢复映射，并清理标题 Continue 对象的旧引用。
- `src/save.ts`：v1 非 clear 存档统一迁移为未通关 intro；clear 继续视为已通关。
- `PROJECT_CONTEXT.md` 与本文件：同步关卡级检查点规则。

玩法影响：只改变 Continue 规则。未通关保存会写入 `intro`、score 0、满血、coins 0、未教学状态和空金币进度；Continue 使用新游戏初始化及正常随机金币计划。敌人数量、道具效果、关卡节奏和金币掉落平衡不变。已通关 Dusty Outskirts / Town Road 仍恢复实际 HUD 与区域状态。

验证结果：

- `npm run build`：通过；仅有既有的大 chunk 警告。
- `git diff --stat`：
  - `PROJECT_CONTEXT.md | 2 +-`
  - `docs/AI_HANDOFF.md | 56 +++++++++++++++++++++-------`
  - `src/main.ts | 106 +++++++++++++++--------------------------------------`
  - `src/save.ts | 8 ++--`
- `git status`：提交前仅上述四个本轮预期文件有修改。
- 提交状态：已本地提交，提交信息为 `fix: 简化继续游戏为关卡级检查点`；未 push。

当前风险：本地浏览器自动化连接不稳定，本轮按约定跳过；仍需用户通过 `npm run dev` 确认 localStorage 清空后不显示 Continue，并覆盖未通关、clear、Town Road、v1 和损坏存档路径。

人工试玩清单：

- 清空 `pixel-outlaw-save` 后刷新，确认不显示 Continue，Start/SPACE 正常。
- 在 Heart、Coffee、Shield、final 中途分别保存，确认 Continue 均从第一关开头开始且 HUD 为初始值。
- 验证未通关读档使用正常新游戏金币计划，不恢复旧掉落进度。
- 验证 clear 恢复已通关 Outskirts 和开放出口。
- 验证 Town Road 恢复及返回已通关 Outskirts。
- 验证 v1、损坏、非法和不支持版本存档。

下一步建议：先完成关卡级 Continue 的真实试玩验收；只对发现的问题做最小修复。

---

## Current Risks

1. **MainScene 继续膨胀风险**

   `src/main.ts` 同时承担场景生命周期、UI、输入、战斗、波次、道具、金币、存档、暂停、区域绘制和调试功能。继续加第二关、NPC、商店或更多武器前，应该先小步拆分。

2. **区域状态模型不够明确**

   目前区域数量少，还能靠局部状态控制。若增加第三个区域、城镇商店或第二关，状态会更容易混乱。

3. **金币暂时只是另一种分数**

   金币如果没有消费用途，会削弱拾取意义。需要尽快设计一个最小消费闭环。

4. **AI 修改黑箱化风险**

   继续使用 Codex 开发时，必须坚持 build、diff、handoff 和人工试玩，避免用户逐渐看不懂项目。

---

## Current Roadmap Priority

建议近期优先级：

1. 真实试玩验收关卡级 Continue。
2. 稳定区域与关卡状态模型。
3. 小步拆分 `MainScene`。
4. 决定金币的最小用途。
5. 增加 Ammo Box 或一种新敌人。

不建议当前直接做：

- 完整城镇系统。
- 大型商店系统。
- 第二关完整内容。
- 大范围架构重写。

---

## Open Design Idea: Contested Pickups

用户提出一个新机制：**道具争夺机制**。

设想：道具不仅玩家可以吃到增益，如果玩家不及时拾取，敌人也可以吃到道具并获得增益，作为一种惩罚和压力来源。

设计价值：

- 道具从奖励变成争夺资源。
- 玩家不捡道具会产生后果。
- 强化道具的重要性。
- 提高移动决策和冒险价值。

初步可行方案：

| 道具 | 玩家拾取效果 | 敌人拾取效果候选 |
|---|---|---|
| Coffee | 玩家加速 | 敌人短时间加速，显示强化反馈 |
| Shield | 玩家获得一次格挡 | 敌人获得一次挡子弹，首发子弹显示 BLOCK |
| Potion | 玩家回血 | 当前先不建议敌人拾取，因为普通敌人暂无血量系统 |
| Ammo Box | 玩家射速提升 | 敌人进入狂暴或生成额外压力，待后续设计 |

当前建议：

- 先记录想法，不立即实现。
- 第一版如果实现，只做 Coffee 和 Shield 的敌人拾取。
- 不要在存档闭环和状态模型稳定前加入该机制。

---

## Suggested Next Task

建议下一轮给 Codex 的任务：

### 任务：真实试玩验收关卡级 Continue

目标：

- 验证未通关存档统一从第一关开头恢复。
- 验证 v1、v2、缺失和损坏存档。
- 验证通关出口及 Town Road 往返。

不做什么：

- 不新增功能或调整玩法数值。
- 不在试玩验收中顺手重构。

验收标准：

- New Game 与 Continue 均可正常使用。
- HUD、阶段、区域和金币进度恢复符合检查点设计。
- 发现的问题形成独立、最小的修复任务。

---

## Required Codex End-of-Task Output

Codex 每次完成任务后，请在终端输出：

- 本轮任务目标
- 审查或修改了哪些文件
- 是否改变玩法
- `npm run build` 结果，如果有修改代码
- `git diff --stat`
- `git status`
- 当前风险
- 人工试玩清单，如果需要
- 是否更新了 `docs/AI_HANDOFF.md`
- 是否已经 commit / push
