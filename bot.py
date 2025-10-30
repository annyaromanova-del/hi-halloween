"""Simple Telegram bot for launching the Halloween game."""

import asyncio
import logging
import os
from typing import NoReturn

from aiogram import Bot, Dispatcher, F
from aiogram.filters import CommandStart
from aiogram.types import CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, Message
from dotenv import load_dotenv

LOGGER = logging.getLogger(__name__)


async def handle_start(message: Message) -> None:
    """Send greeting message and inline buttons to the user."""
    keyboard = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                # Нельзя отследить клик по URL-кнопке: Telegram не сообщает об этом в API.
                InlineKeyboardButton(
                    text="🎮 Играть в Halloween Game",
                    url="https://annyaromanova-del.github.io/hi-halloween/",
                ),
                InlineKeyboardButton(
                    text="Я запустил(-а) игру ✅",
                    callback_data="played",
                ),
            ]
        ]
    )

    await message.answer(
        "Привет! 👋 Нажми кнопку, чтобы начать игру:",
        reply_markup=keyboard,
    )
    await message.answer("Удачной игры! 🎃")


async def handle_played(callback: CallbackQuery) -> None:
    """Handle acknowledgement that the game has been launched."""
    await callback.answer()
    await callback.message.answer(
        "Удачной игры! 🎃 Если ссылка не открывается внутри Telegram, попробуйте открыть её в браузере",
    )


async def main() -> NoReturn:
    """Load configuration and start the bot."""
    load_dotenv()

    bot_token = os.getenv("BOT_TOKEN")
    if not bot_token:
        raise ValueError("BOT_TOKEN is not set. Please configure it in the environment variables.")

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    LOGGER.info("Starting Halloween Telegram bot")

    bot = Bot(token=bot_token)
    dp = Dispatcher()

    dp.message.register(handle_start, CommandStart())
    dp.callback_query.register(handle_played, F.data == "played")

    try:
        await dp.start_polling(bot)
    finally:
        await bot.session.close()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        LOGGER.info("Bot stopped by user")
    except Exception as exc:  # noqa: BLE001 - log unexpected errors to simplify debugging
        LOGGER.exception("Unexpected error: %s", exc)
