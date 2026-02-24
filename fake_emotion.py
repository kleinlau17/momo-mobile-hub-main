import asyncio, json, websockets

async def main():
    async with websockets.serve(handler, "localhost", 6006):
        await asyncio.Future()  # 永远运行

async def handler(ws):
    emotions = ["开心", "伤心", "焦虑", "无聊", "无人"]
    while True:
        for e in emotions:
            await ws.send(json.dumps({
                "emotion": e, "stable_state": e,
                "confidence": 0.9, "description": f"测试：{e}",
                "timestamp": 1234567890.0
            }))
            await asyncio.sleep(3)  # 每3秒换一次情绪

asyncio.run(main())