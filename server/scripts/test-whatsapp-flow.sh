#!/usr/bin/env bash
# Local smoke checks for PillSure WhatsApp webhook + verification.
# See docs/whatsapp-bot-test-flow.md for full context.
#
# Usage:
#   export WHATSAPP_VERIFY_TOKEN='your_meta_verify_token'
#   export WHATSAPP_PHONE_NUMBER_ID='from_meta_api_setup'
#   export PILLSURE_API_BASE='http://localhost:7154'
#   bash server/scripts/test-whatsapp-flow.sh

set -euo pipefail

PILLSURE_API_BASE="${PILLSURE_API_BASE:-http://localhost:7154}"
VERIFY_TOKEN="${WHATSAPP_VERIFY_TOKEN:-}"
PHONE_ID="${WHATSAPP_PHONE_NUMBER_ID:-}"
CHALLENGE="pillsure_smoke_$(date +%s)"

echo "== PillSure WhatsApp flow smoke =="
echo "API: $PILLSURE_API_BASE"

if [[ -z "$VERIFY_TOKEN" ]]; then
  echo "WARN: WHATSAPP_VERIFY_TOKEN not set — skipping GET verify test."
else
  echo ""
  echo "== GET webhook verify (expect body: $CHALLENGE) =="
  OUT=$(curl -sS "${PILLSURE_API_BASE}/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=${VERIFY_TOKEN}&hub.challenge=${CHALLENGE}")
  if [[ "$OUT" == "$CHALLENGE" ]]; then
    echo "OK: verification challenge matched."
  else
    echo "FAIL: expected '$CHALLENGE', got: $OUT"
    exit 1
  fi
fi

if [[ -z "$PHONE_ID" ]]; then
  echo ""
  echo "WARN: WHATSAPP_PHONE_NUMBER_ID not set — skipping POST fake message."
  exit 0
fi

if ! command -v jq &>/dev/null; then
  echo "ERROR: jq is required for POST payload. Install jq or use curl from docs/whatsapp-bot-test-flow.md section 6.2."
  exit 1
fi

echo ""
echo "== POST fake inbound text (debounce ~5s) =="
curl -sS -X POST "${PILLSURE_API_BASE}/whatsapp/webhook" \
  -H "Content-Type: application/json" \
  -d "$(jq -n \
    --arg pid "$PHONE_ID" \
    '{
      object: "whatsapp_business_account",
      entry: [{
        changes: [{
          value: {
            messaging_product: "whatsapp",
            metadata: { phone_number_id: $pid },
            messages: [{
              from: "923001234567",
              id: ("wamid.smoke." + (now|tostring)),
              timestamp: "1234567890",
              type: "text",
              text: { body: "Hi, I would like to book a consultation online tomorrow at 10:00" }
            }]
          }
        }]
      }]
    }')"

echo ""
echo "Done. Expect {\"status\":\"ok\"}. Check server logs for Ollama and outbound WhatsApp."
