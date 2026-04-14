package handler

import (
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/notipush/notipush/internal/db"
	"github.com/notipush/notipush/internal/middleware"
	"github.com/notipush/notipush/internal/models"
)

type ApplicationHandler struct {
	repo *db.ApplicationRepo
}

func NewApplicationHandler(repo *db.ApplicationRepo) *ApplicationHandler {
	return &ApplicationHandler{repo: repo}
}

func (h *ApplicationHandler) Create(w http.ResponseWriter, r *http.Request) {
	project := middleware.ProjectFromContext(r.Context())
	if project == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req models.CreateApplicationRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Name == "" || req.Platform == "" {
		writeError(w, http.StatusBadRequest, "name and platform are required")
		return
	}

	validPlatforms := map[string]bool{"web": true, "ios": true, "android": true}
	if !validPlatforms[req.Platform] {
		writeError(w, http.StatusBadRequest, "platform must be web, ios, or android")
		return
	}

	app := &models.Application{
		ProjectID:  project.ID,
		Name:       req.Name,
		Platform:   req.Platform,
		ConfigJSON: map[string]any{},
	}

	if err := h.repo.Create(r.Context(), app); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create application")
		return
	}

	writeJSON(w, http.StatusCreated, app)
}

func (h *ApplicationHandler) List(w http.ResponseWriter, r *http.Request) {
	project := middleware.ProjectFromContext(r.Context())
	if project == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	apps, err := h.repo.ListByProject(r.Context(), project.ID)
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list applications")
		return
	}

	if apps == nil {
		apps = []models.Application{}
	}

	writeJSON(w, http.StatusOK, apps)
}

func (h *ApplicationHandler) Delete(w http.ResponseWriter, r *http.Request) {
	idStr := chi.URLParam(r, "appID")
	id, err := uuid.Parse(idStr)
	if err != nil {
		writeError(w, http.StatusBadRequest, "invalid application id")
		return
	}

	if err := h.repo.Delete(r.Context(), id); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to delete application")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
