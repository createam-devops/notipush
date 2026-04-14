package handler

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/notipush/notipush/internal/broker"
	"github.com/notipush/notipush/internal/db"
	"github.com/notipush/notipush/internal/middleware"
	"github.com/notipush/notipush/internal/models"
)

type NotificationHandler struct {
	notifRepo *db.NotificationRepo
	subRepo   *db.SubscriptionRepo
	broker    *broker.Broker
}

func NewNotificationHandler(notifRepo *db.NotificationRepo, subRepo *db.SubscriptionRepo, b *broker.Broker) *NotificationHandler {
	return &NotificationHandler{notifRepo: notifRepo, subRepo: subRepo, broker: b}
}

func (h *NotificationHandler) Send(w http.ResponseWriter, r *http.Request) {
	project := middleware.ProjectFromContext(r.Context())
	if project == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	// Check monthly quota
	if project.NotificationsSent >= project.MonthlyQuota {
		writeError(w, http.StatusTooManyRequests, "monthly notification quota exceeded")
		return
	}

	var req models.SendNotificationRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Title == "" || req.Body == "" || req.AppID == "" {
		writeError(w, http.StatusBadRequest, "title, body, and app_id are required")
		return
	}

	appID, err := uuid.Parse(req.AppID)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid app_id")
		return
	}

	if req.Priority == "" {
		req.Priority = "normal"
	}
	if req.TTL == 0 {
		req.TTL = 86400
	}

	// Count recipients
	var totalRecipients int
	var topicID *uuid.UUID
	if req.TopicID != nil {
		tid, err := uuid.Parse(*req.TopicID)
		if err != nil {
			writeError(w, http.StatusBadRequest, "invalid topic_id")
			return
		}
		topicID = &tid
		subs, err := h.subRepo.ListByTopic(r.Context(), tid)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to count recipients")
			return
		}
		totalRecipients = len(subs)
	} else {
		subs, err := h.subRepo.ListByApp(r.Context(), appID)
		if err != nil {
			writeError(w, http.StatusInternalServerError, "failed to count recipients")
			return
		}
		totalRecipients = len(subs)
	}

	if totalRecipients == 0 {
		writeError(w, http.StatusBadRequest, "no active subscriptions found")
		return
	}

	// Create notification record
	notif := &models.Notification{
		ProjectID:       project.ID,
		AppID:           appID,
		TopicID:         topicID,
		Title:           req.Title,
		Body:            req.Body,
		Icon:            req.Icon,
		URL:             req.URL,
		DataJSON:        req.DataJSON,
		Priority:        req.Priority,
		TTL:             req.TTL,
		TotalRecipients: totalRecipients,
	}

	if err := h.notifRepo.Create(r.Context(), notif); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create notification")
		return
	}

	// Publish to NATS
	msg := models.NATSNotificationMessage{
		NotificationID: notif.ID.String(),
		ProjectID:      project.ID.String(),
		AppID:          appID.String(),
		Title:          req.Title,
		Body:           req.Body,
		Icon:           ptrStr(req.Icon),
		URL:            ptrStr(req.URL),
		DataJSON:       req.DataJSON,
		Priority:       req.Priority,
		TTL:            req.TTL,
		VAPIDPublic:    project.VAPIDPublicKey,
		VAPIDPrivate:   project.VAPIDPrivateKey,
	}

	if topicID != nil {
		msg.TopicID = topicID.String()
	}

	data, err := json.Marshal(msg)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to serialize message")
		return
	}

	if err := h.broker.PublishNotification(r.Context(), data); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to queue notification")
		return
	}

	writeJSON(w, http.StatusAccepted, notif)
}

func (h *NotificationHandler) GetByID(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "notifID")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid notification id")
		return
	}

	notif, err := h.notifRepo.GetByID(r.Context(), id)
	if err != nil {
		writeError(w, http.StatusNotFound, "notification not found")
		return
	}

	writeJSON(w, http.StatusOK, notif)
}

func (h *NotificationHandler) List(w http.ResponseWriter, r *http.Request) {
	project := middleware.ProjectFromContext(r.Context())
	if project == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	notifs, err := h.notifRepo.ListByProject(r.Context(), project.ID, 50)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list notifications")
		return
	}

	if notifs == nil {
		notifs = []models.Notification{}
	}

	writeJSON(w, http.StatusOK, notifs)
}

func ptrStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
