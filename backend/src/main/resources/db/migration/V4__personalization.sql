CREATE TABLE IF NOT EXISTS personal_profiles (
  id VARCHAR(64) PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  full_name VARCHAR(200),
  email VARCHAR(200),
  phone VARCHAR(80),
  location VARCHAR(255),
  custom_text TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS personal_files (
  id UUID PRIMARY KEY,
  file_name VARCHAR(255) NOT NULL,
  content_type VARCHAR(160),
  file_size BIGINT NOT NULL DEFAULT 0,
  storage_path VARCHAR(1024),
  extracted_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_personal_files_created ON personal_files(created_at DESC);
