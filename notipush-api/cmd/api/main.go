package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/notipush/notipush/internal/broker"
	"github.com/notipush/notipush/internal/config"
	"github.com/notipush/notipush/internal/db"
	"github.com/notipush/notipush/internal/handler"
	"github.com/notipush/notipush/internal/middleware"
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
	projectRepo := db.NewProjectRepo(pool)
	appRepo := db.NewApplicationRepo(pool)
	subRepo := db.NewSubscriptionRepo(pool)
	topicRepo := db.NewTopicRepo(pool)
	notifRepo := db.NewNotificationRepo(pool)

	// Handlers
	projectH := handler.NewProjectHandler(projectRepo)
	appH := handler.NewApplicationHandler(appRepo)
	subH := handler.NewSubscriptionHandler(subRepo, topicRepo)
	topicH := handler.NewTopicHandler(topicRepo)
	notifH := handler.NewNotificationHandler(notifRepo, subRepo, natsClient)

	// Router
	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Logger)
	r.Use(chimw.Recoverer)
	r.Use(corsMiddleware(cfg.API.CORSOrigins))

	// Public routes
	r.Get("/health", handler.HealthCheck)

	// SDK static files (served from /sdk/ directory next to the binary or /app/sdk in Docker)
	sdkDir := getEnv("SDK_DIR", "sdk")
	if _, err := os.Stat(sdkDir); err == nil {
		r.Handle("/sdk/*", http.StripPrefix("/sdk/", http.FileServer(http.Dir(sdkDir))))
	}

	// Admin routes (protected by ADMIN_SECRET in production)
	r.Route("/admin", func(r chi.Router) {
		r.Use(middleware.AdminAuth(cfg.Admin.Secret))
		r.Post("/projects", projectH.Create)
		r.Get("/projects", projectH.List)
	})

	// API routes (protected by API key)
	r.Route("/api/v1", func(r chi.Router) {
		r.Use(middleware.APIKeyAuth(projectRepo, cfg.Admin.Secret))
		r.Use(middleware.NewRateLimiter(120))

		// Current project (from API key)
		r.Get("/project", projectH.GetCurrent)

		// Applications
		r.Post("/applications", appH.Create)
		r.Get("/applications", appH.List)
		r.Delete("/applications/{appID}", appH.Delete)

		// Topics
		r.Post("/applications/{appID}/topics", topicH.Create)
		r.Get("/applications/{appID}/topics", topicH.List)
		r.Delete("/topics/{topicID}", topicH.Delete)

		// Subscriptions
		r.Post("/applications/{appID}/subscribe", subH.Subscribe)
		r.Get("/applications/{appID}/subscriptions", subH.ListByApp)

		// Notifications
		r.Post("/notifications/send", notifH.Send)
		r.Get("/notifications", notifH.List)
		r.Get("/notifications/{notifID}", notifH.GetByID)
	})

	// Server
	srv := &http.Server{
		Addr:         cfg.API.Addr(),
		Handler:      r,
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 30 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
		<-sigCh

		logger.Info("shutting down API server...")
		cancel()

		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer shutdownCancel()
		srv.Shutdown(shutdownCtx)
	}()

	logger.Info("API server starting", "addr", cfg.API.Addr())
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		logger.Error("server error", "error", err)
		os.Exit(1)
	}

	logger.Info("API server stopped")
}

func corsMiddleware(allowedOrigins []string) func(http.Handler) http.Handler {
	allowAll := len(allowedOrigins) == 0
	originSet := make(map[string]bool, len(allowedOrigins))
	for _, o := range allowedOrigins {
		originSet[o] = true
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")

			if allowAll {
				w.Header().Set("Access-Control-Allow-Origin", "*")
			} else if originSet[origin] {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Vary", "Origin")
			}

			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key")

			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
