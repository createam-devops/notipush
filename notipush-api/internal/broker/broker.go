package broker

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/nats-io/nats.go"
	"github.com/nats-io/nats.go/jetstream"
)

const (
	StreamName    = "NOTIFICATIONS"
	SubjectSend   = "push.send"
	SubjectDLQ    = "push.dlq"
	ConsumerName  = "push-worker"
	MaxDeliver    = 5
	AckWait       = 30 * time.Second
)

type Broker struct {
	conn   *nats.Conn
	js     jetstream.JetStream
	logger *slog.Logger
}

func New(ctx context.Context, url string, logger *slog.Logger) (*Broker, error) {
	nc, err := nats.Connect(url,
		nats.RetryOnFailedConnect(true),
		nats.MaxReconnects(10),
		nats.ReconnectWait(2*time.Second),
	)
	if err != nil {
		return nil, fmt.Errorf("nats connect: %w", err)
	}

	js, err := jetstream.New(nc)
	if err != nil {
		nc.Close()
		return nil, fmt.Errorf("jetstream new: %w", err)
	}

	b := &Broker{conn: nc, js: js, logger: logger}

	if err := b.ensureStream(ctx); err != nil {
		nc.Close()
		return nil, err
	}

	return b, nil
}

func (b *Broker) ensureStream(ctx context.Context) error {
	_, err := b.js.CreateOrUpdateStream(ctx, jetstream.StreamConfig{
		Name:      StreamName,
		Subjects:  []string{"push.>"},
		Retention: jetstream.WorkQueuePolicy,
		MaxAge:    24 * time.Hour,
		Storage:   jetstream.FileStorage,
	})
	if err != nil {
		return fmt.Errorf("create stream: %w", err)
	}
	return nil
}

func (b *Broker) Publish(ctx context.Context, subject string, data []byte) error {
	_, err := b.js.Publish(ctx, subject, data)
	if err != nil {
		return fmt.Errorf("publish: %w", err)
	}
	return nil
}

func (b *Broker) PublishNotification(ctx context.Context, data []byte) error {
	return b.Publish(ctx, SubjectSend, data)
}

func (b *Broker) CreateConsumer(ctx context.Context) (jetstream.Consumer, error) {
	consumer, err := b.js.CreateOrUpdateConsumer(ctx, StreamName, jetstream.ConsumerConfig{
		Name:          ConsumerName,
		Durable:       ConsumerName,
		FilterSubject: SubjectSend,
		MaxDeliver:    MaxDeliver,
		AckWait:       AckWait,
		AckPolicy:     jetstream.AckExplicitPolicy,
	})
	if err != nil {
		return nil, fmt.Errorf("create consumer: %w", err)
	}
	return consumer, nil
}

func (b *Broker) PublishDLQ(ctx context.Context, data []byte) error {
	return b.Publish(ctx, SubjectDLQ, data)
}

func (b *Broker) Close() {
	b.conn.Close()
}

func (b *Broker) JetStream() jetstream.JetStream {
	return b.js
}
