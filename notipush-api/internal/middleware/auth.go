package middleware

import (
	"context"
	"crypto/subtle"
	"net/http"
	"strings"

	"github.com/notipush/notipush/internal/db"
	"github.com/notipush/notipush/internal/models"
)

type contextKey string

const ProjectCtxKey contextKey = "project"

func ProjectFromContext(ctx context.Context) *models.Project {
	p, _ := ctx.Value(ProjectCtxKey).(*models.Project)
	return p
}

// AdminAuth validates the Authorization: Bearer <ADMIN_SECRET> header.
// If secret is empty, the middleware is a no-op (dev mode).
func AdminAuth(secret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if secret == "" {
				// Dev mode: no admin auth required
				next.ServeHTTP(w, r)
				return
			}

			token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
			if token == "" || subtle.ConstantTimeCompare([]byte(token), []byte(secret)) != 1 {
				w.Header().Set("Content-Type", "application/json")
				http.Error(w, `{"error":"unauthorized"}`, http.StatusUnauthorized)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// APIKeyAuth validates the X-API-Key header and injects the project into context.
func APIKeyAuth(projectRepo *db.ProjectRepo) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			apiKey := r.Header.Get("X-API-Key")
			if apiKey == "" {
				apiKey = strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
			}

			if apiKey == "" {
				http.Error(w, `{"error":"missing api key"}`, http.StatusUnauthorized)
				return
			}

			project, err := projectRepo.GetByAPIKeyHash(r.Context(), apiKey)
			if err != nil {
				http.Error(w, `{"error":"invalid api key"}`, http.StatusUnauthorized)
				return
			}

			if !project.IsActive {
				http.Error(w, `{"error":"project is inactive"}`, http.StatusForbidden)
				return
			}

			ctx := context.WithValue(r.Context(), ProjectCtxKey, project)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}
