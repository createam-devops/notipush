package db

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/notipush/notipush/internal/models"
)

type TopicRepo struct {
	pool *pgxpool.Pool
}

func NewTopicRepo(pool *pgxpool.Pool) *TopicRepo {
	return &TopicRepo{pool: pool}
}

func (r *TopicRepo) Create(ctx context.Context, t *models.Topic) error {
	return r.pool.QueryRow(ctx, `
		INSERT INTO topics (app_id, name, description)
		VALUES ($1, $2, $3)
		RETURNING id, created_at`,
		t.AppID, t.Name, t.Description,
	).Scan(&t.ID, &t.CreatedAt)
}

func (r *TopicRepo) ListByApp(ctx context.Context, appID uuid.UUID) ([]models.Topic, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, app_id, name, description, created_at
		FROM topics WHERE app_id = $1 ORDER BY name`, appID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var topics []models.Topic
	for rows.Next() {
		var t models.Topic
		if err := rows.Scan(&t.ID, &t.AppID, &t.Name, &t.Description, &t.CreatedAt); err != nil {
			return nil, err
		}
		topics = append(topics, t)
	}
	return topics, nil
}

func (r *TopicRepo) GetByName(ctx context.Context, appID uuid.UUID, name string) (*models.Topic, error) {
	t := &models.Topic{}
	err := r.pool.QueryRow(ctx, `
		SELECT id, app_id, name, description, created_at
		FROM topics WHERE app_id = $1 AND name = $2`, appID, name,
	).Scan(&t.ID, &t.AppID, &t.Name, &t.Description, &t.CreatedAt)
	if err != nil {
		return nil, err
	}
	return t, nil
}

func (r *TopicRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM topics WHERE id = $1`, id)
	return err
}
