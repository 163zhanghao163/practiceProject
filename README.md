# 🎮 practiceProject — 小游戏 & 工具合集

一套**纯前端**（原生 HTML / CSS / JavaScript，零依赖、零构建、零后端）的小游戏与实用工具合集。
克隆或下载后直接打开 [`index.html`](index.html) 即可从主页进入各个项目，也可以把整个目录部署到任意静态网站托管平台（GitHub Pages、Vercel、Netlify 等）。

## 📂 目录结构

```
practiceProject/
├── index.html               # 主页：入口卡片，选择进入各游戏/工具
├── puzzle-game/             # 🧩 拼图小游戏（数字 / 图片模式）
├── drag-puzzle-game/        # 🖱️ 拖拽拼图（6 档难度）
├── pixel-adventure/         # 🕹️ 像素大冒险（横版闯关）
├── roguelike-arena/         # ⚔️ 像素勇者 · 怪物围城（割草肉鸽）
└── token-usage-tracker/     # 📊 AI 工具 Token 用量统计
    ├── index.html           # 工具主页面
    └── scan-cli.mjs         # 命令行扫描脚本（Node.js）
```

## 🚀 快速开始

无需安装任何依赖：

- **直接打开**：双击 `index.html`（所有功能均可本地运行）
- **本地服务器**（推荐，路径行为与线上一致）：
  ```bash
  # Python
  python -m http.server 8080
  # 或 Node.js
  npx serve .
  ```
  然后访问 `http://localhost:8080`
- **GitHub Pages**：仓库设置中开启 Pages（根目录），即可在线游玩

## 🎮 游戏介绍

### 🧩 拼图小游戏（puzzle-game）

经典滑块拼图：点击空格旁的方块（或方向键）移动拼块，目标是按顺序归位。

- 数字 / 图片两种模式，3×3 / 4×4 / 5×5 三档难度
- 支持上传本地图片
- 统计步数与用时，最佳记录按难度分别保存（localStorage）

### 🖱️ 拖拽拼图（drag-puzzle-game）

把散落的拼块拖进棋盘，放到已有拼块的格子上会交换位置。

- 3×3 ～ 8×8 共 6 档难度
- 基于 Pointer Events，**鼠标和触屏都能拖拽**
- 「底图提示」可在棋盘上显示半透明原图作参考
- 支持本地图片，记录按难度分别保存

### 🕹️ 像素大冒险（pixel-adventure）

像素风横版闯关平台游戏，共 3 关：绿野草原 → 幽暗洞窟 → 熔岩要塞。

- 手感细节：土狼时间、跳跃预输入、可变跳跃高度、受击无敌帧
- 机关要素：弹跳板、水平/垂直移动平台、问号砖、尖刺、岩浆、飞行蝙蝠
- 第 3 关终点旗需要收集指定数量金币解锁
- 全部关卡地图经过跳跃距离验证，保证可通关
- **移动端**：触屏虚拟按键（◀ ▶ / 跳 / 重开），手机横屏自动全屏布局

### ⚔️ 像素勇者 · 怪物围城（roguelike-arena）

肉鸽割草生存：1920×1080 大地图走位躲怪（镜头跟随 + 小地图），攻击全自动。两种模式：

- **⏱ 限时存活**：怪物围城 8 分钟，坚持到底即胜利
- **♾ 无尽刷分**：没有终点，怪物越战越强，挑战最高击杀纪录（本地保存）

- 升级三选一，共 11 种强化（多重弹丸、贯穿、环绕利刃、疾风之靴……）
- 每 2 分钟刷新一只精英 Boss
- 怪物掉落道具护符：💣炸弹 / ❄冰冻 / 🛡护盾 / 🔥狂暴 / 🧿磁暴
- 暴击、吸附拾取、屏幕震动等打击感细节
- **移动端**：左下角虚拟摇杆（模拟量移动 + 死区防误触）

## 📊 工具介绍

### Token 用量统计（token-usage-tracker）

统计 Trae / Codex / Claude / DeepSeek / ZCode 等 AI 编程工具的 token 用量与估算费用，数据全部保存在本地（localStorage + IndexedDB），**不上传任何数据**。

- 9 种工具单价可配置（$ / 1M tokens），费用实时重算
- 四种数据来源：手动添加、导入 JSON/JSONL/CSV 文件、拖拽导入、目录扫描
- **目录扫描**：直接扫描 `.claude`、ZCode 等工具目录，自动解析用量文件；
  支持目录句柄持久化（下次一键重扫）与增量扫描（未变化的文件自动跳过）
- 兼容模式：不支持 File System Access API 的浏览器可按文件夹方式导入
- Canvas 绘制的工具用量柱状图 + 近 30 天趋势折线图
- 记录筛选、单条删除、JSON / CSV 导出、示例数据
- 附带命令行脚本 `scan-cli.mjs`，可在 Node.js 环境直接扫描目录：

  ```bash
  node scan-cli.mjs ~/.claude Claude ~/codex-log Codex --out usage.json
  ```

> 💡 Token 解析逻辑：自动识别 `input_tokens / prompt_tokens`、`output_tokens / completion_tokens`
> 等常见字段，缓存读写计入输入；使用记录无时间戳时自动继承父级日期。

## 📱 移动端适配

所有页面均已适配 PC 与移动双端：

- 响应式布局 + 禁用双击缩放与页面回弹
- 画布游戏按 16:9 自适应缩放，手机横屏自动隐藏标题说明、画布占满屏幕
- 触屏设备显示虚拟按键 / 摇杆（`@media (pointer: coarse)`），键鼠操作完全不受影响

## 🛠️ 技术说明

- 原生 HTML5 / CSS3 / JavaScript，无任何框架与构建工具
- 游戏使用 Canvas 2D + 固定时间步长 rAF 循环
- 数据持久化：localStorage（记录 / 单价）+ IndexedDB（目录句柄）
- 推荐使用现代浏览器的最新版本；目录扫描功能需要支持
  [File System Access API](https://developer.mozilla.org/docs/Web/API/File_System_API) 的浏览器（Chrome / Edge 等）
