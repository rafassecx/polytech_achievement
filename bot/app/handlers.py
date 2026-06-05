import logging
from datetime import datetime
from io import BytesIO

from aiogram import Router, F, Bot
from aiogram.types import Message, CallbackQuery
from aiogram.filters import CommandStart, Command
from aiogram.fsm.context import FSMContext

import app.keyboards as kb
from app import api
from app.states import AchievementStates

logger = logging.getLogger(__name__)
router = Router()


# ───────────────────────────────────────────
# /start
# ───────────────────────────────────────────
@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext):
    await state.clear()
    try:
        user = await api.get_user_by_telegram(message.from_user.id)
    except api.APIError as e:
        await message.answer(f'❌ API қатесі: {e.message}')
        return

    if user:
        await message.answer(
            f"Қайта оралғаныңызға қуаныштымын, {user['full_name']}! 👋\n\n"
            f"🎓 Рөл: {user['role']}\n"
            f"📚 Топ: {user.get('group_name') or '—'}",
            reply_markup=kb.main
        )
    else:
        await message.answer(
            '🎓 Жетістіктерді тіркеу ботына қош келдіңіз!\n\n'
            'Бот сізге өз жетістіктеріңізді тіркеуге және басқалардың '
            'жетістіктерін көруге мүмкіндік береді.\n\n'
            '⚙️ Боттың толық функционалын қолдану үшін сайттағы аккаунтыңызбен '
            'байланыстырыңыз:\n\n'
            '1️⃣ Сайтқа кіріңіз\n'
            '2️⃣ Профильден 6 сандық кодты алыңыз\n'
            '3️⃣ Кодты осында жіберіңіз:\n'
            '   <code>/link 123456</code>',
            reply_markup=kb.not_linked,
            parse_mode='HTML'
        )


# ───────────────────────────────────────────
# /link <code>
# ───────────────────────────────────────────
@router.message(Command('link'))
async def cmd_link(message: Message, state: FSMContext):
    await state.clear()
    parts = message.text.split(maxsplit=1)

    if len(parts) < 2:
        await message.answer(
            'Кодты енгізіңіз. Мысалы:\n<code>/link 123456</code>',
            parse_mode='HTML'
        )
        return

    code = parts[1].strip()
    if not code.isdigit() or len(code) != 6:
        await message.answer('❌ Қате формат. Код 6 саннан тұруы керек.')
        return

    try:
        result = await api.link_account(
            code=code,
            telegram_id=message.from_user.id,
            telegram_username=message.from_user.username
        )
        user = result['user']
        await message.answer(
            f"✅ Сәтті байланыстырылды!\n\n"
            f"👤 {user['full_name']}\n"
            f"📧 {user['email']}\n"
            f"🎓 Рөл: {user['role']}",
            reply_markup=kb.main
        )
    except api.APIError as e:
        await message.answer(f'❌ Қате: {e.message}')


# ───────────────────────────────────────────
# Помощь и подсказки
# ───────────────────────────────────────────
@router.message(F.text == '🔗 Аккаунтты байланыстыру')
async def link_hint(message: Message):
    await message.answer(
        '🔗 Аккаунтты байланыстыру:\n\n'
        '1. Сайтта тіркеліп, кіріңіз\n'
        '2. Профильде "Telegram-ды байланыстыру" батырмасын басыңыз\n'
        '3. 6 сандық кодты алып, осында жіберіңіз:\n'
        '   <code>/link 123456</code>',
        parse_mode='HTML'
    )


@router.message(F.text == 'ℹ️ Көмек')
@router.message(Command('help'))
async def help_msg(message: Message):
    await message.answer(
        '📖 Командалар:\n\n'
        '/start — Бастау\n'
        '/link КОД — Сайттағы аккаунтпен байланыстыру\n'
        '/me — Менің профилім\n'
        '/help — Көмек\n\n'
        'Менюдегі батырмалар арқылы да басқаруға болады.'
    )


# ───────────────────────────────────────────
# /me — профиль
# ───────────────────────────────────────────
@router.message(Command('me'))
@router.message(F.text == '👤 Профиль')
async def cmd_me(message: Message):
    try:
        user = await api.get_user_by_telegram(message.from_user.id)
    except api.APIError as e:
        await message.answer(f'❌ {e.message}')
        return

    if not user:
        await message.answer('Сіз әлі байланысқан жоқсыз. /link КОД командасын қолданыңыз.')
        return

    text = (
        f"👤 <b>Сіздің профиліңіз</b>\n\n"
        f"📝 Аты-жөні: {user['full_name']}\n"
        f"📧 Email: {user['email']}\n"
        f"🎓 Рөл: <b>{user['role']}</b>\n"
        f"📚 Топ: {user.get('group_name') or '—'}\n"
    )
    if user.get('bio'):
        text += f"\n💭 Био: {user['bio']}"

    await message.answer(text, parse_mode='HTML')


# ───────────────────────────────────────────
# ❌ Аяқтау
# ───────────────────────────────────────────
@router.message(F.text == '❌ Аяқтау')
async def cancel_handler(message: Message, state: FSMContext):
    current = await state.get_state()
    if current:
        await state.clear()
        await message.answer('❌ Бас тартылды.', reply_markup=kb.main)
    else:
        await message.answer('Тоқтататын әрекет жоқ.', reply_markup=kb.main)


# ───────────────────────────────────────────
# 🏆 Жетістік қосу — FSM
# ───────────────────────────────────────────
@router.message(F.text == '🏆 Жетістік қосу')
async def add_achievement(message: Message, state: FSMContext):
    try:
        user = await api.get_user_by_telegram(message.from_user.id)
    except api.APIError as e:
        await message.answer(f'❌ {e.message}')
        return

    if not user:
        await message.answer('⚠️ Алдымен аккаунтты байланыстырыңыз: /link КОД')
        return

    await message.answer(
        '📝 <b>Жаңа жетістік</b>\n\nАтауын жазыңыз:',
        reply_markup=kb.cancel,
        parse_mode='HTML'
    )
    await state.set_state(AchievementStates.waiting_for_title)


@router.message(AchievementStates.waiting_for_title, F.text != '❌ Аяқтау')
async def title_received(message: Message, state: FSMContext):
    title = message.text.strip()
    if len(title) < 3:
        await message.answer('Атау кемінде 3 әріптен тұруы керек!')
        return
    await state.update_data(title=title)
    await message.answer('Категорияны таңдаңыз:', reply_markup=kb.categories_inline())
    await state.set_state(AchievementStates.waiting_for_category)


@router.callback_query(AchievementStates.waiting_for_category, F.data.startswith('cat_'))
async def category_chosen(callback: CallbackQuery, state: FSMContext):
    await callback.answer()
    category = callback.data.split('_', 1)[1]
    await state.update_data(category=category)
    await callback.message.delete()
    await callback.message.answer('📝 Сипаттаманы жазыңыз:', reply_markup=kb.cancel)
    await state.set_state(AchievementStates.waiting_for_description)


@router.message(AchievementStates.waiting_for_description, F.text != '❌ Аяқтау')
async def description_received(message: Message, state: FSMContext):
    desc = message.text.strip()
    if len(desc) < 5:
        await message.answer('Сипаттама тым қысқа!')
        return
    await state.update_data(description=desc)
    await message.answer(
        '📅 Жетістік күнін жіберіңіз\nФормат: DD.MM.YYYY\nМысалы: 15.03.2026',
        reply_markup=kb.cancel
    )
    await state.set_state(AchievementStates.waiting_for_date)


@router.message(AchievementStates.waiting_for_date, F.text != '❌ Аяқтау')
async def date_received(message: Message, state: FSMContext):
    try:
        event_date = datetime.strptime(message.text.strip(), '%d.%m.%Y')
    except ValueError:
        await message.answer('❌ Қате формат. DD.MM.YYYY форматында жіберіңіз.')
        return
    await state.update_data(event_date=event_date.strftime('%Y-%m-%d'))
    await message.answer(
        '📸 Фото жіберіңіз\n(немесе "⏩ Өткізіп жіберу")',
        reply_markup=kb.skip_or_cancel
    )
    await state.set_state(AchievementStates.waiting_for_photo)


@router.message(AchievementStates.waiting_for_photo, F.text == '⏩ Өткізіп жіберу')
async def skip_photo(message: Message, state: FSMContext):
    data = await state.get_data()
    try:
        result = await api.create_achievement(
            telegram_id=message.from_user.id,
            title=data['title'],
            description=data['description'],
            category=data['category'],
            event_date=data.get('event_date')
        )
        achievement_id = result['achievement']['id']
        await message.answer(
            f"✅ <b>Жетістік сәтті қосылды!</b>\n\n"
            f"🏆 {data['title']}\n"
            f"📅 {data.get('event_date')}\n"
            f"🆔 ID: {achievement_id}\n\n"
            f"⏳ Куратордың растауын күтеді",
            reply_markup=kb.main,
            parse_mode='HTML'
        )
    except api.APIError as e:
        await message.answer(f'❌ Қате: {e.message}', reply_markup=kb.main)
    await state.clear()


@router.message(AchievementStates.waiting_for_photo, F.photo)
async def photo_received(message: Message, state: FSMContext, bot: Bot):
    data = await state.get_data()

    # 1. Создаём достижение
    try:
        result = await api.create_achievement(
            telegram_id=message.from_user.id,
            title=data['title'],
            description=data['description'],
            category=data['category'],
            event_date=data.get('event_date')
        )
        achievement_id = result['achievement']['id']
    except api.APIError as e:
        await message.answer(f'❌ Қате: {e.message}', reply_markup=kb.main)
        await state.clear()
        return

    # 2. Скачиваем фото из Telegram и заливаем на сайт
    try:
        await message.answer('⏳ Фото жүктелуде...')
        photo = message.photo[-1]
        file = await bot.get_file(photo.file_id)
        photo_buffer = BytesIO()
        await bot.download_file(file.file_path, photo_buffer)
        photo_buffer.seek(0)

        await api.upload_file(
            achievement_id=achievement_id,
            telegram_id=message.from_user.id,
            file_bytes=photo_buffer.read(),
            filename=f'photo_{achievement_id}.jpg',
            content_type='image/jpeg'
        )

        await message.answer(
            f"✅ <b>Жетістік сәтті қосылды!</b>\n\n"
            f"🏆 {data['title']}\n"
            f"📅 {data.get('event_date')}\n"
            f"📸 Фото жүктелді\n"
            f"🆔 ID: {achievement_id}\n\n"
            f"⏳ Куратордың растауын күтеді",
            reply_markup=kb.main,
            parse_mode='HTML'
        )
    except Exception as e:
        logger.exception('Ошибка загрузки фото')
        await message.answer(
            f'⚠️ Жетістік сақталды, бірақ фотоны жүктеу қатесі: {e}\n🆔 ID: {achievement_id}',
            reply_markup=kb.main
        )
    finally:
        await state.clear()


@router.message(AchievementStates.waiting_for_photo)
async def wrong_photo(message: Message):
    await message.answer('Фото жіберіңіз немесе "⏩ Өткізіп жіберу" батырмасын басыңыз.')


# ───────────────────────────────────────────
# 📰 Лента
# ───────────────────────────────────────────
@router.message(F.text == '📰 Лента')
async def show_feed(message: Message):
    try:
        result = await api.get_feed(limit=10)
        achievements = result.get('achievements', [])
    except api.APIError as e:
        await message.answer(f'❌ {e.message}')
        return

    if not achievements:
        await message.answer('Әзірше расталған жетістіктер жоқ.')
        return

    await message.answer(f'📰 <b>Соңғы жетістіктер ({len(achievements)})</b>', parse_mode='HTML')

    for a in achievements:
        text = (
            f"🏆 <b>{a['title']}</b>\n\n"
            f"👤 {a['author_name']}"
            + (f" • {a['author_group']}" if a.get('author_group') else '') + "\n"
            f"📂 {a['category']}\n"
        )
        if a.get('description'):
            text += f"\n{a['description'][:300]}\n"
        if a.get('event_date'):
            try:
                d = datetime.fromisoformat(a['event_date'].replace('Z', '+00:00'))
                text += f"\n📅 {d.strftime('%d.%m.%Y')}"
            except Exception:
                pass

        await message.answer(text, parse_mode='HTML')


# ───────────────────────────────────────────
# 📊 Менің жетістіктерім
# ───────────────────────────────────────────
@router.message(F.text == '📊 Менің жетістіктерім')
async def my_achievements(message: Message):
    try:
        user = await api.get_user_by_telegram(message.from_user.id)
    except api.APIError as e:
        await message.answer(f'❌ {e.message}')
        return

    if not user:
        await message.answer('Алдымен аккаунтты байланыстырыңыз: /link КОД')
        return

    try:
        result = await api.get_my_achievements(message.from_user.id)
        achievements = result.get('achievements', [])
    except api.APIError as e:
        await message.answer(f'❌ {e.message}')
        return

    if not achievements:
        await message.answer('Сізде жетістіктер жоқ. Бірінші жетістігіңізді қосыңыз!')
        return

    status_emoji = {'pending': '⏳', 'approved': '✅', 'rejected': '❌'}
    status_text = {'pending': 'Модерацияда', 'approved': 'Бекітілген', 'rejected': 'Бас тартылған'}

    await message.answer(f'📊 <b>Сіздің жетістіктеріңіз: {len(achievements)}</b>', parse_mode='HTML')

    for a in achievements:
        emoji = status_emoji.get(a['status'], '❓')
        st = status_text.get(a['status'], a['status'])
        text = (
            f"{emoji} <b>{a['title']}</b>\n"
            f"📂 {a['category']}\n"
            f"📌 Күй: {st}\n"
        )
        if a.get('moderator_comment'):
            text += f"💬 Куратор: {a['moderator_comment']}\n"
        await message.answer(text, parse_mode='HTML')