package handler

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"

	"github.com/notipush/notipush/internal/db"
	"github.com/notipush/notipush/internal/middleware"
	"github.com/notipush/notipush/internal/models"
	"github.com/notipush/notipush/internal/vapid"
)

type ProjectHandler struct {
	repo *db.ProjectRepo
}

func NewProjectHandler(repo *db.ProjectRepo) *ProjectHandler {
	return &ProjectHandler{repo: repo}
}

func (h *ProjectHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req models.CreateProjectRequest
	if err := decodeJSON(r, &req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Name == "" {
		writeError(w, http.StatusBadRequest, "name is required")
		return
	}

	// Generate VAPID keys
	keys, err := vapid.GenerateKeyPair()
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate VAPID keys")
		return
	}

	// Generate API key (32 bytes = 64 hex chars)
	apiKeyBytes := make([]byte, 32)
	if _, err := rand.Read(apiKeyBytes); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to generate API key")
		return
	}
	rawAPIKey := hex.EncodeToString(apiKeyBytes)

	project := &models.Project{
		Name:            req.Name,
		VAPIDPublicKey:  keys.PublicKey,
		VAPIDPrivateKey: keys.PrivateKey,
		MonthlyQuota:    10000,
		WebhookURL:      req.WebhookURL,
	}

	if err := h.repo.Create(r.Context(), project, rawAPIKey); err != nil {
		writeError(w, http.StatusInternalServerError, "failed to create project")
		return
	}

	writeJSON(w, http.StatusCreated, models.CreateProjectResponse{
		Project: project,
		APIKey:  rawAPIKey,
	})
}

func (h *ProjectHandler) GetCurrent(w http.ResponseWriter, r *http.Request) {
	project := middleware.ProjectFromContext(r.Context())
	if project == nil {
		writeError(w, http.StatusUnauthorized, "unauthorized")
		return
	}
	writeJSON(w, http.StatusOK, project)
}

func (h *ProjectHandler) List(w http.ResponseWriter, r *http.Request) {
	projects, err := h.repo.List(r.Context())
	if err != nil {
		writeError(w, http.StatusInternalServerError, "failed to list projects")
		return
	}

	if projects == nil {
		projects = []models.Project{}
	}

	writeJSON(w, http.StatusOK, projects)
}
