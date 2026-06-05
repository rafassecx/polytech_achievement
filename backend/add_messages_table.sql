-- Тек messages кестесін жасайды (егер жоқ болса)
-- Бар деректерді жоймайды!

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

CREATE INDEX IF NOT EXISTS idx_messages_sender   ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_receiver ON messages(receiver_id);
CREATE INDEX IF NOT EXISTS idx_messages_group    ON messages(group_name);
