package config

import (
	"fmt"
	"net/url"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	DB     DBConfig
	NATS   NATSConfig
	API    APIConfig
	Worker WorkerConfig
	Admin  AdminConfig
}

type DBConfig struct {
	Host     string
	Port     int
	User     string
	Password string
	Name     string
	SSLMode  string
}

func (d DBConfig) DSN() string {
	return fmt.Sprintf("postgres://%s:%s@%s:%d/%s?sslmode=%s",
		url.QueryEscape(d.User), url.QueryEscape(d.Password), d.Host, d.Port, d.Name, d.SSLMode)
}

type NATSConfig struct {
	URL string
}

type APIConfig struct {
	Host        string
	Port        int
	CORSOrigins []string // Comma-separated allowed origins; empty = allow all
}

func (a APIConfig) Addr() string {
	return fmt.Sprintf("%s:%d", a.Host, a.Port)
}

type WorkerConfig struct {
	Concurrency int
}

type AdminConfig struct {
	Secret string // Required in production; if empty, admin routes are open (dev mode)
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	dbPort, _ := strconv.Atoi(getEnv("DB_PORT", "5432"))
	apiPort, _ := strconv.Atoi(getEnv("API_PORT", "8080"))
	workerConcurrency, _ := strconv.Atoi(getEnv("WORKER_CONCURRENCY", "10"))

	return &Config{
		DB: DBConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     dbPort,
			User:     getEnv("DB_USER", "notipush"),
			Password: getEnv("DB_PASSWORD", "notipush_secret"),
			Name:     getEnv("DB_NAME", "notipush"),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
		},
		NATS: NATSConfig{
			URL: getEnv("NATS_URL", "nats://localhost:4222"),
		},
		API: APIConfig{
			Host:        getEnv("API_HOST", "0.0.0.0"),
			Port:        apiPort,
			CORSOrigins: parseCORSOrigins(getEnv("CORS_ORIGINS", "")),
		},
		Worker: WorkerConfig{
			Concurrency: workerConcurrency,
		},
		Admin: AdminConfig{
			Secret: getEnv("ADMIN_SECRET", ""),
		},
	}, nil
}

func parseCORSOrigins(s string) []string {
	if s == "" {
		return nil
	}
	var origins []string
	for _, o := range strings.Split(s, ",") {
		o = strings.TrimSpace(o)
		if o != "" {
			origins = append(origins, o)
		}
	}
	return origins
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
