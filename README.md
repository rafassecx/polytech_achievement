# APC-POLYTECH — Студенттердің жетістіктерін басқару жүйесі

> Студенттердің академиялық, спорттық және шығармашылық жетістіктерін тіркеу, модерация жасау және рейтинг құру үшін арналған веб-жүйе.

---

## Мүмкіндіктері

- Жетістіктерді қосу, өңдеу және жою (фото, видео, құжатпен)
- Куратор модерациясы — бекіту / бас тарту
- Студент рейтингі және топ бойынша сүзгі
- Жеке профиль, аватар, Bio
- Достық жүйесі және жеке хабарламалар
- Хабарландырулар жүйесі
- Telegram бот арқылы жетістік жіберу
- Telegram аккаунтты байланыстыру
- Әкімші панелі — пайдаланушыларды басқару, рөл өзгерту
- Қазақ / Орыс тіліне ауысу
- Жарық / Қараңғы тема
- iOS Glassmorphism стиліндегі дизайн

---

## Технологиялар

| Бөлім | Технология |
|-------|-----------|
| Frontend | React (Vite), Tailwind CSS, Framer Motion, react-i18next |
| Backend | Node.js, Express.js, JWT, Multer, bcrypt |
| Database | PostgreSQL |
| Telegram Bot | Python, pyTelegramBotAPI |
| Хостинг | Render |

---

## Орнату

### Талаптар
- Node.js 18+
- Python 3.10+
- PostgreSQL 14+

### 1. Репозиторийді клондау

```bash
git clone https://github.com/rafassecx/polytech_achievement.git
cd polytech_achievement
```

### 2. Backend баптау

```bash
cd backend
npm install
```

`backend/.env` файлын жасаңыз:

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
PORT=5000
NODE_ENV=development
```

### 3. Frontend баптау

```bash
cd frontend
npm install
```

`frontend/.env` файлын жасаңыз:

```env
VITE_API_URL=http://localhost:5000/api
```

### 4. Telegram Bot баптау

```bash
cd bot
pip install -r requirements.txt
```

`bot/.env` файлын жасаңыз:

```env
BOT_TOKEN=your_telegram_bot_token
API_URL=http://localhost:5000/api
```

### 5. Деректер базасын инициализация

```bash
psql -U postgres -d your_db -f backend/database.sql
```

### 6. Жүйені іске қосу

```bash
# Backend
cd backend && npm start

# Frontend (жеке терминалда)
cd frontend && npm run dev

# Bot (жеке терминалда)
cd bot && python main.py
```

---

## Рөлдер

| Рөл | Мүмкіндіктер |
|-----|-------------|
| `student` | Жетістік қосу, профиль, чат, достар |
| `curator` | Модерация, топ басқару |
| `admin` | Барлық мүмкіндіктер + пайдаланушыларды басқару |

---

## Авторлар

- **Рафасс Е.** — Frontend, Backend API, Database
- **[Напарниг аты-жөні]** — Telegram Bot интеграциясы

**Almaty Polytechnic College, 2026**

---

---

# APC-POLYTECH — Система управления достижениями студентов

> Веб-система для регистрации, модерации и рейтинга академических, спортивных и творческих достижений студентов.

---

## Возможности

- Добавление, редактирование и удаление достижений (с фото, видео, документами)
- Модерация куратором — одобрение / отклонение
- Рейтинг студентов с фильтрацией по группам
- Личный профиль, аватар, Bio
- Система дружбы и личные сообщения
- Система уведомлений
- Отправка достижений через Telegram бот
- Привязка Telegram аккаунта
- Панель администратора — управление пользователями, смена ролей
- Переключение языка Казахский / Русский
- Светлая / Тёмная тема
- Дизайн в стиле iOS Glassmorphism

---

## Технологии

| Часть | Технология |
|-------|-----------|
| Frontend | React (Vite), Tailwind CSS, Framer Motion, react-i18next |
| Backend | Node.js, Express.js, JWT, Multer, bcrypt |
| Database | PostgreSQL |
| Telegram Bot | Python, pyTelegramBotAPI |
| Хостинг | Render |

---

## Установка

### Требования
- Node.js 18+
- Python 3.10+
- PostgreSQL 14+

### 1. Клонирование репозитория

```bash
git clone https://github.com/rafassecx/polytech_achievement.git
cd polytech_achievement
```

### 2. Настройка Backend

```bash
cd backend
npm install
```

Создайте файл `backend/.env`:

```env
DATABASE_URL=postgresql://user:password@host:5432/dbname
JWT_SECRET=your_secret_key
JWT_EXPIRES_IN=7d
PORT=5000
NODE_ENV=development
```

### 3. Настройка Frontend

```bash
cd frontend
npm install
```

Создайте файл `frontend/.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

### 4. Настройка Telegram Bot

```bash
cd bot
pip install -r requirements.txt
```

Создайте файл `bot/.env`:

```env
BOT_TOKEN=your_telegram_bot_token
API_URL=http://localhost:5000/api
```

### 5. Инициализация базы данных

```bash
psql -U postgres -d your_db -f backend/database.sql
```

### 6. Запуск системы

```bash
# Backend
cd backend && npm start

# Frontend (в отдельном терминале)
cd frontend && npm run dev

# Bot (в отдельном терминале)
cd bot && python main.py
```

---

## Роли

| Роль | Возможности |
|------|------------|
| `student` | Добавление достижений, профиль, чат, друзья |
| `curator` | Модерация, управление группами |
| `admin` | Все возможности + управление пользователями |

---

## Авторы

- **Рафасс Е.** — Frontend, Backend API, Database
- **[Имя напарника]** — Интеграция Telegram Bot

**Almaty Polytechnic College, 2026**
