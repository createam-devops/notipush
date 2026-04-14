-- 001_initial.sql
-- Schema for NotiPush multi-project push notification system
-- All statements are idempotent (safe to re-run on every startup).

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- Migration tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- Projects (multi-tenant, user-facing name: "projects")
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    api_key_hash VARCHAR(64) NOT NULL UNIQUE,
    api_key_prefix VARCHAR(8) NOT NULL,
    vapid_public_key TEXT NOT NULL,
    vapid_private_key TEXT NOT NULL,
    monthly_quota INT NOT NULL DEFAULT 10000,
    notifications_sent INT NOT NULL DEFAULT 0,
    webhook_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_api_key_prefix ON projects(api_key_prefix);

-- ============================================================
-- Applications (per-project, per-platform)
-- ============================================================
CREATE TABLE IF NOT EXISTS applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('web', 'ios', 'android')),
    config_json JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_applications_project ON applications(project_id);

-- ============================================================
-- Topics (segmentation groups within an application)
-- ============================================================
CREATE TABLE IF NOT EXISTS topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(app_id, name)
);

CREATE INDEX IF NOT EXISTS idx_topics_app ON topics(app_id);

-- ============================================================
-- Subscriptions (push endpoints per user)
-- ============================================================
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    app_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    user_external_id VARCHAR(255) NOT NULL,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_app ON subscriptions(app_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(app_id, user_external_id);

-- ============================================================
-- Subscription-Topic relation (many-to-many)
-- ============================================================
CREATE TABLE IF NOT EXISTS subscription_topics (
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    topic_id UUID NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    PRIMARY KEY (subscription_id, topic_id)
);

-- ============================================================
-- Notifications (history of sent campaigns/messages)
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    app_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    topic_id UUID REFERENCES topics(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    icon TEXT,
    url TEXT,
    data_json JSONB,
    priority VARCHAR(10) NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    ttl INT NOT NULL DEFAULT 86400,
    total_recipients INT NOT NULL DEFAULT 0,
    sent_count INT NOT NULL DEFAULT 0,
    failed_count INT NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notifications_project ON notifications(project_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status);

-- ============================================================
-- Notification Logs (per-recipient delivery tracking)
-- ============================================================
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'expired')),
    attempts INT NOT NULL DEFAULT 0,
    error TEXT,
    sent_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_notification ON notification_logs(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON notification_logs(status);

-- ============================================================
-- Function: auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    CREATE TRIGGER trg_projects_updated_at
        BEFORE UPDATE ON projects FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_applications_updated_at
        BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TRIGGER trg_subscriptions_updated_at
        BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Record migration
INSERT INTO schema_migrations (version)
VALUES ('001_initial')
ON CONFLICT (version) DO NOTHING;
