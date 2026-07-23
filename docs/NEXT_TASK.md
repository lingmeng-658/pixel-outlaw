# Next Task: 拆分第二关流程控制

## 任务状态

等待 Codex 执行。

当前代码基线：

```txt
0162839 feat: 添加第二关战斗触发区
6dcad3d fix: 修复第二关准备区坐标
```

`6dcad3d` 已将战斗触发线从 `Y=500` 调整为 `Y=420`，将南侧返回判定从画布外的 `Y=662` 调整为 `Y=542`。本轮开始前必须先 `git pull`，并先运行 `npm run build` 确认该最小修复没有引入构建错误。

本轮是**纯重构**：保持当前玩法、数值、画面和存档语义不变，只拆分已经稳定的 Town Road 准备区 / 战斗 / 返回入口流程。

---

## 开始前必须阅读

1. `AGENTS.md`
2. `PROJECT_CONTEXT.md`
3. `docs/AI_HANDOFF.md`
4. 本文件
5. 当前 Git 历史、分支与工作树状态
6. 当前源码，重点包括：
   - `src/main.ts` 中 Town Road 进入、返回、触发、完成、Restart、Continue 和清理逻辑
   - `src/levelTwo.ts`
   - `src/encounter.ts`
   - `src/save.ts`

修改前先输出：

- 本轮目标
- 不做什么
- 验收标准
- 预计修改文件
- 主要风险
- 当前 `git status`

---

# 一、本轮目标

将 `MainScene` 中已经形成独立边界的第二关入口流程提取到新模块，减少 `main.ts` 同时承担的状态、视觉对象和清理职责。

当前需要整理的职责包括：

```txt
进入 Town Road 准备阶段
→ 显示战斗触发线和南侧返回入口
→ 玩家越线后关闭返回入口并进入战斗阶段
→ 战斗完成后重新开放返回入口
→ 离开、重开或场景重建时统一清理流程对象
```

建议新增：

```txt
src/townRoadFlow.ts
```

模块名和类名可按当前风格小幅调整，但职责必须明确指向 **Town Road 入口流程状态与对应提示对象**，不要创建通用但职责模糊的场景框架。

---

# 二、建议的模块边界

## 1. 新模块负责

新模块应集中管理当前散落在 `MainScene` 中的以下内容：

- 本次进入是否已经触发战斗；
- 南侧返回入口当前是否开放；
- 战斗触发线及提示文字的创建、销毁和 tween 清理；
- 南侧返回提示的创建、销毁和状态同步；
- 准备、战斗、完成、离区之间的运行时状态切换；
- 根据玩家 Y 坐标判断是否首次越过战斗触发线；
- 对外提供语义明确的只读状态或方法，例如：

```ts
enterPreparation(): void
tryStartCombat(playerY: number): boolean
completeCombat(): void
leaveTownRoad(): void
canReturn(): boolean
isCombatActive(): boolean
```

命名可以调整，但调用关系应当一眼可读。

## 2. `MainScene` 继续负责

不得把下列职责塞进新模块：

- `ContinuousEncounter.start()` / `stop()` / `reset()` 和批次调度；
- 敌人生成、移动、攻击和掉落；
- 玩家、子弹和碰撞；
- 区域淡入淡出与实际场景切换；
- `levelTwoCompleted` 的长期完成语义；
- 完成奖励、血量、金币和分数；
- Restart、Continue 和存档序列化；
- `AMBUSH STARTED` 等与主场景反馈系统绑定的浮动文字。

新模块可以返回“是否刚刚开始战斗”等结果，由 `MainScene` 调用遭遇调度器和反馈函数；不要通过大量回调或一个宽泛的 service object 反向控制整个场景。

---

# 三、需要消除的重复状态

重构完成后，以下状态和对象不应同时在 `MainScene` 与新模块中各保存一份：

```ts
levelTwoCombatStarted
townRoadReturnOpen
townRoadCombatTriggerObjects
townRoadReturnObjects
```

目标是让新模块成为这些**运行时入口流程状态**的唯一真相来源。

`levelTwoCompleted` 仍保留在 `MainScene`，因为它参与完成奖励、存档和关卡长期状态，不在本轮迁移。

原有 helper 如下：

```ts
clearTownRoadCombatTrigger()
clearTownRoadReturnObjects()
showTownRoadCombatTrigger()
setTownRoadReturnOpen()
canReturnFromTownRoad()
```

应根据新边界迁移、合并或保留极薄的场景适配层。不要只是把代码复制进新文件后，在 `main.ts` 再保留同一套状态判断。

---

# 四、行为必须保持不变

以 `6dcad3d` 之后的代码为准：

1. 玩家进入 Town Road 时出生在 `Y=484` 左右的南侧准备区。
2. 战斗触发线位于 `Y=420`。
3. 南侧返回判定位于 `Y=542`。
4. 准备阶段可以无限停留，不生成敌人、不推进遭遇、不生成争夺道具。
5. 准备阶段可以返回 Dusty Outskirts。
6. 玩家第一次向北越线后才启动遭遇。
7. 战斗启动时触发提示与南侧返回提示同时消失，实际传送也被禁用。
8. 战斗中退回南侧不能返回第一关，也不能暂停或重启遭遇。
9. 第二关完成后重新开放南侧返回入口。
10. Restart 和未完成第二关的 Continue 回到准备阶段。
11. 第二关已经完成时不显示战斗触发线，也不重复开战。

这些都属于回归保护，不得借重构调整手感或表现。

---

# 五、本轮不做什么

严格不要处理：

- 不调整 `combatEntry.triggerY`、`lineWidth`、`townRoadReturn.triggerY` 或入口宽度；
- 不改变玩家出生点；
- 不修改第二关批次、生成频率、敌人数量和战斗参数；
- 不修改敌人争夺、枪手弹道或强化逻辑；
- 不实现商店、购买、金币消费或第三关；
- 不修改存档版本和检查点语义；
- 不顺手修复 `clearLevelCompleteText()`、重复奖励、New Game 或检查点等独立问题；
- 不拆分道具争夺系统、敌人视觉系统、玩家系统或整个 `MainScene`；
- 不安装新依赖；
- 不改成多 Scene 架构。

本轮只解决一个问题：**提取 Town Road 入口流程控制这一条清晰边界。**

---

# 六、维护性要求

- 新模块应使用明确类型，不使用 `any`；
- 不依赖 `MainScene` 的私有类型，也不要让新模块导入 `main.ts`；
- 可以依赖 Phaser、基础尺寸常量和 `LEVEL_TWO_CONFIG`；
- 状态切换方法应具有幂等保护，重复调用不能创建重复提示或留下旧 tween；
- GameObject 销毁必须统一杀掉相关 tween；
- `MainScene` 中调用应比重构前更短、更接近流程描述；
- 不以“行数减少”为唯一目标，优先保证职责单一和状态唯一；
- 若发现必须通过大量回调才能完成抽取，停止扩大范围，保留实际场景操作在 `MainScene`。

---

# 七、验收标准

## 代码验收

1. 新增职责明确的 Town Road 流程模块。
2. `MainScene` 不再直接保存上述四项入口流程状态和对象集合。
3. 触发线、返回提示及其清理集中在新模块。
4. `MainScene` 仍明确负责遭遇启动、完成奖励和场景切换。
5. 没有重复状态源、循环依赖、`any` 或宽泛 service object。
6. `PROJECT_CONTEXT.md` 的当前代码结构中补充新模块职责。
7. `docs/AI_HANDOFF.md` 记录实际迁移内容、构建结果和试玩重点。

## 回归验收

1. 准备阶段不出怪。
2. 准备阶段可返回第一关。
3. 向北越线后只启动一次战斗。
4. 开战后入口视觉和传送同时关闭。
5. 战斗完成后入口重新开放。
6. Restart、Continue 和完成后往返行为保持当前语义。
7. 触发线、返回提示和 tween 不重复、不残留。
8. 现有第二关战斗、争夺、暂停和完成奖励不变。
9. `npm run build` 通过。

---

# 八、完成流程

完成后必须运行：

```bash
npm run build
npm run dev
git diff --check
git diff
git status
```

至少人工验证：

```txt
进入 Town Road 原地停留
→ 准备阶段返回第一关
→ 再次进入并越线开战
→ 退回南侧确认入口关闭
→ Restart 回到准备阶段
```

更新：

- `PROJECT_CONTEXT.md`
- `docs/AI_HANDOFF.md`

提交信息：

```txt
refactor: 拆分第二关流程控制
```

commit 并 push `main` 后停止，不继续拆分其他系统，等待 ChatGPT 重新读取实际提交并进行代码审查。
