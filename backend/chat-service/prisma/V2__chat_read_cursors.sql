CREATE TABLE IF NOT EXISTS chat_read_cursors (
    conversation_id VARCHAR(36) NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
    user_id VARCHAR(36) NOT NULL,
    last_read_seq INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_read_cursors_user ON chat_read_cursors(user_id);
