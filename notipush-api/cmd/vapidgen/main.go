package main

import (
	"fmt"
	"os"

	"github.com/notipush/notipush/internal/vapid"
)

func main() {
	kp, err := vapid.GenerateKeyPair()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}

	fmt.Println("# Add these to your .env file:")
	fmt.Printf("VAPID_PRIVATE_KEY=%s\n", kp.PrivateKey)
	fmt.Printf("VAPID_PUBLIC_KEY=%s\n", kp.PublicKey)
}
