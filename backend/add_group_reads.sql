-- Топтық чаттарда "кто прочитал" отслеживание
CREATE TABLE IF NOT EXISTS group_last_reads (
  group_name TEXT NOT NULL,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_message_id INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (group_name, user_id)
);
