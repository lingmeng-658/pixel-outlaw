# Next Task: 待确认

## 当前状态

关卡级 Continue Saved Game 修复已实现并通过用户本机试玩验收。

已验收通过的行为：

1. 清空 `pixel-outlaw-save` 后刷新，标题页不显示 Continue。
2. 无存档时 Start Game / SPACE 正常开始新游戏。
3. 第一关未通关时保存退出，Continue 从 Dusty Outskirts 第一关开头开始。
4. 未通关 Continue 不再重复恢复 Heart / Coffee / Shield / final 中途阶段。
5. 通关后保存退出，Continue 恢复已通关 Dusty Outskirts，出口开放。
6. Town Road 保存退出，Continue 回到 Town Road，并能返回已通关的 Dusty Outskirts。
7. New Game 不继承旧存档的 score / health / coins / 阶段。

相关提交：

```txt
fix: 简化继续游戏为关卡级检查点
```

---

## 不要继续执行的旧任务

此前的任务“简化 Continue 为关卡级检查点”已经完成并验收通过。

Codex 下次启动时不要继续围绕该任务修改源码，也不要重新把 Continue 改回阶段级恢复。

---

## 下一轮任务待用户确认

当前还没有新的已确认源码任务。

候选方向可以从以下几类中选择，但开始前必须先和用户确认本轮目标、不做什么和验收标准：

1. 稳定区域与关卡状态模型。
2. 设计金币的最小消费用途。
3. 小步拆分 `MainScene`，只做低风险结构整理。
4. 增加 Ammo Box 或一种新敌人。
5. 继续做真实试玩反馈中的最小 bugfix。

---

## 给 Codex 的启动要求

下次任务开始前，请阅读：

- `AGENTS.md`
- `PROJECT_CONTEXT.md`
- `docs/AI_HANDOFF.md`
- 本文件

如果用户没有给出新的明确任务，请先只读核对并询问下一轮目标，不要主动修改源码。
