from aiogram.fsm.state import State, StatesGroup


class AchievementStates(StatesGroup):
    waiting_for_title = State()
    waiting_for_category = State()
    waiting_for_description = State()
    waiting_for_date = State()
    waiting_for_photo = State()