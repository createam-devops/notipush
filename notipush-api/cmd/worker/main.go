package main

import (
	"context"
	"encoding/json"
	"log/slog"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/nats-io/nats.go/jetstream"
	"github.com/notipush/notipush/internal/broker"
	"github.com/notipush/notipush/internal/config"
	"github.com/notipush/notipush/internal/db"
	"github.com/notipush/notipush/internal/models"
	"github.com/notipush/notipush/internal/push"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	slog.SetDefault(logger)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	cfg, err := config.Load()
	if err != nil {
		logger.Error("failed to load config", "error", err)
		os.Exit(1)
	}

	// Database
	pool, err := db.Connect(ctx, cfg.DB.DSN())
	if err != nil {
		logger.Error("failed to connect to database", "error", err)
		os.Exit(1)
	}
	defer pool.Close()

	// Run migrations (idempotent — safe on every restart)
	if err := db.RunMigrations(ctx, pool, "migrations"); err != nil {
		logger.Error("failed to run migrations", "error", err)
		os.Exit(1)
	}

	// NATS
	natsClient, err := broker.New(ctx, cfg.NATS.URL, logger)
	if err != nil {
		logger.Error("failed to connect to NATS", "error", err)
		os.Exit(1)
	}
	defer natsClient.Close()

	// Repos
	subRepo := db.NewSubscriptionRepo(pool)
	notifRepo := db.NewNotificationRepo(pool)
	projectRepo := db.NewProjectRepo(pool)

	// Create consumer
	consumer, err := natsClient.CreateConsumer(ctx)
	if err != nil {
		logger.Error("failed to create NATS consumer", "error", err)
		os.Exit(1)
	}

	logger.Info("worker starting", "concurrency", cfg.Worker.Concurrency)

	// Process messages
	for i := 0; i < cfg.Worker.Concurrency; i++ {
		go func(workerID int) {
			for {
				select {
				case <-ctx.Done():
					return
				default:
				}

				msgs, err := consumer.Fetch(1, jetstream.FetchMaxWait(5*time.Second))
				if err != nil {
					continue
				}

				for msg := range msgs.Messages() {
					processMessage(ctx, logger, msg, subRepo, notifRepo, projectRepo, natsClient, workerID)
				}
			}
		}(i)
	}

	// Graceful shutdown
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh

	logger.Info("shutting down worker...")
	cancel()
	time.Sleep(2 * time.Second) // allow in-flight messages to finish
	logger.Info("worker stopped")
}

func processMessage(
	ctx context.Context,
	logger *slog.Logger,
	msg jetstream.Msg,
	subRepo *db.SubscriptionRepo,
	notifRepo *db.NotificationRepo,
	projectRepo *db.ProjectRepo,
	natsClient *broker.Broker,
	workerID int,
) {
	var notification models.NATSNotificationMessage
	if err := json.Unmarshal(msg.Data(), &notification); err != nil {
		logger.Error("failed to unmarshal message", "error", err, "worker", workerID)
		msg.Term()
		return
	}

	notifID, _ := uuid.Parse(notification.NotificationID)
	appID, _ := uuid.Parse(notification.AppID)
	projectID, _ := uuid.Parse(notification.ProjectID)

	logger.Info("processing notification",
		"notification_id", notification.NotificationID,
		"project_id", notification.ProjectID,
		"worker", workerID,
	)

	// Check TTL
	notif, err := notifRepo.GetByID(ctx, notifID)
	if err != nil {
		logger.Error("notification not found in DB", "id", notifID, "error", err)
		msg.Term()
		return
	}

	if time.Since(notif.CreatedAt) > time.Duration(notification.TTL)*time.Second {
		logger.Warn("notification TTL expired, discarding", "id", notifID)
		_ = notifRepo.UpdateStatus(ctx, notifID, "expired", 0, 0)
		msg.Ack()
		return
	}

	// Fetch subscriptions
	var subs []models.Subscription
	if notification.TopicID != "" {
		topicID, _ := uuid.Parse(notification.TopicID)
		subs, err = subRepo.ListByTopic(ctx, topicID)
	} else {
		subs, err = subRepo.ListByApp(ctx, appID)
	}

	if err != nil {
		logger.Error("failed to fetch subscriptions", "error", err)
		msg.Nak()
		return
	}

	payload := &push.Payload{
		Title: notification.Title,
		Body:  notification.Body,
		Icon:  notification.Icon,
		URL:   notification.URL,
		Data:  notification.DataJSON,
	}

	sentCount := 0
	failedCount := 0

	for _, sub := range subs {
		result := push.Send(
			sub.Endpoint, sub.P256DH, sub.Auth,
			notification.VAPIDPublic, notification.VAPIDPrivate,
			payload, notification.TTL,
		)

		logEntry := &models.NotificationLog{
			NotificationID: notifID,
			SubscriptionID: sub.ID,
			Status:         "sent",
		}

		if result.Err != nil {
			logEntry.Status = "failed"
			errStr := result.Err.Error()
			logEntry.Error = &errStr
			failedCount++

			// Remove expired subscriptions (410 Gone / 404)
			if result.Gone {
				logger.Info("removing expired subscription", "endpoint", sub.Endpoint)
				_ = subRepo.DeactivateByEndpoint(ctx, sub.Endpoint)
			}
		} else {
			sentCount++
		}

		_ = notifRepo.CreateLog(ctx, logEntry)
	}

	// Update notification status
	status := "completed"
	if sentCount == 0 && failedCount > 0 {
		status = "failed"
	}
	_ = notifRepo.UpdateStatus(ctx, notifID, status, sentCount, failedCount)

	// Increment project counter
	_ = projectRepo.IncrementSentCount(ctx, projectID, sentCount)

	logger.Info("notification processed",
		"notification_id", notifID,
		"sent", sentCount,
		"failed", failedCount,
		"worker", workerID,
	)

	msg.Ack()
}
