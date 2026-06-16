-- Achievly — толық деректер базасы инициализациясы
-- IF NOT EXISTS пайдаланылады, қайта іске қосуға қауіпсіз

CREATE TABLE IF NOT EXISTS users (
  id               SERIAL PRIMARY KEY,
  email            VARCHAR(255) NOT NULL UNIQUE,
  password_hash    VARCHAR(255) NOT NULL,
  full_name        VARCHAR(255) NOT NULL,
  group_name       VARCHAR(100),
  role             VARCHAR(20)  NOT NULL DEFAULT 'student'
                     CHECK (role IN ('student', 'curator', 'admin')),
  avatar_url       VARCHAR(500),
  bio              TEXT,
  telegram_id      BIGINT UNIQUE,
  telegram_username VARCHAR(100),
  is_active        BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS groups (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,
  curator_id  INT REFERENCES users(id) ON DELETE SET NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS achievements (
  id                SERIAL PRIMARY KEY,
  user_id           INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title             VARCHAR(500) NOT NULL,
  description       TEXT,
  category          VARCHAR(100) NOT NULL,
  event_date        DATE,
  status            VARCHAR(20)  NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'approved', 'rejected')),
  source            VARCHAR(20)  NOT NULL DEFAULT 'website'
                      CHECK (source IN ('website', 'telegram')),
  moderator_id      INT REFERENCES users(id) ON DELETE SET NULL,
  moderator_comment TEXT,
  created_at        TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS files (
  id             SERIAL PRIMARY KEY,
  achievement_id INT          NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  file_url       VARCHAR(500) NOT NULL,
  file_type      VARCHAR(20)  NOT NULL DEFAULT 'image'
                   CHECK (file_type IN ('image', 'document', 'video')),
  file_name      VARCHAR(255),
  file_size      INT,
  mime_type      VARCHAR(100),
  uploaded_at    TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS likes (
  id             SERIAL PRIMARY KEY,
  achievement_id INT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  user_id        INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(achievement_id, user_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id             SERIAL PRIMARY KEY,
  achievement_id INT  NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  user_id        INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content        TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(50)  NOT NULL,
  title      VARCHAR(255) NOT NULL,
  message    TEXT         NOT NULL,
  related_id INT,
  is_read    BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
  id          SERIAL PRIMARY KEY,
  sender_id   INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INT  REFERENCES users(id) ON DELETE CASCADE,
  group_name  VARCHAR(100),
  content     TEXT NOT NULL,
  is_read     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT msg_one_target CHECK (
    (receiver_id IS NOT NULL AND group_name IS NULL) OR
    (receiver_id IS NULL     AND group_name IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS group_last_reads (
  group_name      TEXT NOT NULL,
  user_id         INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message_id INT  NOT NULL DEFAULT 0,
  updated_at      TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_name, user_id)
);

CREATE TABLE IF NOT EXISTS friendships (
  id           SERIAL PRIMARY KEY,
  requester_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  addressee_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status       VARCHAR(20) NOT NULL DEFAULT 'pending',
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(requester_id, addressee_id)
);

CREATE TABLE IF NOT EXISTS bookmarks (
  id             SERIAL PRIMARY KEY,
  user_id        INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  achievement_id INT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

CREATE TABLE IF NOT EXISTS tg_active_dm (
  telegram_id  BIGINT PRIMARY KEY,
  app_user_id  INT REFERENCES users(id) ON DELETE CASCADE,
  partner_name TEXT,
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tg_reply_context (
  id              SERIAL PRIMARY KEY,
  tg_message_id   BIGINT NOT NULL,
  tg_chat_id      BIGINT NOT NULL,
  app_sender_id   INT REFERENCES users(id) ON DELETE CASCADE,
  app_receiver_id INT REFERENCES users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS group_change_requests (
  id                SERIAL PRIMARY KEY,
  user_id           INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  current_group     TEXT,
  requested_group   TEXT NOT NULL,
  status            VARCHAR(20) NOT NULL DEFAULT 'pending',
  moderator_comment TEXT,
  reviewed_by       INT REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- Индекстер
CREATE INDEX IF NOT EXISTS idx_achievements_user     ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_status   ON achievements(status);
CREATE INDEX IF NOT EXISTS idx_achievements_category ON achievements(category);
CREATE INDEX IF NOT EXISTS idx_files_achievement     ON files(achievement_id);
CREATE INDEX IF NOT EXISTS idx_likes_achievement     ON likes(achievement_id);
CREATE INDEX IF NOT EXISTS idx_comments_achievement  ON comments(achievement_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user    ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_messages_sender       ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver     ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_group        ON messages(group_name);
CREATE INDEX IF NOT EXISTS idx_users_group           ON users(group_name);
CREATE INDEX IF NOT EXISTS idx_users_telegram        ON users(telegram_id);

-- Демо admin аккаунт (пароль: admin123)
INSERT INTO users (email, password_hash, full_name, role)
VALUES (
  'admin@apc.kz',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
  'Жүйе Әкімшісі',
  'admin'
) ON CONFLICT (email) DO NOTHING;
