package db

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/notipush/notipush/internal/models"
)

type SubscriptionRepo struct {
	pool *pgxpool.Pool
}

func NewSubscriptionRepo(pool *pgxpool.Pool) *SubscriptionRepo {
	return &SubscriptionRepo{pool: pool}
}

func (r *SubscriptionRepo) Upsert(ctx context.Context, s *models.Subscription) error {
	return r.pool.QueryRow(ctx, `
		INSERT INTO subscriptions (app_id, user_external_id, endpoint, p256dh, auth)
		VALUES ($1, $2, $3, $4, $5)
		ON CONFLICT (endpoint) DO UPDATE SET
			p256dh = EXCLUDED.p256dh,
			auth = EXCLUDED.auth,
			user_external_id = EXCLUDED.user_external_id,
			is_active = true,
			updated_at = now()
		RETURNING id, created_at, updated_at, is_active`,
		s.AppID, s.UserExternalID, s.Endpoint, s.P256DH, s.Auth,
	).Scan(&s.ID, &s.CreatedAt, &s.UpdatedAt, &s.IsActive)
}

func (r *SubscriptionRepo) AddTopics(ctx context.Context, subscriptionID uuid.UUID, topicIDs []uuid.UUID) error {
	for _, tid := range topicIDs {
		_, err := r.pool.Exec(ctx, `
			INSERT INTO subscription_topics (subscription_id, topic_id)
			VALUES ($1, $2)
			ON CONFLICT DO NOTHING`, subscriptionID, tid)
		if err != nil {
			return err
		}
	}
	return nil
}

func (r *SubscriptionRepo) ListByApp(ctx context.Context, appID uuid.UUID) ([]models.Subscription, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, app_id, user_external_id, endpoint, p256dh, auth, is_active, created_at, updated_at
		FROM subscriptions WHERE app_id = $1 AND is_active = true`, appID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var subs []models.Subscription
	for rows.Next() {
		var s models.Subscription
		if err := rows.Scan(&s.ID, &s.AppID, &s.UserExternalID, &s.Endpoint, &s.P256DH, &s.Auth,
			&s.IsActive, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		subs = append(subs, s)
	}
	return subs, nil
}

func (r *SubscriptionRepo) ListByTopic(ctx context.Context, topicID uuid.UUID) ([]models.Subscription, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT s.id, s.app_id, s.user_external_id, s.endpoint, s.p256dh, s.auth, s.is_active, s.created_at, s.updated_at
		FROM subscriptions s
		JOIN subscription_topics st ON st.subscription_id = s.id
		WHERE st.topic_id = $1 AND s.is_active = true`, topicID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var subs []models.Subscription
	for rows.Next() {
		var s models.Subscription
		if err := rows.Scan(&s.ID, &s.AppID, &s.UserExternalID, &s.Endpoint, &s.P256DH, &s.Auth,
			&s.IsActive, &s.CreatedAt, &s.UpdatedAt); err != nil {
			return nil, err
		}
		subs = append(subs, s)
	}
	return subs, nil
}

func (r *SubscriptionRepo) Deactivate(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `UPDATE subscriptions SET is_active = false WHERE id = $1`, id)
	return err
}

func (r *SubscriptionRepo) DeactivateByEndpoint(ctx context.Context, endpoint string) error {
	_, err := r.pool.Exec(ctx, `UPDATE subscriptions SET is_active = false WHERE endpoint = $1`, endpoint)
	return err
}
