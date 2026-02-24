"""
server.py - 本地机器 Socket.IO 后端
=====================================
桥接 Autodl 情绪服务器 与 移动端 App 前端。

架构：
  [Autodl /ws/emotion]  →  (后台 WebSocket 客户端)  →  [本地 Socket.IO 服务器]
                                                              ↓
                                                    [手机浏览器 / momo-mobile-hub]
                                                              ↓
                                              [机械臂控制接口 - TODO: 接入 lerobot]

启动：
  python server.py

前端同时启动（在 momo-mobile-hub-main 目录）：
  npm install
  npm run dev
  # 浏览器访问 http://localhost:8080，App 会自动连接本机的 :3000

Autodl 连接方式（二选一）：
  A) SSH 隧道：在本地终端执行
     ssh -L 6006:127.0.0.1:6006 root@<autodl-host> -p <autodl-port> -N
     然后 EMOTION_SERVER_URL 保持默认 ws://localhost:6006/ws/emotion

  B) Autodl 自定义服务域名：
     把 EMOTION_SERVER_URL 改为 ws://<autodl-domain>/ws/emotion
"""

import asyncio
import json
import logging
import os
import uuid

import aiohttp
from aiohttp import web
import socketio

try:
    import websockets
except ImportError:
    raise ImportError("请先安装依赖：pip install websockets")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# -----------------------------------------------------------------------
# 配置
# -----------------------------------------------------------------------

# Autodl 情绪服务器地址（通过 SSH 隧道或 Autodl 自定义域名访问）
EMOTION_SERVER_URL = "ws://localhost:6006/ws/emotion"

# 本地 Socket.IO 服务器端口（前端默认连接 http://localhost:3000）
PORT = 3000

# version2 情绪标签 → 前端 MoMo mood
EMOTION_TO_MOOD: dict[str, str] = {
    "开心": "positive",
    "伤心": "negative",
    "焦虑": "negative",
    "无聊": "neutral",
    "无人": "neutral",
}

# version2 情绪标签 → Lerobot 情绪状态机 emotion_id
EMOTION_TO_LEROBOT: dict[str, str] = {
    "开心": "happy",
    "伤心": "sad",
    "焦虑": "curious",
    "无聊": "wave",
    "无人": "neutral",
}

# Lerobot 触发接口 URL（为空字符串时关闭触发；未设置则使用默认本地端口）
_DEFAULT_LEROBOT_TRIGGER_URL = "http://127.0.0.1:9998/trigger"
LEROBOT_TRIGGER_URL = os.getenv("LEROBOT_TRIGGER_URL", _DEFAULT_LEROBOT_TRIGGER_URL)
if not LEROBOT_TRIGGER_URL.strip():
    LEROBOT_TRIGGER_URL = ""

# 触发 Lerobot 的最低情绪置信度（0–1）
LEROBOT_MIN_CONFIDENCE = 0.0

# 需要触发提醒横幅的情绪
ALERT_EMOTIONS = {"伤心", "焦虑", "无聊"}

# -----------------------------------------------------------------------
# 全局状态
# -----------------------------------------------------------------------

# sid → 会话信息 { nickname, momoName, deviceId, status }
sessions: dict[str, dict] = {}

# 最新一条来自 Autodl 的情绪数据
current_emotion: dict = {
    "emotion": "无人",
    "stable_state": "无人",
    "confidence": 0.0,
    "description": "",
    "timestamp": 0.0,
}


def make_status(mood: str = "neutral", user_present: bool = False, emotion: str = "无人") -> dict:
    return {
        "userPresent": user_present,
        "mood": mood,
        "emotion": emotion,
        "quietMode": False,
        "controlledBy": None,
        "controllerName": None,
        "currentAction": None,
        "online": True,
    }


# -----------------------------------------------------------------------
# Socket.IO 服务器
# -----------------------------------------------------------------------

sio = socketio.AsyncServer(
    async_mode="aiohttp",
    cors_allowed_origins="*",
    logger=False,
    engineio_logger=False,
)


@sio.event
async def connect(sid, environ):
    stable = current_emotion.get("stable_state", "无人")
    mood = EMOTION_TO_MOOD.get(stable, "neutral")
    sessions[sid] = {
        "nickname": "用户",
        "momoName": "MoMo",
        "deviceId": None,
        "status": make_status(mood=mood, user_present=stable != "无人", emotion=stable),
    }
    logger.info("Client connected: %s  (total: %d)", sid, len(sessions))


@sio.event
async def disconnect(sid):
    sessions.pop(sid, None)
    logger.info("Client disconnected: %s  (total: %d)", sid, len(sessions))


@sio.event
async def register(sid, data):
    """
    前端注册事件，返回 InitData 供 Home.tsx 初始化用。

    入参：{ nickname, momoName, deviceId? }
    返回：{ success, user, myMomoStatus, friendMomoStatuses }
    """
    nickname = data.get("nickname") or "用户"
    momo_name = data.get("momoName") or "MoMo"
    device_id = data.get("deviceId") or ("MOMO-" + str(uuid.uuid4())[:6].upper())

    stable = current_emotion.get("stable_state", "无人")
    mood = EMOTION_TO_MOOD.get(stable, "neutral")
    status = make_status(mood=mood, user_present=stable != "无人", emotion=stable)

    sessions[sid] = {
        "nickname": nickname,
        "momoName": momo_name,
        "deviceId": device_id,
        "status": status,
    }

    logger.info("Registered: %s / %s  device=%s", nickname, momo_name, device_id)

    return {
        "success": True,
        "user": {
            "id": sid,
            "nickname": nickname,
            "momoName": momo_name,
            "deviceId": device_id,
            "friends": [],
        },
        "myMomoStatus": status,
        "friendMomoStatuses": {},
    }


@sio.event
async def perform_action(sid, data):
    """执行 MoMo 动作（戳戳/蹭蹭/招呼/跳舞）。TODO：转发给 lerobot。"""
    action = data.get("action")
    target = data.get("targetDeviceId")
    logger.info("Action: %s → target=%s  (from %s)", action, target, sid)
    # TODO: robot.send_action(action)
    return {"success": True}


@sio.event
async def move_robot(sid, data):
    """驾驶模式移动指令。TODO：转发给 lerobot。"""
    direction = data.get("direction")
    intensity = data.get("intensity", 1.0)
    logger.info("Move: direction=%s  intensity=%.2f  (from %s)", direction, intensity, sid)
    # TODO: robot.move(direction, intensity)


@sio.event
async def stop_robot(sid, data):
    """停止移动。TODO：转发给 lerobot。"""
    logger.info("Stop robot  (from %s)", sid)
    # TODO: robot.stop()


@sio.event
async def get_friends(sid, data):
    return {"friends": []}


@sio.event
async def add_friend(sid, data):
    return {"success": False, "message": "好友功能尚未实现"}


@sio.event
async def remove_friend(sid, data):
    return {"success": True}


@sio.event
async def request_control(sid, data):
    return {"success": False, "message": "控制请求功能尚未实现"}


@sio.event
async def update_settings(sid, data):
    if sid in sessions:
        if "momoName" in data:
            sessions[sid]["momoName"] = data["momoName"]
        if "quietMode" in data:
            sessions[sid]["status"]["quietMode"] = data["quietMode"]
    return {"success": True}


# -----------------------------------------------------------------------
# 情绪处理：将 Autodl 推来的情绪广播给所有前端客户端
# -----------------------------------------------------------------------

async def handle_emotion(data: dict):
    global current_emotion
    current_emotion = data

    stable = data.get("stable_state", "无人")
    mood = EMOTION_TO_MOOD.get(stable, "neutral")
    user_present = stable != "无人"

    logger.info("Emotion: %s → mood=%s  conf=%.0f%%", stable, mood, data.get("confidence", 0) * 100)

    for sid, session in list(sessions.items()):
        updated_status = {
            **session.get("status", {}),
            "mood": mood,
            "userPresent": user_present,
            "emotion": stable,  # 原始情绪标签，供前端颜文字映射
        }
        sessions[sid]["status"] = updated_status

        # 广播状态更新（前端根据 mood/emotion 更新颜文字）
        await sio.emit("status_update", {
            "deviceId": session.get("deviceId"),
            "status": updated_status,
        }, to=sid)

        # 特定情绪触发提醒横幅
        if stable in ALERT_EMOTIONS:
            await sio.emit("emotion_alert", {
                "deviceId": session.get("deviceId"),
                "ownerName": session.get("nickname", "用户"),
                "momoName": session.get("momoName", "MoMo"),
                "emotion": stable,
                "description": data.get("description", ""),
            }, to=sid)
            logger.info("Alert sent to %s: %s", session.get("nickname"), stable)

    # 将情绪同步给本地 Lerobot 状态机（如果已配置触发 URL）
    if LEROBOT_TRIGGER_URL:
        lerobot_emotion = EMOTION_TO_LEROBOT.get(stable)
        confidence = data.get("confidence", 0.0) or 0.0
        if lerobot_emotion and confidence >= LEROBOT_MIN_CONFIDENCE:
            try:
                timeout = aiohttp.ClientTimeout(total=0.5)
                async with aiohttp.ClientSession(timeout=timeout) as session:
                    await session.post(
                        LEROBOT_TRIGGER_URL,
                        json={"emotion": lerobot_emotion},
                    )
            except Exception as exc:
                logger.debug(
                    "Failed to POST emotion to Lerobot (%s: %s)",
                    type(exc).__name__,
                    exc,
                )


# -----------------------------------------------------------------------
# 后台任务：持续订阅 Autodl 情绪 WebSocket
# -----------------------------------------------------------------------

async def emotion_receiver(_app: web.Application):
    RETRY_DELAY = 3
    while True:
        try:
            async with websockets.connect(EMOTION_SERVER_URL) as ws:
                logger.info("Connected to Autodl emotion server: %s", EMOTION_SERVER_URL)
                async for raw in ws:
                    try:
                        data = json.loads(raw)
                        await handle_emotion(data)
                    except json.JSONDecodeError:
                        logger.warning("Non-JSON message: %.80s", raw)
        except Exception as exc:
            logger.warning(
                "Autodl connection lost (%s: %s), retrying in %ds…",
                type(exc).__name__, exc, RETRY_DELAY,
            )
            await asyncio.sleep(RETRY_DELAY)


async def start_tasks(app: web.Application):
    app["emotion_task"] = asyncio.create_task(emotion_receiver(app))


async def stop_tasks(app: web.Application):
    if task := app.get("emotion_task"):
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


# -----------------------------------------------------------------------
# App
# -----------------------------------------------------------------------

app = web.Application()
sio.attach(app)
app.on_startup.append(start_tasks)
app.on_cleanup.append(stop_tasks)

if __name__ == "__main__":
    logger.info("Socket.IO backend starting on http://0.0.0.0:%d", PORT)
    logger.info("Autodl emotion server: %s", EMOTION_SERVER_URL)
    logger.info("Make sure SSH tunnel is active:  ssh -L 6006:127.0.0.1:6006 root@<autodl-host> -p <port> -N")
    web.run_app(app, host="0.0.0.0", port=PORT, print=None)
