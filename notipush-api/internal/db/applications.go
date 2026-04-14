package db

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/notipush/notipush/internal/models"
)

type ApplicationRepo struct {
	pool *pgxpool.Pool
}

func NewApplicationRepo(pool *pgxpool.Pool) *ApplicationRepo {
	return &ApplicationRepo{pool: pool}
}

func (r *ApplicationRepo) Create(ctx context.Context, a *models.Application) error {
	return r.pool.QueryRow(ctx, `
		INSERT INTO applications (project_id, name, platform, config_json)
		VALUES ($1, $2, $3, $4)
		RETURNING id, created_at, updated_at, is_active`,
		a.ProjectID, a.Name, a.Platform, a.ConfigJSON,
	).Scan(&a.ID, &a.CreatedAt, &a.UpdatedAt, &a.IsActive)
}

func (r *ApplicationRepo) GetByID(ctx context.Context, id uuid.UUID) (*models.Application, error) {
	a := &models.Application{}
	err := r.pool.QueryRow(ctx, `
		SELECT id, project_id, name, platform, config_json, is_active, created_at, updated_at
		FROM applications WHERE id = $1`, id,
	).Scan(&a.ID, &a.ProjectID, &a.Name, &a.Platform, &a.ConfigJSON, &a.IsActive, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return a, nil
}

func (r *ApplicationRepo) ListByProject(ctx context.Context, projectID uuid.UUID) ([]models.Application, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, project_id, name, platform, config_json, is_active, created_at, updated_at
		FROM applications WHERE project_id = $1 ORDER BY created_at DESC`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var apps []models.Application
	for rows.Next() {
		var a models.Application
		if err := rows.Scan(&a.ID, &a.ProjectID, &a.Name, &a.Platform, &a.ConfigJSON, &a.IsActive, &a.CreatedAt, &a.UpdatedAt); err != nil {
			return nil, err
		}
		apps = append(apps, a)
	}
	return apps, nil
}

func (r *ApplicationRepo) Delete(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `DELETE FROM applications WHERE id = $1`, id)
	return err
}
