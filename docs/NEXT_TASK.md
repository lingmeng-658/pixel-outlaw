# Next Task: 接入玩家单帧角色素材

## 任务状态

已由 Codex 实现并完成自动验收，等待用户审查与最终视觉确认。

当前实现基线：

```txt
fbcd872 feat: 添加玩家角色素材
```

目标提交：

```txt
feat: 接入玩家角色素材
```

---

## 一、本轮目标

将以下 32×32 RGBA PNG 接入游戏，替换玩家画面中的程序生成纹理：

```txt
src/assets/sprites/player/player-idle-down.png
```

本轮只完成单帧素材接入与游戏内尺寸验证。

---

## 二、范围与实现

- 使用 Vite URL import 获取素材地址。
- 在 Phaser `preload()` 中以 `playerIdleDown` key 加载 PNG。
- 玩家创建时使用 `playerIdleDown`。
- 保持 PNG 原生 32×32 显示，不额外放大。
- Arcade body 显式保持 28×28，并自动居中为 2×2 offset。
- 保持原出生位置、depth、世界边界行为。
- 保留原 `player` 程序纹理作为回退。
- 继续使用 Phaser `pixelArt: true` 和 canvas `image-rendering: pixelated`。

未制作方向帧、行走/待机/射击动画，未旋转玩家 Sprite，未修改移动、射击、敌人、关卡、存档、道具、战场尺寸、玩法数值或 `MainScene` 结构。

---

## 三、验收结果

### 构建与静态检查

- 修改前 `npm run build`：通过。
- 修改后 `npm run build`：通过。
- `git diff --check`：通过。
- 仅有既有 Vite 大 chunk 警告，未处理。

### 浏览器验收

Playwright 已实际验证：

1. 标题页正常显示；
2. 点击 START GAME 可进入第一关；
3. SPACE 可进入第一关；
4. 新玩家 Sprite 正常显示；
5. 玩家约 32×32，与普通敌人尺寸协调；
6. 背景透明，无矩形底色、灰边或明显光晕；
7. WASD 移动正常；
8. 四方向及四个对角方向射击正常；
9. 28×28 居中碰撞体未出现明显扩大；
10. ESC 暂停正常；
11. Restart Level 后仍使用新素材；
12. Save Progress & Quit / Continue 基础回归通过；
13. Console 无未捕获错误。截图读取产生的 Chromium WebGL `ReadPixels` 性能 warning 与游戏代码无关。

---

## 四、用户最终确认

建议运行：

```bash
npm run dev
```

人工确认：

- 32×32 角色在实际显示器缩放下是否与普通敌人协调；
- 透明轮廓是否符合主观视觉预期；
- 玩家与敌人接触时，28×28 碰撞手感是否自然。

---

## 五、后续建议

本轮提交后停止，等待审查。不要继续制作方向帧或动画；后续美术任务需要另行确认范围。
