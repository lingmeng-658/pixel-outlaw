# Next Task: 第二关完成快捷键与道具争夺系统拆分

## 任务状态

等待 Codex 执行。

当前代码基线：

```txt
f22c326 refactor: 拆分第二关流程控制
```

用户已经人工验证以下流程正常：

- 进入 Town Road 后准备阶段不出怪；
- 准备阶段可以返回 Dusty Outskirts；
- 向北越线后正常开战；
- 开战后南侧入口关闭；
- Restart 能回到准备阶段；
- 本轮重构未发现明显运行时问题。

用户尚未重新打完整个第二关，因此没有再次人工验证通关后的入口恢复、奖励和完成后往返行为。

本轮包含两个阶段，但必须严格分开实现、构建和提交：

1. **阶段 C：添加本地第二关完成调试快捷键**；
2. **阶段 R2：拆分道具争夺控制**。

阶段 C 完成、build 通过并单独提交后，才开始阶段 R2。不得把两个阶段 squash 成一个提交。

---

## 开始前必须阅读

1. `AGENTS.md`
2. `PROJECT_CONTEXT.md`
3. `docs/AI_HANDOFF.md`
4. 本文件
5. 当前 Git 历史、分支与工作树状态
6. 当前源码，重点包括：
   - `src/main.ts` 中 `handleDevShortcuts()`、第二关完成判定、道具争夺、敌人移动和清理逻辑；
   - `src/townRoadFlow.ts`；
   - `src/levelTwo.ts`；
   - `src/encounter.ts`；
   - `src/types.ts`。

GitHub 当前源码是代码真相。开始前先执行：

```bash
git pull --ff-only
npm run build
git status
```

修改前先输出：

- 当前执行阶段；
- 本阶段目标；
- 本阶段不做什么；
- 验收标准；
- 预计修改文件；
- 主要风险；
- 当前 `git status`。

---

# 阶段 C：添加本地第二关完成调试快捷键

## C1. 目标

为本地开发环境增加一个快捷键，使用户不必每次完整击杀第二关全部敌人，就能快速验证：

- 第二关完成奖励；
- Town Road 完成状态；
- 南侧入口重新开放；
- 完成后返回 Dusty Outskirts；
- 再次进入 Town Road 时不显示触发线、不重复开战。

当前本地开发快捷键 `K` 用于快速开放第一关出口。新增快捷键使用：

```txt
L：在 Town Road 中直接完成第二关
```

## C2. 明确要求

### 1. 仅本地开发主机有效

沿用当前 `handleDevShortcuts()` 的限制：

```txt
localhost
127.0.0.1
```

线上 GitHub Pages 和其他主机不得响应 `L`。

将 `L` 加入 Phaser 键位注册，但不要在正式标题页操作提示中展示开发快捷键。

### 2. 使用统一完成流程

当前第二关完成逻辑仍内联在 `updateLevelTwo()` 中。为了避免调试快捷键复制奖励和清理逻辑，允许提取一个小型具名 helper，例如：

```ts
completeLevelTwo(): void
```

或语义相近的名称。

正常完成判定和 `L` 调试快捷键必须调用同一个完成 helper。

该 helper 应集中处理现有完成行为：

- 幂等保护，已经完成时直接返回；
- 设置 `levelTwoCompleted`；
- 停止 `ContinuousEncounter`；
- 清理敌人子弹和场上道具；
- 清理当前争夺状态，避免黄色 `!`、旧抢夺者引用或延迟拾取状态残留；
- 调用 `townRoadFlow.completeCombat()`；
- 发放现有最大生命和当前生命奖励；
- 重建生命 UI；
- 显示现有 `TOWN ROAD CLEAR` 标题。

正常通关行为、奖励数值和显示内容不得改变。

### 3. 调试快捷键触发条件

`L` 只在以下条件同时满足时生效：

- 当前为本地开发主机；
- 游戏已经开始；
- 当前区域是 `townRoad`；
- 第二关尚未完成；
- 当前不处于区域淡入淡出切换；
- 当前不是 Game Over。

允许在准备阶段或战斗阶段使用。

触发时应：

1. 清除当前敌人及其附属视觉；
2. 清除玩家子弹、敌人子弹、道具和金币拾取物；
3. 结束当前争夺状态；
4. 调用统一的第二关完成 helper；
5. 给出仅用于开发确认的简短反馈，例如 `DEBUG TOWN ROAD CLEAR`。

不得通过模拟 78 次击杀、批量加分或修改敌人批次配置来实现。

### 4. 不得重复领奖

连续多次按 `L` 只能完成一次、奖励一次。

第二关已经完成后，`L` 不得再次增加最大生命或当前生命。

## C3. 本阶段不做什么

- 不把开发快捷键暴露到线上；
- 不实现开发菜单或控制台；
- 不新增跳关存档；
- 不修改第二关敌人数量、完成条件和奖励数值；
- 不修改 `ContinuousEncounter` 的生产逻辑来迎合调试；
- 不开始道具争夺模块拆分；
- 不处理检查点、重复奖励、New Game 等其他独立问题；
- 不安装新依赖。

## C4. 验收标准

1. `K` 现有功能保持正常；
2. `L` 只在 localhost / 127.0.0.1 生效；
3. Town Road 准备阶段按 `L` 可以直接进入完成状态；
4. 战斗中按 `L` 能清理敌人、子弹、道具和争夺标记后完成；
5. 最大生命奖励只发放一次；
6. 完成后南侧入口开放；
7. 完成后返回再进入，不显示触发线、不重新开战；
8. 正常击杀全部敌人仍通过同一个完成 helper 正常通关；
9. `npm run build` 和 `git diff --check` 通过。

## C5. 完成流程

完成阶段 C 后运行：

```bash
npm run build
npm run dev
git diff --check
git diff
git status
```

更新 `docs/AI_HANDOFF.md`，记录快捷键、统一完成 helper、验证结果和未进行的浏览器验证。

提交信息：

```txt
feat: 添加第二关完成调试快捷键
```

commit 后确认工作树干净，再开始阶段 R2。

---

# 阶段 R2：拆分道具争夺控制

## R2.1 目标

在不改变任何玩法和数值的前提下，将 `MainScene` 中已经形成独立边界的第二关道具争夺控制提取到新模块，建议文件：

```txt
src/contestedPickup.ts
```

当前争夺主线为：

```txt
根据击杀进度计划道具
→ 选择落点并显示落地预警
→ 创建争夺道具
→ 选择一个主要抢夺者
→ 更新黄色 ! 标记
→ 枪手短暂拦截或敌人直接接近
→ 短暂停留后完成敌人强化
→ 玩家抢走、敌人死亡、离区或完成时统一清理
```

本轮只拆分这条边界，不继续拆其他系统。

## R2.2 需要迁移的状态

重构完成后，以下争夺运行时状态不应继续由 `MainScene` 直接保存一份：

```ts
nextLevelTwoPickup
pendingContestedPickup
contestedPickup
primaryContender
contenderEnabledAt
contenderInterceptUntil
```

新模块应成为这些状态的唯一真相来源。

不要在 `MainScene` 和新模块中各保留一套镜像状态。

## R2.3 建议迁移的职责

新模块应尽量集中管理：

- 根据 `LEVEL_TWO_CONFIG.contestedPickup.plans` 和当前击杀进度判断下一次争夺；
- 争夺道具随机落点选择；
- 落地警告对象和延迟创建生命周期；
- 当前争夺道具引用；
- 合法抢夺者筛选；
- 主要抢夺者选择和替补；
- 黄色 `!` 标记创建、跟随和销毁；
- 枪手拦截窗口；
- 拾取距离和拾取停留计时；
- 玩家先拾取、敌人死亡、敌人完成拾取、离区、Restart、通关时的统一清理；
- 对外提供语义明确的方法，例如：

```ts
reset(): void
updatePlan(...): void
updatePrimaryContender(): void
updateEnemyMovement(...): boolean
handlePlayerCollected(pickup): void
clear(): void
```

具体命名可以调整。

## R2.4 `MainScene` 继续负责

不得把以下职责强行塞入争夺模块：

- `ContinuousEncounter` 批次推进；
- 通用敌人生成；
- 枪手完整攻击状态机和弹道；
- 冲锋者完整状态机；
- 通用玩家拾取效果；
- Coffee / Dynamite / Ammo / Buckshot 的最终敌人强化效果实现；
- 通用浮动文字系统；
- 分数、生命、金币、存档和区域切换；
- 第二关完成奖励。

场景可以保留少量具名适配函数，例如：

```ts
spawnContestedPickup(...)
applyEnemyPickup(...)
requestGunslingerAttack(...)
```

新模块可以通过少量、明确、强类型的 hooks 调用这些能力，但：

- 不允许传入整个 `MainScene` 作为 `any`；
- 不允许建立包含大量无关方法的宽泛 service object；
- 不允许形成循环依赖；
- hooks 应控制在当前争夺边界真正需要的少数能力内。

如果迁移 `updateContenderMovement()` 会迫使模块拥有过多战斗职责，可以让新模块只计算争夺意图或保留极薄的场景适配层。不要为了追求行数强行抽象。

## R2.5 必须保持的行为

以下行为全部保持不变：

1. 第二关只有一个黄色 `!` 主要抢夺者；
2. Coffee / Dynamite 由追踪者或冲锋者争夺；
3. Ammo / Buckshot 由枪手争夺；
4. 已有强化枪手存在时，不再安排新的 Ammo / Buckshot 抢夺者；
5. 道具落地警告、`reactionDelayMs`、`gunslingerInterceptMs`、`enemyPickupHoldMs` 保持当前数值；
6. 玩家靠近 Ammo / Buckshot 时，主要枪手只在现有限时窗口内拦截；
7. 已经开始的枪手攻击可以完成，随后继续拾取；
8. 玩家抢先拾取时敌人不获得强化；
9. 主要抢夺者死亡后可以选择替补；
10. 敌人完成拾取后应用现有强化结果；
11. 多次争夺之间状态不泄漏；
12. Restart、离区、调试完成快捷键和正常通关均无残留警告、标记或引用；
13. 道具顺序、进度、落点规则、升级结果和反馈文字不变。

特别注意：阶段 A 当前实现把枪手拦截截止时间从分配时刻开始计算。此轮是纯重构，不得顺手改变该计时语义。

## R2.6 本阶段不做什么

- 不修改任何争夺数值；
- 不增加多个同时抢夺者；
- 不实现敌人升级树正式数据模型；
- 不修改枪手攻击、普通走位或边界感知；
- 不修改冲锋者行为；
- 不修改玩家道具效果；
- 不调整道具计划顺序和出现进度；
- 不继续拆分敌人视觉、玩家、UI、存档或整个 `MainScene`；
- 不处理检查点、重复奖励或 New Game 等独立问题；
- 不安装新依赖。

## R2.7 维护性要求

- 使用明确 TypeScript 类型，不使用 `any`；
- 新模块不得导入 `main.ts`；
- 争夺状态只有一个来源；
- 延迟回调必须检查当前区域/完成状态或使用可取消、可判废的生命周期，不能让旧回调污染下一轮；
- 黄色标记、警告对象和道具引用必须统一清理；
- `MainScene` 中 `updateLevelTwo()`、敌人移动和玩家拾取调用应比重构前更接近流程描述；
- 优先小型具名接口，不构造泛化 AI 框架；
- 发现需要扩大到完整敌人系统时停止扩大范围。

## R2.8 验收标准

### 代码验收

1. 新增职责明确的争夺控制模块；
2. 上述六项运行时状态不再由 `MainScene` 直接保存；
3. 计划、抢夺者和争夺对象生命周期集中管理；
4. 没有重复状态源、循环依赖、`any` 或宽泛 service object；
5. `PROJECT_CONTEXT.md` 补充新模块职责；
6. `docs/AI_HANDOFF.md` 记录实际迁移范围、保留在场景中的适配职责和风险。

### 回归验收

1. Coffee / Dynamite 抢夺行为不变；
2. Ammo / Buckshot 枪手抢夺行为不变；
3. 玩家抢先拾取后状态正确清理；
4. 抢夺者死亡后替补逻辑正常；
5. 敌人完成强化后标记和道具正确消失；
6. 多次争夺无旧状态污染；
7. Restart、返回第一关、正常通关和 `L` 调试通关均无残留；
8. 第二关其他战斗、掉落、暂停、完成奖励不变；
9. `npm run build` 和 `git diff --check` 通过。

## R2.9 完成流程

完成阶段 R2 后运行：

```bash
npm run build
npm run dev
git diff --check
git diff
git status
```

人工验证至少包括：

```txt
K 开放第一关出口
→ 进入 Town Road
→ 越线开战
→ 观察至少一次近战道具争夺
→ 观察至少一次枪手道具争夺
→ 玩家抢走一次道具
→ 击杀一次主要抢夺者
→ L 快速通关并检查无残留
```

更新：

- `PROJECT_CONTEXT.md`
- `docs/AI_HANDOFF.md`

提交信息：

```txt
refactor: 拆分道具争夺控制
```

commit 并 push `main` 后停止，不继续拆分其他系统，等待 ChatGPT 读取实际提交并进行审查。