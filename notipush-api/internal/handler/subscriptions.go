package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/notipush/notipush/internal/db"
	"github.com/notipush/notipush/internal/middleware"
	"github.com/notipush/notipush/internal/models"
)

type SubscriptionHandler struct {
	subRepo   *db.SubscriptionRepo
	topicRepo *db.TopicRepo
}

func NewSubscriptionHandler(subRepo *db.SubscriptionRepo, topicRepo *db.TopicRepo) *SubscriptionHandler {
	return &SubscriptionHandler{subRepo: subRepo, topicRepo: topicRepo}
}

func (h *SubscriptionHandler) Subscribe(w http.ResponseWriter, r *http.Request) {
	project := middleware.ProjectFromContext(r.Context())
	if project == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	appIDStr := chi.URLParam(r, "appID")
	appID, err := uuid.Parse(appIDStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid application id")
		return
	}

	var req models.SubscribeRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Endpoint == "" || req.P256DH == "" || req.Auth == "" || req.UserExternalID == "" {
		writeError(w, http.StatusBadRequest, "endpoint, p256dh, auth, and user_external_id are required")
		return
	}

	sub := &models.Subscription{
		AppID:          appID,
		UserExternalID: req.UserExternalID,
		Endpoint:       req.Endpoint,
		P256DH:         req.P256DH,
		Auth:           req.Auth,
	}

	if err := h.subRepo.Upsert(r.Context(), sub); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to save subscription")
		return
	}

	// Subscribe to topics if provided
	if len(req.Topics) > 0 {
		var topicIDs []uuid.UUID
		for _, name := range req.Topics {
			topic, err := h.topicRepo.GetByName(r.Context(), appID, name)
			if err != nil {
				continue // skip unknown topics
			}
			topicIDs = append(topicIDs, topic.ID)
		}
		if len(topicIDs) > 0 {
			_ = h.subRepo.AddTopics(r.Context(), sub.ID, topicIDs)
		}
	}

	writeJSON(w, http.StatusCreated, sub)
}

func (h *SubscriptionHandler) ListByApp(w http.ResponseWriter, r *http.Request) {
	appIDStr := chi.URLParam(r, "appID")
	appID, err := uuid.Parse(appIDStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid application id")
		return
	}

	subs, err := h.subRepo.ListByApp(r.Context(), appID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list subscriptions")
		return
	}

	if subs == nil {
		subs = []models.Subscription{}
	}

	writeJSON(w, http.StatusOK, subs)
}
