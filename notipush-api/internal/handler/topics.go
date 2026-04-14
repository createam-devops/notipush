package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/notipush/notipush/internal/db"
	"github.com/notipush/notipush/internal/middleware"
	"github.com/notipush/notipush/internal/models"
)

type TopicHandler struct {
	repo *db.TopicRepo
}

func NewTopicHandler(repo *db.TopicRepo) *TopicHandler {
	return &TopicHandler{repo: repo}
}

func (h *TopicHandler) Create(w http.ResponseWriter, r *http.Request) {
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

	var req models.CreateTopicRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}

	topic := &models.Topic{
		AppID:       appID,
		Name:        req.Name,
		Description: req.Description,
	}

	if err := h.repo.Create(r.Context(), topic); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create topic")
		return
	}

	writeJSON(w, http.StatusCreated, topic)
}

func (h *TopicHandler) List(w http.ResponseWriter, r *http.Request) {
	appIDStr := chi.URLParam(r, "appID")
	appID, err := uuid.Parse(appIDStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid application id")
		return
	}

	topics, err := h.repo.ListByApp(r.Context(), appID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list topics")
		return
	}

	if topics == nil {
		topics = []models.Topic{}
	}

	writeJSON(w, http.StatusOK, topics)
}

func (h *TopicHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "topicID")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid topic id")
		return
	}

	if err := h.repo.Delete(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete topic")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
