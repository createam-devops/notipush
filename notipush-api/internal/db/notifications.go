package db

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/notipush/notipush/internal/models"
)

type NotificationRepo struct {
	pool *pgxpool.Pool
}

func NewNotificationRepo(pool *pgxpool.Pool) *NotificationRepo {
	return &NotificationRepo{pool: pool}
}

func (r *NotificationRepo) Create(ctx context.Context, n *models.Notification) error {
	return r.pool.QueryRow(ctx, `
		INSERT INTO notifications (project_id, app_id, topic_id, title, body, icon, url, data_json, priority, ttl, total_recipients)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, status, created_at`,
		n.ProjectID, n.AppID, n.TopicID, n.Title, n.Body, n.Icon, n.URL, n.DataJSON, n.Priority, n.TTL, n.TotalRecipients,
	).Scan(&n.ID, &n.Status, &n.CreatedAt)
}

func (r *NotificationRepo) UpdateStatus(ctx context.Context, id uuid.UUID, status string, sent, failed int) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE notifications SET status = $2, sent_count = $3, failed_count = $4 WHERE id = $1`,
		id, status, sent, failed)
	return err
}

func (r *NotificationRepo) GetByID(ctx context.Context, id uuid.UUID) (*models.Notification, error) {
	n := &models.Notification{}
	err := r.pool.QueryRow(ctx, `
		SELECT id, project_id, app_id, topic_id, title, body, icon, url, data_json,
		       priority, ttl, total_recipients, sent_count, failed_count, status, created_at
		FROM notifications WHERE id = $1`, id,
	).Scan(&n.ID, &n.ProjectID, &n.AppID, &n.TopicID, &n.Title, &n.Body, &n.Icon, &n.URL, &n.DataJSON,
		&n.Priority, &n.TTL, &n.TotalRecipients, &n.SentCount, &n.FailedCount, &n.Status, &n.CreatedAt)
	if err != nil {
		return nil, err
	}
	return n, nil
}

func (r *NotificationRepo) ListByProject(ctx context.Context, projectID uuid.UUID, limit int) ([]models.Notification, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, project_id, app_id, topic_id, title, body, icon, url,
		       priority, ttl, total_recipients, sent_count, failed_count, status, created_at
		FROM notifications WHERE project_id = $1 ORDER BY created_at DESC LIMIT $2`, projectID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var notifs []models.Notification
	for rows.Next() {
		var n models.Notification
		if err := rows.Scan(&n.ID, &n.ProjectID, &n.AppID, &n.TopicID, &n.Title, &n.Body, &n.Icon, &n.URL,
			&n.Priority, &n.TTL, &n.TotalRecipients, &n.SentCount, &n.FailedCount, &n.Status, &n.CreatedAt); err != nil {
			return nil, err
		}
		notifs = append(notifs, n)
	}
	return notifs, nil
}

func (r *NotificationRepo) CreateLog(ctx context.Context, log *models.NotificationLog) error {
	return r.pool.QueryRow(ctx, `
		INSERT INTO notification_logs (notification_id, subscription_id, status)
		VALUES ($1, $2, $3)
		RETURNING id`,
		log.NotificationID, log.SubscriptionID, log.Status,
	).Scan(&log.ID)
}

func (r *NotificationRepo) UpdateLog(ctx context.Context, id uuid.UUID, status string, errMsg *string) error {
	now := time.Now()
	_, err := r.pool.Exec(ctx, `
		UPDATE notification_logs SET status = $2, error = $3, attempts = attempts + 1, sent_at = $4
		WHERE id = $1`, id, status, errMsg, now)
	return err
}

func (r *NotificationRepo) IncrementSentCount(ctx context.Context, notifID uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE notifications SET sent_count = sent_count + 1 WHERE id = $1`, notifID)
	return err
}

func (r *NotificationRepo) IncrementFailedCount(ctx context.Context, notifID uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE notifications SET failed_count = failed_count + 1 WHERE id = $1`, notifID)
	return err
}
