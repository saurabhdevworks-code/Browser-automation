CREATE TABLE website_connections (
 id UUID PRIMARY KEY,
 name VARCHAR(160) NOT NULL,
 website_url VARCHAR(2048) NOT NULL,
 status VARCHAR(32) NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE agent_tasks (
 id UUID PRIMARY KEY,
 connection_id UUID REFERENCES website_connections(id),
 prompt VARCHAR(2000) NOT NULL,
 status VARCHAR(32) NOT NULL,
 result TEXT,
 error_message TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE agent_actions (
 id UUID PRIMARY KEY,
 task_id UUID NOT NULL REFERENCES agent_tasks(id) ON DELETE CASCADE,
 action_type VARCHAR(80) NOT NULL,
 description VARCHAR(1000) NOT NULL,
 status VARCHAR(32) NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_tasks_created ON agent_tasks(created_at DESC);
CREATE INDEX idx_actions_task ON agent_actions(task_id, created_at);
