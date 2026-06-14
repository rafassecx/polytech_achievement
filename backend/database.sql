DROP TABLE IF EXISTS messages      CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS comments      CASCADE;
DROP TABLE IF EXISTS likes         CASCADE;
DROP TABLE IF EXISTS files         CASCADE;
DROP TABLE IF EXISTS achievements  CASCADE;
DROP TABLE IF EXISTS groups        CASCADE;
DROP TABLE IF EXISTS users         CASCADE;

CREATE TABLE users (
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

CREATE TABLE groups (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(100) NOT NULL UNIQUE,   -- 'P22-2B', 'IS-23-1' т.б.
  curator_id  INT REFERENCES users(id) ON DELETE SET NULL,
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE achievements (
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

CREATE TABLE files (
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

CREATE TABLE likes (
  id             SERIAL PRIMARY KEY,
  achievement_id INT NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  user_id        INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(achievement_id, user_id)
);

CREATE TABLE comments (
  id             SERIAL PRIMARY KEY,
  achievement_id INT  NOT NULL REFERENCES achievements(id) ON DELETE CASCADE,
  user_id        INT  NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content        TEXT NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INT          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(50)  NOT NULL,   -- 'achievement_approved', 'comment', 'like', 'new_pending'
  title      VARCHAR(255) NOT NULL,
  message    TEXT         NOT NULL,
  related_id INT,                     -- achievement_id (сілтеме)
  is_read    BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE messages (
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

CREATE INDEX idx_achievements_user      ON achievements(user_id);
CREATE INDEX idx_achievements_status    ON achievements(status);
CREATE INDEX idx_achievements_category  ON achievements(category);
CREATE INDEX idx_files_achievement      ON files(achievement_id);
CREATE INDEX idx_likes_achievement      ON likes(achievement_id);
CREATE INDEX idx_comments_achievement   ON comments(achievement_id);
CREATE INDEX idx_notifications_user     ON notifications(user_id, is_read);
CREATE INDEX idx_messages_sender        ON messages(sender_id);
CREATE INDEX idx_messages_receiver      ON messages(receiver_id);
CREATE INDEX idx_messages_group         ON messages(group_name);
CREATE INDEX idx_users_group            ON users(group_name);
CREATE INDEX idx_users_telegram         ON users(telegram_id);

-- ДЕМО: Админ аккаунт
-- Пароль: admin123  (bcrypt хэш)

INSERT INTO users (email, password_hash, full_name, role)
VALUES (
  'admin@apc.kz',
  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.',
  'Жүйе Әкімшісі',
  'admin'
);
