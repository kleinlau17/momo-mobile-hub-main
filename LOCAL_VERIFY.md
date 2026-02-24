# 本地快速验证：情绪 → 颜文字

## 前置条件

- 已安装 Node.js v18+
- 已创建 conda 环境 `momoAPP` 并安装 `python-socketio[aiohttp] websockets`

## 启动顺序

在三个终端中依次执行：

```bash
# 终端 1：fake_emotion 模拟情绪服务器（每 3 秒轮换：开心→伤心→焦虑→无聊→无人）
conda activate momoAPP
cd momo-mobile-hub-main
python fake_emotion.py

# 终端 2：Socket.IO 后端（桥接 ws://localhost:6006 → 前端）
conda activate momoAPP
cd momo-mobile-hub-main
python server.py

# 终端 3：前端
cd momo-mobile-hub-main
npm i
npm run dev
```

访问 `http://localhost:5173`（或 8080），完成 onboarding 后进入主界面。

**关闭 Debug 模式**（右上角齿轮 → 关闭 Mock 模式），否则会走 mock 数据，不会收到真实情绪。

## 情绪 → 颜文字映射

| 情绪 | 颜文字示例 |
|------|------------|
| 开心 | (￣▽￣) (＾▽＾) |
| 伤心 | (´·ω·`) (；ω；) |
| 焦虑 | (╯°□°）╯ (￣^￣) |
| 无聊 | (-.-)zzZ (￣o￣)zzZ |
| 无人 | (｡·ω·｡) |

主界面中央的 MoMo 颜文字会随 fake_emotion 的情绪标签每 3 秒自动切换。
