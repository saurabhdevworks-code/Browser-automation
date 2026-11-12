-- Strict per-user multi-tenant isolation across all entities, files, schedules, Chrome profiles, and AI configs.

ALTER TABLE website_connections ADD COLUMN IF NOT EXISTS user_id UUID;
CREATE INDEX IF NOT EXISTS idx_website_connections_user ON website_connections(user_id);

ALTER TABLE agent_tasks ADD COLUMN IF NOT EXISTS user_id UUID;
CREATE INDEX IF NOT EXISTS idx_agent_tasks_user ON agent_tasks(user_id);

ALTER TABLE generated_files ADD COLUMN IF NOT EXISTS user_id UUID;
CREATE INDEX IF NOT EXISTS idx_generated_files_user ON generated_files(user_id, created_at DESC);

ALTER TABLE approval_requests ADD COLUMN IF NOT EXISTS user_id UUID;
CREATE INDEX IF NOT EXISTS idx_approval_requests_user ON approval_requests(user_id, requested_at DESC);

ALTER TABLE chat_conversations ADD COLUMN IF NOT EXISTS user_id UUID;
CREATE INDEX IF NOT EXISTS idx_chat_conversations_user ON chat_conversations(user_id, updated_at DESC);

ALTER TABLE personal_files ADD COLUMN IF NOT EXISTS user_id UUID;
CREATE INDEX IF NOT EXISTS idx_personal_files_user ON personal_files(user_id, created_at DESC);

ALTER TABLE scheduled_jobs ADD COLUMN IF NOT EXISTS user_id UUID;
CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_user ON scheduled_jobs(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS user_ai_configs (
  user_id UUID PRIMARY KEY REFERENCES app_users(id) ON DELETE CASCADE,
  provider VARCHAR(32) NOT NULL DEFAULT 'gemini',
  encrypted_api_key TEXT NOT NULL,
  model VARCHAR(120) NOT NULL DEFAULT '',
  last_error VARCHAR(255),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Claim legacy single-workspace data ONLY when there is strictly 1 user registered on this database.
-- If 2 or more users exist, legacy unowned rows stay NULL and are never exposed to any user.
DO $$
DECLARE
  user_cnt INT;
  sole_user UUID;
BEGIN
  SELECT COUNT(*) INTO user_cnt FROM app_users;
  IF user_cnt = 1 THEN
    SELECT id INTO sole_user FROM app_users LIMIT 1;
    UPDATE website_connections SET user_id = sole_user WHERE user_id IS NULL;
    UPDATE agent_tasks SET user_id = sole_user WHERE user_id IS NULL;
    UPDATE generated_files SET user_id = sole_user WHERE user_id IS NULL;
    UPDATE approval_requests SET user_id = sole_user WHERE user_id IS NULL;
    UPDATE chat_conversations SET user_id = sole_user WHERE user_id IS NULL;
    UPDATE personal_files SET user_id = sole_user WHERE user_id IS NULL;
    UPDATE scheduled_jobs SET user_id = sole_user WHERE user_id IS NULL;

    INSERT INTO personal_profiles (id, enabled, full_name, email, phone, location, custom_text, updated_at)
    SELECT sole_user::TEXT, enabled, full_name, email, phone, location, custom_text, updated_at
    FROM personal_profiles
    WHERE id = 'default'
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;
