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
- 线上部署：GitHub Pages + GitHub Actions

## 线上试玩

当前线上试玩地址：

```txt
https://lingmeng-658.github.io/pixel-outlaw/
```

当前部署方式：

- `vite.config.ts` 设置 `base: '/pixel-outlaw/'`，适配 GitHub Pages 的仓库子路径。
- `.github/workflows/deploy.yml` 在 push 到 `main` 后自动执行构建和部署。
- 构建命令：`npm run build`
- 部署产物目录：`dist`

线上版本只会在代码 commit 并 push 到 GitHub 后，由 GitHub Actions 成功部署时更新；本地未提交或未 push 的改动不会影响线上版本。

## 当前代码结构

当前项目仍然以单个 Phaser 主场景为核心，但已经把部分稳定模块从 `main.ts` 中拆出。

- `src/main.ts`：主场景 MainScene，负责游戏流程、玩家、敌人、子弹、道具、暂停和两关接线。
- `src/constants.ts`：游戏尺寸、玩家速度、子弹速度、冷却时间、道具持续时间等基础数值。
- `src/levelOne.ts`：第一关各阶段敌人数量配置。
- `src/levelTwo.ts`：第二关隐藏批次、敌人、强化、掉落与奖励配置。
- `src/encounter.ts`：第二关连续遭遇调度器，负责批次激活、动态上限、待生成队列和完成判定。
- `src/types.ts`：道具、敌人、区域和存档阶段类型。
- `src/save.ts`：version 3 存档结构、运行时校验及 version 1 / 2 迁移。
- `src/textures.ts`：临时像素纹理创建逻辑。
- `src/style.css`：页面居中、背景、canvas 像素渲染和边框样式。
- `vite.config.ts`：Vite 配置，当前主要用于 GitHub Pages 子路径部署。
- `.github/workflows/deploy.yml`：GitHub Pages 自动部署工作流。

当前重构原则：先保持玩法稳定，只把边界清晰、低风险的代码拆出去，不一次性大拆 UI、战斗和关卡控制。

## ChatGPT / Codex 协作闭环

Pixel Outlaw 的默认开发流程如下：

1. 用户与 ChatGPT 先讨论玩法、需求边界、暂不实现的内容和验收标准；讨论阶段不直接修改游戏源码。
2. 设计确认后，ChatGPT 读取 GitHub 当前代码、历史提交与项目文档，把完整实现任务写入仓库中的 `docs/NEXT_TASK.md`；重要长期设计同时同步到本文件。
3. ChatGPT 只向用户提供一条简短的 Codex 启动指令。详细需求以仓库中的 `AGENTS.md`、`PROJECT_CONTEXT.md`、`docs/AI_HANDOFF.md` 和 `docs/NEXT_TASK.md` 为准，不在聊天中重复维护另一份长提示词。
4. Codex 根据仓库当前代码、Git 历史、可用 skills 和任务文档实施修改，运行 `npm run build`、`git diff`、`git status`，并更新 `docs/AI_HANDOFF.md`。功能开发和重构应分开处理。
5. Codex 完成且改动可从 GitHub 读取后，用户告诉 ChatGPT“改好了”。ChatGPT 必须重新读取实际提交、diff 和修改后的源码，不只依赖 Codex 的文字汇报，然后说明实际实现的功能、遗漏、风险和重点试玩项。
6. 用户运行 `npm run dev` 做真实试玩。发现 bug 时，ChatGPT 分析当前代码，把最小修复任务重新写入 `docs/NEXT_TASK.md`，再交给 Codex 修改，不在修 bug 时顺手扩大范围。
7. 没有 bug 或修复验收完成后，进入代码回顾：重点理解新功能入口、核心状态、主流程、关键接口、回调关系和后续扩展点，而不是逐行背诵全部代码。
8. 只有用户明确要求 ChatGPT 直接修改源码时，ChatGPT 才越过上述流程；默认情况下，ChatGPT 的 GitHub 写操作主要用于任务文档、项目上下文和交接文档，游戏源码由 Codex 实施。

协作中的真相来源：

- GitHub 当前源码和提交历史是代码真相。
- `PROJECT_CONTEXT.md` 是长期设计与协作流程真相。
- `docs/NEXT_TASK.md` 是当前已确认、等待 Codex 执行的正式任务。
- `docs/AI_HANDOFF.md` 是实现后的状态、验证结果、风险和试玩交接板。
- 聊天记录用于讨论过程，不替代仓库中的正式任务与设计文档。

## 当前核心玩法

- 标题页 Start Game
- 合法存档存在时可从标题页 Continue Saved Game
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

## 当前第二关设计

Town Road 已接入第二关第一版代码，主题是“持续增压战斗 + 新敌人行为 + 可争夺强化道具”。底层使用 5 个隐藏批次、时间或击杀比例接续、动态存活上限和待生成队列，不显示明确 Wave UI。

第二关包含普通追踪者、直线锁向冲锋者和保持距离射击的枪手。Coffee / Dynamite 由近战敌人争夺，Ammo / Buckshot 由枪手争夺；玩家可获得加速、射速、扇形弹和命中爆破强化。回复采用概率与双冷却并提供 1 HP 保底，金币独立掉落，最终阶段前规划一个玩家专属 Shield。

第二关首次完成会增加 1 点最大生命和当前生命。该流程已通过构建检查，实际战斗节奏、弹幕可读性和争夺手感仍等待用户浏览器试玩验收。

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

存档采用关卡级检查点恢复：第一关未通关时，Continue 从 Dusty Outskirts 关卡开头重新开始；Town Road 未通关时从第二关入口重新开始；第二关完成后恢复完成状态和最大生命奖励。不会保存或恢复中途批次、战场对象、玩家精确位置或限时道具剩余时间。当前存档版本为 version 3，合法 version 1 / 2 存档会保守迁移。

localStorage key：

```txt
pixel-outlaw-save
```

## 已完成的整理

### 2026-06-26 重构收尾

- 将临时纹理绘制逻辑从 `src/main.ts` 拆到 `src/textures.ts`。
- 将存档 key 和第一关存档数据构造从 `src/main.ts` 拆到 `src/save.ts`。
- 保持玩法、数值、波次、道具效果不变。

### 2026-07-19 线上试玩部署

- 添加 `vite.config.ts`，设置 GitHub Pages 子路径 base。
- 添加 GitHub Actions 部署工作流。
- 使用 GitHub Pages 发布第一版线上试玩链接。
- 当前版本适合电脑浏览器试玩，移动端触屏操作暂未适配。

## 开发收尾约定

每轮开发或重构结束后，同步检查并更新：

- `PROJECT_CONTEXT.md`：记录当前项目真实状态、设计决策、代码结构变化；以 GitHub 仓库里的版本为准，可以由助手直接更新。
- `docs/NEXT_TASK.md`：记录 ChatGPT 与用户已确认、等待 Codex 执行的正式任务；下一轮任务开始前应替换旧任务，避免 Codex继续执行已完成内容。
- `docs/AI_HANDOFF.md`：记录 Codex 实际修改、build 结果、风险、试玩清单和提交状态。
- `TODO.md`：记录下一步任务、优先级、暂不处理的内容；优先由助手给出本地修改方案，用户确认后本地提交并 push；必要时也可以由助手直接在 GitHub 收尾。
- `DEVLOG.md`：本地开发日志，只在用户本地维护，不上传 GitHub；助手可以给出追加内容，但不把它作为仓库文件处理。

如果 GitHub 仓库中缺少某个文档，先确认本地路径和是否已经 push，不要直接覆盖已有文件结构。

每轮重要修改后，本地验收建议运行：

```bash
npm run build
npm run dev
git diff
git status
```

如果只是文档修改，也至少查看：

```bash
git diff --stat
git status
```
