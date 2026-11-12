CREATE TABLE IF NOT EXISTS chat_conversations (
  id UUID PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES chat_conversations(id) ON DELETE CASCADE,
  role VARCHAR(20) NOT NULL,
  target_name VARCHAR(120),
  prompt TEXT,
  content TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'COMPLETED',
  task_id UUID,
  file_id UUID,
  scraped_items TEXT,
  is_schedule BOOLEAN NOT NULL DEFAULT FALSE,
  schedule_details TEXT,
  seq INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_conv_updated ON chat_conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_msg_conv_seq ON chat_messages(conversation_id, created_at ASC, seq ASC);

INSERT INTO chat_conversations (id, title, created_at, updated_at)
SELECT t.id, LEFT(t.prompt, 120), t.created_at, t.updated_at
FROM agent_tasks t
WHERE NOT EXISTS (SELECT 1 FROM chat_conversations c WHERE c.id = t.id);

INSERT INTO chat_messages (id, conversation_id, role, target_name, prompt, content, status, task_id, scraped_items, seq, created_at)
SELECT
  gen_random_uuid(),
  t.id,
  'user',
  wc.name,
  t.prompt,
  NULL,
  'COMPLETED',
  t.id,
  NULL,
  1,
  t.created_at
FROM agent_tasks t
LEFT JOIN website_connections wc ON wc.id = t.connection_id
WHERE NOT EXISTS (
  SELECT 1 FROM chat_messages m WHERE m.conversation_id = t.id AND m.role = 'user' AND m.seq = 1
);

INSERT INTO chat_messages (id, conversation_id, role, target_name, prompt, content, status, task_id, file_id, scraped_items, seq, created_at)
SELECT
  gen_random_uuid(),
  t.id,
  'assistant',
  wc.name,
  NULL,
  COALESCE(t.result, 'Execution completed.'),
  CASE WHEN t.status = 'FAILED' THEN 'FAILED' ELSE 'COMPLETED' END,
  t.id,
  (SELECT f.id FROM generated_files f WHERE f.task_id = t.id ORDER BY f.created_at DESC LIMIT 1),
  t.extracted_items,
  2,
  t.created_at + INTERVAL '1 millisecond'
FROM agent_tasks t
LEFT JOIN website_connections wc ON wc.id = t.connection_id
WHERE NOT EXISTS (
  SELECT 1 FROM chat_messages m WHERE m.conversation_id = t.id AND m.role = 'assistant' AND m.seq = 2
);
