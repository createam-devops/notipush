package models

import (
	"time"

	"github.com/google/uuid"
)

// Project represents a client project (multi-tenant unit).
type Project struct {
	ID                uuid.UUID `json:"id"`
	Name              string    `json:"name"`
	APIKeyHash        string    `json:"-"`
	APIKeyPrefix      string    `json:"api_key_prefix"`
	VAPIDPublicKey    string    `json:"vapid_public_key"`
	VAPIDPrivateKey   string    `json:"-"`
	MonthlyQuota      int       `json:"monthly_quota"`
	NotificationsSent int       `json:"notifications_sent"`
	WebhookURL        *string   `json:"webhook_url,omitempty"`
	IsActive          bool      `json:"is_active"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type Application struct {
	ID         uuid.UUID `json:"id"`
	ProjectID  uuid.UUID `json:"project_id"`
	Name       string    `json:"name"`
	Platform   string    `json:"platform"`
	ConfigJSON any       `json:"config_json,omitempty"`
	IsActive   bool      `json:"is_active"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

type Topic struct {
	ID          uuid.UUID `json:"id"`
	AppID       uuid.UUID `json:"app_id"`
	Name        string    `json:"name"`
	Description *string   `json:"description,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
}

type Subscription struct {
	ID             uuid.UUID `json:"id"`
	AppID          uuid.UUID `json:"app_id"`
	UserExternalID string    `json:"user_external_id"`
	Endpoint       string    `json:"endpoint"`
	P256DH         string    `json:"p256dh"`
	Auth           string    `json:"auth"`
	IsActive       bool      `json:"is_active"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type Notification struct {
	ID              uuid.UUID `json:"id"`
	ProjectID       uuid.UUID `json:"project_id"`
	AppID           uuid.UUID `json:"app_id"`
	TopicID         *uuid.UUID `json:"topic_id,omitempty"`
	Title           string    `json:"title"`
	Body            string    `json:"body"`
	Icon            *string   `json:"icon,omitempty"`
	URL             *string   `json:"url,omitempty"`
	DataJSON        any       `json:"data_json,omitempty"`
	Priority        string    `json:"priority"`
	TTL             int       `json:"ttl"`
	TotalRecipients int       `json:"total_recipients"`
	SentCount       int       `json:"sent_count"`
	FailedCount     int       `json:"failed_count"`
	Status          string    `json:"status"`
	CreatedAt       time.Time `json:"created_at"`
}

type NotificationLog struct {
	ID             uuid.UUID  `json:"id"`
	NotificationID uuid.UUID  `json:"notification_id"`
	SubscriptionID uuid.UUID  `json:"subscription_id"`
	Status         string     `json:"status"`
	Attempts       int        `json:"attempts"`
	Error          *string    `json:"error,omitempty"`
	SentAt         *time.Time `json:"sent_at,omitempty"`
}

// --- Request DTOs ---

type CreateProjectRequest struct {
	Name       string  `json:"name"`
	WebhookURL *string `json:"webhook_url,omitempty"`
}

type CreateApplicationRequest struct {
	Name     string `json:"name"`
	Platform string `json:"platform"`
}

type CreateTopicRequest struct {
	Name        string  `json:"name"`
	Description *string `json:"description,omitempty"`
}

type SubscribeRequest struct {
	UserExternalID string   `json:"user_external_id"`
	Endpoint       string   `json:"endpoint"`
	P256DH         string   `json:"p256dh"`
	Auth           string   `json:"auth"`
	Topics         []string `json:"topics,omitempty"`
}

type SendNotificationRequest struct {
	AppID    string  `json:"app_id"`
	TopicID  *string `json:"topic_id,omitempty"`
	Title    string  `json:"title"`
	Body     string  `json:"body"`
	Icon     *string `json:"icon,omitempty"`
	URL      *string `json:"url,omitempty"`
	DataJSON any     `json:"data_json,omitempty"`
	Priority string  `json:"priority,omitempty"`
	TTL      int     `json:"ttl,omitempty"`
}

// CreateProjectResponse includes the raw API key (only shown once).
type CreateProjectResponse struct {
	Project *Project `json:"project"`
	APIKey  string   `json:"api_key"`
}

// NATSNotificationMessage is published to JetStream.
type NATSNotificationMessage struct {
	NotificationID string `json:"notification_id"`
	ProjectID      string `json:"project_id"`
	AppID          string `json:"app_id"`
	TopicID        string `json:"topic_id,omitempty"`
	Title          string `json:"title"`
	Body           string `json:"body"`
	Icon           string `json:"icon,omitempty"`
	URL            string `json:"url,omitempty"`
	DataJSON       any    `json:"data_json,omitempty"`
	Priority       string `json:"priority"`
	TTL            int    `json:"ttl"`
	VAPIDPublic    string `json:"vapid_public"`
	VAPIDPrivate   string `json:"vapid_private"`
}
