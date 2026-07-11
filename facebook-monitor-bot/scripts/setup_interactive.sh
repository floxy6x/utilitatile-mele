#!/usr/bin/env bash
set -euo pipefail

cd /opt/facebook-monitor

printf '\nPaste the NEW Telegram bot token here, then press Enter. Input is hidden.\nToken: ' > /dev/tty
IFS= read -r -s TELEGRAM_BOT_TOKEN < /dev/tty
printf '\n\nNow open Telegram, send any message to your bot, then come back here and press Enter.\n' > /dev/tty
IFS= read -r _ < /dev/tty

printf 'Finding Telegram chat id...\n' > /dev/tty
UPDATES=$(curl -L -sS "api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates")
CHAT_ID=$(printf '%s' "$UPDATES" | python3 -c 'import sys,json; data=json.load(sys.stdin); r=data.get("result",[]); print(r[-1].get("message",{}).get("chat",{}).get("id","") if r else "")')

if [ -z "$CHAT_ID" ]; then
  printf 'No Telegram chat found. Send a message to the bot and run this again.\n' > /dev/tty
  exit 1
fi

cat > .env <<ENVEOF
TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID=$CHAT_ID
CHECK_INTERVAL_SECONDS=300
ENVEOF
chmod 600 .env

printf 'Chat id found. Building and starting the bot...\n' > /dev/tty
docker compose up -d --build

printf '\nCurrent container status:\n' > /dev/tty
docker compose ps

printf '\nSending a Telegram test message...\n' > /dev/tty
docker compose run --rm facebook-monitor python scripts/send_test.py

printf '\nDone. The bot is installed and running.\n' > /dev/tty
