#!/bin/sh
set -e

SCRIPT="MediaCCCScript.js"
CONFIG="MediaCCCConfig.json"
PRIVKEY="private_key.pem"

if [ ! -f "$PRIVKEY" ]; then
    echo "Error: $PRIVKEY not found. Place your private key in this directory."
    exit 1
fi

# Sign (matching grayjay-sources/source-generator approach)
SIG=$(openssl dgst -sha512 -sign "$PRIVKEY" "$SCRIPT" | openssl base64 -A)

# Extract public key, strip PEM headers
PUBKEY=$(openssl rsa -pubout -outform PEM -in "$PRIVKEY" 2>/dev/null \
    | grep -v '^\-\-\-' | tr -d '\n')

# Update config
python3 -c "
import json, sys
with open('$CONFIG') as f:
    c = json.load(f)
c['scriptSignature'] = sys.argv[1]
c['scriptPublicKey'] = sys.argv[2]
with open('$CONFIG', 'w') as f:
    json.dump(c, f, indent=2, ensure_ascii=False)
    f.write('\n')
" "$SIG" "$PUBKEY"

# Verify
openssl rsa -pubout -outform DER -in "$PRIVKEY" -out /tmp/pubkey.der 2>/dev/null
openssl dgst -sha512 -sign "$PRIVKEY" "$SCRIPT" > /tmp/sig.bin
openssl dgst -sha512 -verify /tmp/pubkey.der -signature /tmp/sig.bin "$SCRIPT"

echo "Updated $CONFIG with new signature."
