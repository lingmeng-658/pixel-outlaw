# Next Task: 修复标题页无法开始新游戏

## 任务状态

等待 Codex 执行。

当前代码基线：

```txt
9f3b8ec fix: 修复可复用关卡生命周期
```

用户清除 `pixel-outlaw-save` 后重新打开游戏，标题页正常显示：

```txt
Click START or press SPACE
```

但点击 `START GAME` 和按空格都无法进入游戏。

---

## 一、本轮目标

修复标题页新游戏入口，使以下两种操作都能立即开始一局干净的第一关：

- 点击 `START GAME`；
- 按 `SPACE`。

标题页在 `create()` 开始时已经调用 `resetRunState()`，因此开始第一关时不应再次重启同一个 Scene。

---

## 二、不做什么

- 不修改 Restart Level 的检查点语义；
- 不修改 Save & Quit / Continue；
- 不修改存档结构或版本；
- 不修改第一关、第二关玩法和数值；
- 不继续拆分模块；
- 不安装依赖；
- 不顺手处理其他 UI 或输入问题。

---

## 三、已定位的启动链路

当前点击和空格共用：

```txt
startNewRun()
→ scene.restart({ mode: 'newRun', autoStart: true })
→ 下一次 Scene Manager 更新再次执行 create()
```

这使一个已经完成干净初始化的标题 Scene，为了开始第一关又额外经历一次 shutdown / restart / create 生命周期。

当前标题页本身已经满足新游戏前置条件：

```txt
create()
→ resetRunState()
→ 创建第一关初始对象与 UI
→ 等待 Start 输入
```

因此最小正确行为应是：

```txt
点击 START 或按 SPACE
→ startNewRun()
→ startGame()
```

不要在标题页新游戏入口调用 `scene.restart()`。

---

## 四、实现要求

重点修改：

- `src/main.ts`
- `src/levelLifecycle.ts`
- `docs/AI_HANDOFF.md`

### 1. 标题页直接开始

将 `startNewRun()` 改为直接调用 `startGame()`。

不得在这个方法中：

- 再次调用 `resetRunState()`；
- 调用 `scene.restart()`；
- 清理或覆盖合法存档；
- 复制 `startGame()` 的 UI 切换逻辑。

标题页第一次创建或 Save & Quit 返回标题页时，`create()` 已经完整重置运行状态。

### 2. 删除无用的 `newRun` Scene 启动模式

如果修改后没有其他调用方使用：

```ts
{ mode: 'newRun'; autoStart: true }
```

则从 `SceneStartData` 中删除该分支，并删除 `create()` 中对应判断。

保留真正需要跨 Scene 生命周期的启动意图：

```ts
{ mode: 'title' }
{ mode: 'restartLevel'; checkpoint: LevelEntryCheckpoint }
```

不要为了保留形式而留下永远不会使用的 `newRun` 分支。

### 3. 保持其他路径不变

必须确认：

- Restart Level 仍通过 `restartLevel` + checkpoint 重建；
- Save & Quit 仍通过 `title` 返回干净标题页；
- Continue 仍从当前合法存档恢复；
- 标题页存在存档时，点击 START / SPACE 开始的是干净新游戏，但存档仍可在下次刷新前后继续使用，除非现有产品语义明确删除它；本轮不得擅自删除存档。

---

## 五、验收标准

### A. 无存档标题页

先在浏览器执行：

```js
localStorage.removeItem('pixel-outlaw-save')
location.reload()
```

然后分别验证：

1. 点击 `START GAME`，玩家立即出现，第一关开始；
2. 刷新并再次清理存档；
3. 按 `SPACE`，玩家立即出现，第一关开始；
4. Console 没有新的未捕获异常。

### B. 有存档标题页

1. 创建一份合法存档并返回标题页；
2. 点击 `START GAME` 或按 `SPACE`，开始干净的第一关；
3. 分数、金币为 0；
4. 当前生命与最大生命为基础值；
5. 不带入第二关完成状态、武器、炸药或检查点运行时；
6. `CONTINUE SAVED GAME` 原有恢复逻辑不被破坏。

### C. 生命周期回归

至少确认：

- Town Road 的 Restart Level 仍回到第二关入口检查点；
- Save & Quit 仍能回到标题页；
- Continue 仍能恢复合法存档。

---

## 六、开发流程

开始前运行：

```bash
git pull --ff-only
npm run build
git status
```

修改前先输出：

1. 本轮目标；
2. 不做什么；
3. 验收标准；
4. 预计修改文件；
5. 主要风险；
6. 当前 `git status`。

完成后运行：

```bash
npm run build
npm run dev
git diff --check
git diff
git status
```

必须实际在浏览器验证点击和空格两种入口，不能只以 build 通过代替运行时验收。

更新：

- `docs/AI_HANDOFF.md`

本轮不需要修改 `PROJECT_CONTEXT.md`，除非实现改变了已经记录的长期生命周期设计。

提交信息：

```txt
fix: 修复标题页新游戏启动
```

commit 并 push `main` 后停止，等待代码审查和人工回归。
