ALTER TABLE generated_files ALTER COLUMN download_url TYPE TEXT;
ALTER TABLE agent_tasks ADD COLUMN IF NOT EXISTS extracted_items TEXT;
