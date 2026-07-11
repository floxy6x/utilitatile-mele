import os

import httpx
from dotenv import load_dotenv


def main() -> None:
    load_dotenv()
    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    if not token:
        raise SystemExit("Missing TELEGRAM_BOT_TOKEN in .env")

    response = httpx.get(f"https://api.telegram.org/bot{token}/getUpdates", timeout=30)
    response.raise_for_status()
    data = response.json()

    for update in data.get("result", []):
        message = update.get("message") or update.get("channel_post") or {}
        chat = message.get("chat") or {}
        if chat:
            print(f"chat_id={chat.get('id')} title={chat.get('title') or chat.get('username') or chat.get('first_name')}")


if __name__ == "__main__":
    main()
