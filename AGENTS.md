# Pixel Outlaw Agent Instructions

本文件是给 Codex / 编码 Agent 读取的仓库级协作规则。

项目仓库：`lingmeng-658/pixel-outlaw`

项目定位：基于 Vite + TypeScript + Phaser 的西部像素风俯视角射击小游戏。

---

## 1. 代码真相与文档真相

- GitHub 仓库中的当前代码是代码真相。
- `PROJECT_CONTEXT.md` 是项目设计真相。
- `docs/AI_HANDOFF.md` 是 Codex、ChatGPT 和用户之间的交接板。
- 修改代码前，先阅读当前文件，不要凭记忆假设代码状态。

推荐每轮任务开始前先读：

1. `PROJECT_CONTEXT.md`
2. `AGENTS.md`
3. `docs/AI_HANDOFF.md`，如果存在
4. `docs/NEXT_TASK.md`，如果存在
5. 与本轮任务直接相关的源码文件

---

## 2. 基本开发原则

- 每轮只解决一个明确问题。
- 功能开发和代码重构分开进行，分开提交。
- 重构时不要顺手改玩法、数值、关卡节奏或玩家手感。
- 功能开发时不要顺手大范围重构无关代码。
- Bug 修复优先做最小修复，不要借机大改结构。
- 重要设计决策需要更新 `PROJECT_CONTEXT.md` 或 `docs/AI_HANDOFF.md`。

---

## 3. 每轮任务必须明确

开始修改前，先确认或输出：

- 本次目标
- 不做什么
- 验收标准
- 预计修改文件
- 主要风险点

如果任务边界不清楚，先提问或给出计划，不要直接改代码。

---

## 4. 文件和权限边界

默认允许：

- 阅读项目源码和文档
- 修改本轮任务相关源码
- 修改 `PROJECT_CONTEXT.md`
- 修改 `docs/AI_HANDOFF.md`
- 新增必要的 `docs/` 文档
- 运行 `npm run build`
- 运行 `git diff --stat`、`git diff`、`git status`

默认不要：

- 删除大文件或目录
- 修改 `node_modules/`
- 修改 `dist/`
- 大范围重命名文件
- 修改无关依赖
- 自动 `git push`
- 在没有用户确认时自动提交

只有用户明确同意时，才执行：

- `git add`
- `git commit`
- `git push`

---

## 5. 验收要求

重要修改后必须运行：

```bash
npm run build
```

修改结束后输出：

```bash
git diff --stat
git status
```

如果涉及玩法、UI、输入、关卡、存档或区域切换，需要提醒用户运行：

```bash
npm run dev
```

并列出人工试玩清单。

### Phaser + Playwright 浏览器验收

- `playwright-cli` 键名区分大小写。
- Phaser `JustDown` 按键不要使用快速 `press`。
- 键盘操作统一使用 `keydown` → 等待约 200ms → `keyup`。
- 实时战斗中不要长时间等待截图，应尽快暂停游戏。
- 截图与临时测试产物放在 `/tmp`，不要提交到仓库。

---

## 6. 任务结束交接

每次完成审查或修改后，更新 `docs/AI_HANDOFF.md`，至少包含：

- 本轮任务目标
- 修改或审查了哪些文件
- build 是否通过
- 当前风险
- 需要用户试玩/确认的点
- 建议下一步
- 是否已经提交 / 是否已经 push

---

## 7. 提交信息风格

提交信息使用简洁中文，例如：

- `feat: 添加 xxx`
- `refactor: 整理 xxx`
- `fix: 修复 xxx`
- `docs: 更新 xxx`
- `chore: 清理 xxx`

---

## 8. Pixel Outlaw 当前重点

近期优先级：

1. 完成存档闭环。
2. 稳定区域与关卡状态模型。
3. 小步拆分 `MainScene`。
4. 决定金币的最小用途。
5. 增加 Ammo Box 或一种新敌人。
6. 做真实试玩验收。

不要在没有明确任务的情况下直接开始做完整城镇、商店或第二关大系统。
