package db

import (
	"context"
	"crypto/sha256"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/notipush/notipush/internal/models"
)

type ProjectRepo struct {
	pool *pgxpool.Pool
}

func NewProjectRepo(pool *pgxpool.Pool) *ProjectRepo {
	return &ProjectRepo{pool: pool}
}

func (r *ProjectRepo) Create(ctx context.Context, p *models.Project, rawAPIKey string) error {
	hash := sha256.Sum256([]byte(rawAPIKey))
	p.APIKeyHash = fmt.Sprintf("%x", hash)
	p.APIKeyPrefix = rawAPIKey[:8]

	return r.pool.QueryRow(ctx, `
		INSERT INTO projects (name, api_key_hash, api_key_prefix, vapid_public_key, vapid_private_key, monthly_quota, webhook_url)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, created_at, updated_at, is_active`,
		p.Name, p.APIKeyHash, p.APIKeyPrefix, p.VAPIDPublicKey, p.VAPIDPrivateKey, p.MonthlyQuota, p.WebhookURL,
	).Scan(&p.ID, &p.CreatedAt, &p.UpdatedAt, &p.IsActive)
}

func (r *ProjectRepo) GetByAPIKeyHash(ctx context.Context, rawAPIKey string) (*models.Project, error) {
	hash := sha256.Sum256([]byte(rawAPIKey))
	hashStr := fmt.Sprintf("%x", hash)

	p := &models.Project{}
	err := r.pool.QueryRow(ctx, `
		SELECT id, name, api_key_hash, api_key_prefix, vapid_public_key, vapid_private_key,
		       monthly_quota, notifications_sent, webhook_url, is_active, created_at, updated_at
		FROM projects
		WHERE api_key_hash = $1 AND is_active = true`, hashStr,
	).Scan(&p.ID, &p.Name, &p.APIKeyHash, &p.APIKeyPrefix, &p.VAPIDPublicKey, &p.VAPIDPrivateKey,
		&p.MonthlyQuota, &p.NotificationsSent, &p.WebhookURL, &p.IsActive, &p.CreatedAt, &p.UpdatedAt)

	if err != nil {
		return nil, err
	}
	return p, nil
}

func (r *ProjectRepo) GetByID(ctx context.Context, id uuid.UUID) (*models.Project, error) {
	p := &models.Project{}
	err := r.pool.QueryRow(ctx, `
		SELECT id, name, api_key_hash, api_key_prefix, vapid_public_key, vapid_private_key,
		       monthly_quota, notifications_sent, webhook_url, is_active, created_at, updated_at
		FROM projects
		WHERE id = $1`, id,
	).Scan(&p.ID, &p.Name, &p.APIKeyHash, &p.APIKeyPrefix, &p.VAPIDPublicKey, &p.VAPIDPrivateKey,
		&p.MonthlyQuota, &p.NotificationsSent, &p.WebhookURL, &p.IsActive, &p.CreatedAt, &p.UpdatedAt)

	if err != nil {
		return nil, err
	}
	return p, nil
}

func (r *ProjectRepo) List(ctx context.Context) ([]models.Project, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, name, api_key_prefix, vapid_public_key, monthly_quota, notifications_sent,
		       webhook_url, is_active, created_at, updated_at
		FROM projects ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var projects []models.Project
	for rows.Next() {
		var p models.Project
		if err := rows.Scan(&p.ID, &p.Name, &p.APIKeyPrefix, &p.VAPIDPublicKey, &p.MonthlyQuota,
			&p.NotificationsSent, &p.WebhookURL, &p.IsActive, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		projects = append(projects, p)
	}
	return projects, nil
}

func (r *ProjectRepo) IncrementSentCount(ctx context.Context, id uuid.UUID, count int) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE projects SET notifications_sent = notifications_sent + $2 WHERE id = $1`, id, count)
	return err
}
