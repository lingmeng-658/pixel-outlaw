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

- `src/main.ts`：主场景 MainScene，负责游戏流程、玩家、敌人、子弹、道具、暂停、第一关波次推进。
- `src/constants.ts`：游戏尺寸、玩家速度、子弹速度、冷却时间、道具持续时间等基础数值。
- `src/levelOne.ts`：第一关各阶段敌人数量配置。
- `src/types.ts`：道具类型、第一关存档阶段类型。
- `src/save.ts`：存档 key、第一关存档数据结构、创建第一关存档数据的方法。
- `src/textures.ts`：临时像素纹理创建逻辑。
- `src/style.css`：页面居中、背景、canvas 像素渲染和边框样式。
- `vite.config.ts`：Vite 配置，当前主要用于 GitHub Pages 子路径部署。
- `.github/workflows/deploy.yml`：GitHub Pages 自动部署工作流。

当前重构原则：先保持玩法稳定，只把边界清晰、低风险的代码拆出去，不一次性大拆 UI、战斗和关卡控制。

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

存档采用关卡级检查点恢复：第一关未通关时，Continue 从 Dusty Outskirts 关卡开头重新开始；已通关时恢复 Dusty Outskirts 出口或 Town Road 区域。不会保存或恢复中途波次、战场对象、玩家精确位置或限时道具剩余时间。

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
