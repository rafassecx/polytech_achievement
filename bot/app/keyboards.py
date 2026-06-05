from aiogram.types import ReplyKeyboardMarkup, KeyboardButton
from aiogram.utils.keyboard import InlineKeyboardBuilder


main = ReplyKeyboardMarkup(
    keyboard=[
        [KeyboardButton(text='🏆 Жетістік қосу')],
        [KeyboardButton(text='📰 Лента'), KeyboardButton(text='📊 Менің жетістіктерім')],
        [KeyboardButton(text='👤 Профиль')],
    ],
    resize_keyboard=True
)


not_linked = ReplyKeyboardMarkup(
    keyboard=[
        [KeyboardButton(text='🔗 Аккаунтты байланыстыру')],
        [KeyboardButton(text='ℹ️ Көмек')],
    ],
    resize_keyboard=True
)


cancel = ReplyKeyboardMarkup(
    keyboard=[[KeyboardButton(text='❌ Аяқтау')]],
    resize_keyboard=True
)


skip_or_cancel = ReplyKeyboardMarkup(
    keyboard=[
        [KeyboardButton(text='⏩ Өткізіп жіберу')],
        [KeyboardButton(text='❌ Аяқтау')],
    ],
    resize_keyboard=True
)


def categories_inline():
    """Категории те же, что на сайте"""
    categories = [
        ('📚 Оқу', 'academic'),
        ('⚽ Спорт', 'sport'),
        ('🎭 Мәдениет', 'cultural'),
        ('🤝 Қоғамдық', 'social'),
        ('✨ Басқа', 'other'),
    ]
    builder = InlineKeyboardBuilder()
    for label, value in categories:
        builder.button(text=label, callback_data=f'cat_{value}')
    builder.adjust(2)
    return builder.as_markup()