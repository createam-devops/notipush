package push

import (
	"encoding/json"
	"fmt"
	"net/http"

	webpush "github.com/SherClockHolmes/webpush-go"
)

type Payload struct {
	Title string `json:"title"`
	Body  string `json:"body"`
	Icon  string `json:"icon,omitempty"`
	URL   string `json:"url,omitempty"`
	Data  any    `json:"data,omitempty"`
}

type PushResult struct {
	StatusCode int
	Gone       bool
	Err        error
}

// Send delivers a web push notification to the given subscription endpoint.
func Send(endpoint, p256dh, auth, vapidPublic, vapidPrivate, vapidContact string, payload *Payload, ttl int) *PushResult {
	body, err := json.Marshal(payload)
	if err != nil {
		return &PushResult{Err: fmt.Errorf("marshal payload: %w", err)}
	}

	sub := &webpush.Subscription{
		Endpoint: endpoint,
		Keys: webpush.Keys{
			P256dh: p256dh,
			Auth:   auth,
		},
	}

	resp, err := webpush.SendNotification(body, sub, &webpush.Options{
		Subscriber:      vapidContact,
		VAPIDPublicKey:  vapidPublic,
		VAPIDPrivateKey: vapidPrivate,
		TTL:             ttl,
		Urgency:         webpush.UrgencyNormal,
	})
	if err != nil {
		return &PushResult{Err: fmt.Errorf("send push: %w", err)}
	}
	defer resp.Body.Close()

	result := &PushResult{StatusCode: resp.StatusCode}

	if resp.StatusCode == http.StatusGone || resp.StatusCode == http.StatusNotFound {
		result.Gone = true
		result.Err = fmt.Errorf("subscription expired (status %d)", resp.StatusCode)
	} else if resp.StatusCode >= 400 {
		result.Err = fmt.Errorf("push failed with status %d", resp.StatusCode)
	}

	return result
}
