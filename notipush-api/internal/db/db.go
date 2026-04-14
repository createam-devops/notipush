package db

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"github.com/jackc/pgx/v5/pgxpool"
)

func Connect(ctx context.Context, dsn string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(dsn)
	if err != nil {
		return nil, fmt.Errorf("parse dsn: %w", err)
	}

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("connect to db: %w", err)
	}

	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping db: %w", err)
	}

	return pool, nil
}

func RunMigrations(ctx context.Context, pool *pgxpool.Pool, migrationsDir string) error {
	data, err := os.ReadFile(filepath.Join(migrationsDir, "001_initial.sql"))
	if err != nil {
		return fmt.Errorf("read migration: %w", err)
	}

	_, err = pool.Exec(ctx, string(data))
	if err != nil {
		return fmt.Errorf("exec migration: %w", err)
	}

	return nil
}
