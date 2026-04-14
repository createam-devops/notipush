package middleware

import (
	"net/http"
	"sync"
	"time"
)

type rateLimiter struct {
	mu       sync.Mutex
	visitors map[string]*visitor
	rate     int
	window   time.Duration
}

type visitor struct {
	count    int
	resetAt  time.Time
}

func NewRateLimiter(requestsPerMinute int) func(http.Handler) http.Handler {
	rl := &rateLimiter{
		visitors: make(map[string]*visitor),
		rate:     requestsPerMinute,
		window:   time.Minute,
	}

	// Cleanup stale entries every 2 minutes
	go func() {
		for {
			time.Sleep(2 * time.Minute)
			rl.mu.Lock()
			now := time.Now()
			for k, v := range rl.visitors {
				if now.After(v.resetAt) {
					delete(rl.visitors, k)
				}
			}
			rl.mu.Unlock()
		}
	}()

	return rl.middleware
}

func (rl *rateLimiter) middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Rate limit per project (API key prefix) if authenticated, otherwise by IP
		key := r.RemoteAddr
		if p := ProjectFromContext(r.Context()); p != nil {
			key = p.ID.String()
		}

		rl.mu.Lock()
		v, exists := rl.visitors[key]
		now := time.Now()

		if !exists || now.After(v.resetAt) {
			rl.visitors[key] = &visitor{count: 1, resetAt: now.Add(rl.window)}
			rl.mu.Unlock()
			next.ServeHTTP(w, r)
			return
		}

		if v.count >= rl.rate {
			rl.mu.Unlock()
			http.Error(w, `{"error":"rate limit exceeded"}`, http.StatusTooManyRequests)
			return
		}

		v.count++
		rl.mu.Unlock()
		next.ServeHTTP(w, r)
	})
}
