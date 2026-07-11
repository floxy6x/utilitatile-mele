import asyncio
import json
import logging
import os
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import parse_qsl, urlencode, urljoin, urlparse, urlunparse

import httpx
from dotenv import load_dotenv
from playwright.async_api import Browser, Page, async_playwright


FACEBOOK_HOSTS = {"facebook.com", "www.facebook.com", "m.facebook.com", "web.facebook.com"}
POST_PATH_MARKERS = (
    "/posts/",
    "/videos/",
    "/reel/",
    "/photos/",
    "/photo/",
    "/share/p/",
    "/share/v/",
)
POST_QUERY_PATHS = {"/permalink.php", "/story.php", "/photo.php", "/watch/"}


@dataclass(frozen=True)
class Config:
    telegram_bot_token: str
    telegram_chat_id: str
    pages: list[str]
    check_interval_seconds: int
    alert_on_first_run: bool
    headless: bool
    data_dir: Path
    navigation_timeout_ms: int

    @property
    def state_file(self) -> Path:
        return self.data_dir / "state.json"


def env_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "y", "on"}


def load_pages() -> list[str]:
    raw_pages = os.getenv("FACEBOOK_PAGES", "")
    pages = [item.strip() for item in raw_pages.split(",") if item.strip()]

    pages_file = os.getenv("FACEBOOK_PAGES_FILE", "pages.txt")
    file_path = Path(pages_file)
    if file_path.exists():
        pages.extend(
            line.strip()
            for line in file_path.read_text(encoding="utf-8").splitlines()
            if line.strip() and not line.strip().startswith("#")
        )

    deduped: list[str] = []
    seen: set[str] = set()
    for page in pages:
        normalized = normalize_page_url(page)
        if normalized not in seen:
            seen.add(normalized)
            deduped.append(normalized)
    return deduped


def load_config() -> Config:
    load_dotenv()
    token = os.getenv("TELEGRAM_BOT_TOKEN", "").strip()
    chat_id = os.getenv("TELEGRAM_CHAT_ID", "").strip()
    pages = load_pages()

    if not token:
        raise SystemExit("Missing TELEGRAM_BOT_TOKEN. Copy .env.example to .env and fill it in.")
    if not chat_id:
        raise SystemExit("Missing TELEGRAM_CHAT_ID.")
    if not pages:
        raise SystemExit("No Facebook pages configured.")

    return Config(
        telegram_bot_token=token,
        telegram_chat_id=chat_id,
        pages=pages,
        check_interval_seconds=int(os.getenv("CHECK_INTERVAL_SECONDS", "300")),
        alert_on_first_run=env_bool("ALERT_ON_FIRST_RUN", False),
        headless=env_bool("HEADLESS", True),
        data_dir=Path(os.getenv("DATA_DIR", "data")),
        navigation_timeout_ms=int(os.getenv("NAVIGATION_TIMEOUT_MS", "45000")),
    )


def normalize_page_url(url: str) -> str:
    parsed = urlparse(url if "://" in url else f"https://{url}")
    return urlunparse(("https", parsed.netloc.lower(), parsed.path.rstrip("/") or "/", "", parsed.query, ""))


def normalize_facebook_url(url: str, base_url: str) -> str | None:
    absolute = urljoin(base_url, url)
    parsed = urlparse(absolute)
    host = parsed.netloc.lower().removeprefix("www.")

    if host not in {h.removeprefix("www.") for h in FACEBOOK_HOSTS}:
        return None

    path = re.sub(r"/+", "/", parsed.path).rstrip("/")
    query = dict(parse_qsl(parsed.query, keep_blank_values=False))

    if any(marker in path for marker in POST_PATH_MARKERS):
        return urlunparse(("https", "www.facebook.com", path, "", "", ""))

    if path in POST_QUERY_PATHS:
        keep = {key: query[key] for key in ("story_fbid", "id", "fbid", "v") if key in query}
        if keep:
            return urlunparse(("https", "www.facebook.com", path, "", urlencode(keep), ""))

    return None


def load_state(path: Path) -> dict[str, Any]:
    if not path.exists():
        return {"latest": {}}
    return json.loads(path.read_text(encoding="utf-8"))


def save_state(path: Path, state: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(state, indent=2, sort_keys=True), encoding="utf-8")
    tmp.replace(path)


async def dismiss_common_dialogs(page: Page) -> None:
    labels = [
        "Allow all cookies",
        "Only allow essential cookies",
        "Decline optional cookies",
        "Accept all",
        "Close",
        "Not now",
    ]
    for label in labels:
        locator = page.get_by_text(label, exact=True)
        try:
            if await locator.count() == 1 and await locator.is_visible():
                await locator.click(timeout=1500)
        except Exception:
            continue


async def extract_latest_post(browser: Browser, page_url: str, timeout_ms: int) -> str | None:
    page = await browser.new_page()
    try:
        await page.goto(page_url, wait_until="domcontentloaded", timeout=timeout_ms)
        await dismiss_common_dialogs(page)
        await page.wait_for_timeout(2500)

        for _ in range(3):
            await page.mouse.wheel(0, 900)
            await page.wait_for_timeout(1000)

        links = await page.eval_on_selector_all(
            "a[href]",
            """(anchors) => anchors.slice(0, 400).map((a) => ({
                href: a.getAttribute("href") || "",
                text: (a.innerText || a.textContent || "").slice(0, 240)
            }))""",
        )

        for item in links:
            normalized = normalize_facebook_url(item.get("href", ""), page_url)
            if normalized:
                return normalized
        return None
    finally:
        await page.close()


async def send_telegram_message(config: Config, text: str) -> None:
    api_url = f"https://api.telegram.org/bot{config.telegram_bot_token}/sendMessage"
    payload = {
        "chat_id": config.telegram_chat_id,
        "text": text,
        "disable_web_page_preview": False,
    }
    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(api_url, json=payload)
        response.raise_for_status()


async def check_once(config: Config, browser: Browser, state: dict[str, Any]) -> bool:
    changed = False
    latest_by_page = state.setdefault("latest", {})

    for page_url in config.pages:
        logging.info("Checking %s", page_url)
        try:
            latest_post = await extract_latest_post(browser, page_url, config.navigation_timeout_ms)
        except Exception:
            logging.exception("Failed to check %s", page_url)
            continue

        if not latest_post:
            logging.warning("No post link found for %s", page_url)
            continue

        previous = latest_by_page.get(page_url)
        if previous == latest_post:
            logging.info("No change for %s", page_url)
            continue

        latest_by_page[page_url] = latest_post
        changed = True

        if previous or config.alert_on_first_run:
            message = f"Postare noua detectata:\n{page_url}\n\n{latest_post}"
            await send_telegram_message(config, message)
            logging.info("Alert sent for %s", page_url)
        else:
            logging.info("Baseline saved for %s", page_url)

    return changed


async def main() -> None:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    config = load_config()
    config.data_dir.mkdir(parents=True, exist_ok=True)
    state = load_state(config.state_file)

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(headless=config.headless)
        try:
            while True:
                changed = await check_once(config, browser, state)
                if changed:
                    save_state(config.state_file, state)
                await asyncio.sleep(config.check_interval_seconds)
        finally:
            await browser.close()


if __name__ == "__main__":
    asyncio.run(main())
