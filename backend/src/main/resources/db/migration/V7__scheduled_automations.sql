CREATE TABLE IF NOT EXISTS scheduled_jobs (
  id UUID PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  connection_id UUID NOT NULL REFERENCES website_connections(id) ON DELETE CASCADE,
  requirements TEXT NOT NULL,
  preferred_location VARCHAR(255),
  schedule_time VARCHAR(10) NOT NULL,
  timezone VARCHAR(64) NOT NULL DEFAULT 'Asia/Kolkata',
  auto_apply BOOLEAN NOT NULL DEFAULT TRUE,
  max_apply_per_run INT NOT NULL DEFAULT 5,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  last_run_date VARCHAR(16),
  last_run_at TIMESTAMPTZ,
  last_status VARCHAR(32) NOT NULL DEFAULT 'IDLE',
  last_summary TEXT,
  last_matched_count INT NOT NULL DEFAULT 0,
  last_applied_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scheduled_job_runs (
  id UUID PRIMARY KEY,
  scheduled_job_id UUID NOT NULL REFERENCES scheduled_jobs(id) ON DELETE CASCADE,
  task_id UUID REFERENCES agent_tasks(id) ON DELETE SET NULL,
  status VARCHAR(32) NOT NULL,
  matched_count INT NOT NULL DEFAULT 0,
  applied_count INT NOT NULL DEFAULT 0,
  summary TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  finished_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_scheduled_jobs_enabled ON scheduled_jobs(enabled, schedule_time);
CREATE INDEX IF NOT EXISTS idx_scheduled_job_runs_job ON scheduled_job_runs(scheduled_job_id, started_at DESC);
