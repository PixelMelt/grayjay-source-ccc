#!/bin/sh
set -e

SCRIPT="MediaCCCScript.js"
CONFIG="MediaCCCConfig.json"
PRIVKEY="private_key.der"

if [ ! -f "$PRIVKEY" ]; then
    echo "Error: $PRIVKEY not found. Place your private key in this directory."
    exit 1
fi

openssl dgst -sha512 -sign "$PRIVKEY" -out signature.bin "$SCRIPT"
SIG=$(base64 -w 0 signature.bin)

sed -i "s|\"scriptSignature\": \"[^\"]*\"|\"scriptSignature\": \"$SIG\"|" "$CONFIG"

openssl rsa -pubout -in "$PRIVKEY" -inform DER -outform DER -out public_key.der 2>/dev/null
openssl dgst -sha512 -verify public_key.der -signature signature.bin "$SCRIPT"

echo "Updated $CONFIG with new signature."
