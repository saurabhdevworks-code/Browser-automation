CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(160) NOT NULL,
  password_hash VARCHAR(255),
  auth_provider VARCHAR(32) NOT NULL DEFAULT 'email',
  google_sub VARCHAR(255) UNIQUE,
  avatar_url VARCHAR(2048),
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users (LOWER(email));
CREATE INDEX IF NOT EXISTS idx_app_users_google_sub ON app_users (google_sub);

CREATE TABLE IF NOT EXISTS oauth_provider_configs (
  provider VARCHAR(32) PRIMARY KEY,
  client_id VARCHAR(512) NOT NULL,
  client_secret_enc TEXT NOT NULL,
  redirect_uri VARCHAR(1024),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
