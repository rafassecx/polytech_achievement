-- Достар (друзья)
CREATE TABLE IF NOT EXISTS friendships (
  id SERIAL PRIMARY KEY,
  requester_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, accepted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);

-- Таңдаулылар (закладки)
CREATE TABLE IF NOT EXISTS bookmarks (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id INT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Telegram reply контексті: DM хабарлама жіберілгенде сақталады
CREATE TABLE IF NOT EXISTS tg_reply_context (
  id SERIAL PRIMARY KEY,
  tg_message_id BIGINT NOT NULL,
  tg_chat_id BIGINT NOT NULL,
  app_sender_id INT REFERENCES users(id) ON DELETE CASCADE,
  app_receiver_id INT REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Активті DM серіктесі: соңғы хабарлама кімнен келгенін сақтайды
CREATE TABLE IF NOT EXISTS tg_active_dm (
  telegram_id BIGINT PRIMARY KEY,
  app_user_id INT REFERENCES users(id) ON DELETE CASCADE,
  partner_name TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Топ ауыстыру сұраулары
CREATE TABLE IF NOT EXISTS group_change_requests (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_group TEXT,
  requested_group TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  moderator_comment TEXT,
  reviewed_by INT REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
