import asyncio
import logging
import os

from aiogram import Bot, Dispatcher
from dotenv import load_dotenv

from app.handlers import router

load_dotenv()
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)
logger = logging.getLogger(__name__)


async def main():
    token = os.getenv('BOT_TOKEN')
    if not token:
        raise ValueError('BOT_TOKEN не задан в .env')

    bot = Bot(token=token)
    dp = Dispatcher()
    dp.include_router(router)

    logger.info('🤖 Бот іске қосылды')
    await dp.start_polling(bot)


if __name__ == '__main__':
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        logger.info('Бот сөндірулі')