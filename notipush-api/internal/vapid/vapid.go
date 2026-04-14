package vapid

import (
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"math/big"
)

type KeyPair struct {
	PublicKey  string
	PrivateKey string
}

// GenerateKeyPair creates a new VAPID ECDSA P-256 key pair encoded in URL-safe base64.
func GenerateKeyPair() (*KeyPair, error) {
	privateKey, err := ecdsa.GenerateKey(elliptic.P256(), rand.Reader)
	if err != nil {
		return nil, fmt.Errorf("generate ecdsa key: %w", err)
	}

	publicKeyBytes := elliptic.Marshal(elliptic.P256(), privateKey.PublicKey.X, privateKey.PublicKey.Y)
	publicKeyB64 := base64.RawURLEncoding.EncodeToString(publicKeyBytes)

	privateKeyBytes := privateKey.D.Bytes()
	// Pad to 32 bytes
	padded := make([]byte, 32)
	copy(padded[32-len(privateKeyBytes):], privateKeyBytes)
	privateKeyB64 := base64.RawURLEncoding.EncodeToString(padded)

	return &KeyPair{
		PublicKey:  publicKeyB64,
		PrivateKey: privateKeyB64,
	}, nil
}

// DecodePrivateKey converts a base64url-encoded private key back to an ECDSA key.
func DecodePrivateKey(privateKeyB64 string) (*ecdsa.PrivateKey, error) {
	bytes, err := base64.RawURLEncoding.DecodeString(privateKeyB64)
	if err != nil {
		return nil, fmt.Errorf("decode private key: %w", err)
	}

	d := new(big.Int).SetBytes(bytes)
	pubX, pubY := elliptic.P256().ScalarBaseMult(bytes)

	return &ecdsa.PrivateKey{
		PublicKey: ecdsa.PublicKey{
			Curve: elliptic.P256(),
			X:     pubX,
			Y:     pubY,
		},
		D: d,
	}, nil
}
