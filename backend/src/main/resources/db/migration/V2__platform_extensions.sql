CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY,
  task_id UUID REFERENCES agent_tasks(id) ON DELETE CASCADE,
  platform VARCHAR(64) NOT NULL,
  action_description VARCHAR(1000) NOT NULL,
  risk_level VARCHAR(32) NOT NULL,
  approval_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  payload TEXT,
  consequences VARCHAR(500),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS generated_files (
  id UUID PRIMARY KEY,
  task_id UUID REFERENCES agent_tasks(id) ON DELETE SET NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(32) NOT NULL,
  row_count INT NOT NULL DEFAULT 0,
  content_preview TEXT,
  download_url VARCHAR(1024),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approvals_status ON approval_requests(approval_status);
CREATE INDEX IF NOT EXISTS idx_files_created ON generated_files(created_at DESC);
