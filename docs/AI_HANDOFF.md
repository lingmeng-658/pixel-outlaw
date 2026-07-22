# AI Handoff

本文件是 Pixel Outlaw 项目的 AI 交接板，用于同步用户、ChatGPT 和 Codex 的当前理解。

使用原则：

- Codex 每次完成审查或修改后更新本文件。
- ChatGPT 接手讨论时优先读取本文件和 `PROJECT_CONTEXT.md`。
- 本文件记录当前状态、最近任务、风险、待讨论问题和下一步建议。
- 本文件不替代源码，源码仍以 GitHub 当前代码为准。

---

## Last Updated

- Date: 2026-07-22
- Updated by: Codex
- Branch: main
- Commit: pending user pull
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
