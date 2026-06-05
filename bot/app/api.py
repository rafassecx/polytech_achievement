import os
from typing import Optional
import httpx
from dotenv import load_dotenv

load_dotenv()

API_URL = os.getenv('API_URL', 'http://localhost:5000/api').rstrip('/')
BOT_API_KEY = os.getenv('BOT_API_KEY')

if not BOT_API_KEY:
    raise ValueError('BOT_API_KEY не задан в .env')


class APIError(Exception):
    def __init__(self, status: int, message: str):
        self.status = status
        self.message = message
        super().__init__(f'[{status}] {message}')


async def _request(method: str, path: str, **kwargs):
    headers = kwargs.pop('headers', {})
    headers['X-Bot-API-Key'] = BOT_API_KEY

    async with httpx.AsyncClient(timeout=30) as client:
        try:
            response = await client.request(method, API_URL + path, headers=headers, **kwargs)
        except httpx.RequestError as e:
            raise APIError(0, f'Желілік қате: {e}')

    if response.status_code >= 400:
        try:
            message = response.json().get('message', 'Белгісіз қате')
        except Exception:
            message = response.text or 'Белгісіз қате'
        raise APIError(response.status_code, message)

    return response.json()


async def link_account(code: str, telegram_id: int, telegram_username: Optional[str]):
    return await _request('POST', '/bot/link', json={
        'code': code,
        'telegram_id': telegram_id,
        'telegram_username': telegram_username,
    })


async def get_user_by_telegram(telegram_id: int):
    try:
        return await _request('GET', f'/bot/users/by-telegram/{telegram_id}')
    except APIError as e:
        if e.status == 404:
            return None
        raise


async def create_achievement(telegram_id: int, title: str, description: str,
                              category: str, event_date: Optional[str] = None):
    return await _request('POST', '/bot/achievements', json={
        'telegram_id': telegram_id,
        'title': title,
        'description': description,
        'category': category,
        'event_date': event_date,
    })


async def upload_file(achievement_id: int, telegram_id: int, file_bytes: bytes,
                      filename: str, content_type: str = 'image/jpeg'):
    headers = {'X-Bot-API-Key': BOT_API_KEY}
    files = {'files': (filename, file_bytes, content_type)}
    data = {'telegram_id': str(telegram_id)}

    async with httpx.AsyncClient(timeout=60) as client:
        response = await client.post(
            f'{API_URL}/bot/achievements/{achievement_id}/upload',
            files=files, data=data, headers=headers
        )

    if response.status_code >= 400:
        try:
            message = response.json().get('message', 'Жүктеу қатесі')
        except Exception:
            message = response.text
        raise APIError(response.status_code, message)

    return response.json()


async def get_feed(limit: int = 10):
    return await _request('GET', f'/bot/feed?limit={limit}')


async def get_my_achievements(telegram_id: int):
    return await _request('GET', f'/bot/my-achievements/{telegram_id}')