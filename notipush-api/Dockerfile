# --- Build stage ---
# Build context must be the REPO ROOT (context: . in docker-compose/CI)
FROM golang:1.22-alpine AS builder

RUN apk add --no-cache git ca-certificates

WORKDIR /build

# Cache dependencies
COPY notipush-api/go.mod notipush-api/go.sum ./
RUN go mod download

# Copy Go source
COPY notipush-api/ .

# Build both binaries
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/api ./cmd/api
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/worker ./cmd/worker
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/vapidgen ./cmd/vapidgen

# --- Runtime stage ---
FROM alpine:3.20

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

# Copy binaries
COPY --from=builder /out/api /app/api
COPY --from=builder /out/worker /app/worker
COPY --from=builder /out/vapidgen /app/vapidgen

# Copy migrations
COPY notipush-api/migrations/ /app/migrations/

# Copy SDK files (served via /sdk/* endpoint)
COPY sdk/ /app/sdk/

EXPOSE 8080

# Default: run the API server
CMD ["/app/api"]
