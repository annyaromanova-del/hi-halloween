import asyncio
import logging
import os
from aiogram import Bot, Dispatcher, Router, types, F
from aiogram.filters import Command, CommandStart
from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from dotenv import load_dotenv

load_dotenv()
BOT_TOKEN = os.getenv("BOT_TOKEN")

# ВКЛ. ЛОГИ
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

bot = Bot(token=BOT_TOKEN)
dp = Dispatcher()
rt = Router()
dp.include_router(rt)

GAME_URL = "https://annyaromanova-del.github.io/hi-halloween/"

@rt.message(CommandStart())
async def on_start(m: types.Message):
    kb = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="🎮 Играть в Halloween Game", url=GAME_URL),
        InlineKeyboardButton(text="Я запустил(-а) игру ✅", callback_data="played")
    ]])
    await m.answer("Привет! 👋 Нажми кнопку, чтобы начать игру:", reply_markup=kb)
    await m.answer("Удачной игры! 🎃")

@rt.message(Command("halloweengame"))
async def on_halloween_cmd(m: types.Message):
    kb = InlineKeyboardMarkup(inline_keyboard=[[
        InlineKeyboardButton(text="🎮 Играть в Halloween Game", url=GAME_URL)
    ]])
    await m.answer("Готово! Жми и играй:", reply_markup=kb)

@rt.callback_query(F.data == "played")
async def on_played(cb: types.CallbackQuery):
    await cb.message.answer("Удачной игры! 🎃 Если ссылка не открылась внутри Telegram, открой её в браузере.")
    await cb.answer()

# На всякий: ответ на /ping
@rt.message(Command("ping"))
async def ping(m: types.Message):
    await m.answer("pong ✅")

# Фоллбек на любое сообщение — чтобы видеть, что бот жив
@rt.message()
async def fallback(m: types.Message):
    await m.answer("Напиши /start или /halloweengame 🙂")

async def main():
    if not BOT_TOKEN:
        raise RuntimeError("Нет BOT_TOKEN в .env")
    # ВАЖНО: удаляем вебхук при запуске polling
    await bot.delete_webhook(drop_pending_updates=True)
    logger.info("Bot started")
    await dp.start_polling(bot)

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("Bot stopped")
