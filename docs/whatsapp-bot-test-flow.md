# PillSure WhatsApp agent — test flow (shareable)

This document describes how to **set up**, **verify**, and **test** the WhatsApp booking assistant (Meta Cloud API + PillSure API + Ollama). Share it with anyone who needs to run or QA the flow.

---

## 1. What you are testing

| Step | System |
|------|--------|
| User sends WhatsApp message | Meta Cloud API |
| Meta calls your server | `POST /whatsapp/webhook` |
| Server looks up clinic by `phone_number_id` | Postgres `whatsapp_business_accounts` |
| Bot replies (and may book) | Ollama (`OLLAMA_MODEL`, default **qwen3.5**) + persona/services |
| Optional payment link | Stripe checkout for pending appointment |

**Public URL required:** Meta only accepts **HTTPS** webhooks. For local dev use **ngrok**, **Cloudflare Tunnel**, or deploy the API to a server with TLS.

---

## 2. Prerequisites checklist

- [ ] **Postgres** running (e.g. `docker compose -f server/docker-compose.yml up -d` from repo root).
- [ ] **`DATABASE_URL`** matches your DB (compose example uses host `localhost`, port **5433**, db `pillsure`, user `pillsure`, password `pillsure123`).
- [ ] Migrations applied: from repo root `npm run db:upgrade` (or your project’s migration command).
- [ ] **Node ≥ 18** for server; install deps: `npm ci` at monorepo root.
- [ ] **Ollama** running locally with the model you use, e.g. `ollama run qwen3.5` (name must match **`OLLAMA_MODEL`** if you set it).
- [ ] Server **`.env`** (or environment) includes at least:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `FRONTEND_BASE_URL` (server loads Stripe at startup)
  - `WHATSAPP_VERIFY_TOKEN` (you choose a secret string; Meta will send it during verification)
  - Optional: `OLLAMA_BASE_URL` (default `http://127.0.0.1:11434`), `OLLAMA_MODEL` (default `qwen3.5`)
  - Optional: `META_WHATSAPP_API_VERSION` (default `v21.0`)
- [ ] **Meta Developer** app with WhatsApp product, a **test** or **production** business phone, and **Phone number ID** + **Access token** + **App ID**.

---

## 3. Run the API

From monorepo root:

```bash
npm run dev:server
```

Default port **7154** (or set `PORT`). Confirm health:

```bash
curl -s http://localhost:7154/health
```

---

## 4. Configure Meta webhook

1. In Meta Developer → your app → **WhatsApp** → **Configuration**.
2. **Callback URL:** `https://<your-public-host>/whatsapp/webhook`  
   - Example with ngrok: `https://abc123.ngrok-free.app/whatsapp/webhook`
3. **Verify token:** exactly the same value as server env **`WHATSAPP_VERIFY_TOKEN`**.
4. Subscribe to fields your integration uses (at minimum **messages**; if you use Business app echoes, **message_echoes** / SMB echoes as per Meta docs).

Click **Verify and save**. If verification fails, check: URL reachable from the internet, HTTPS, token match, and server logs.

---

## 5. Configure PillSure (doctor or hospital user)

1. **Register / log in** as **doctor** or **hospital**.
2. Open **Dashboard → WhatsApp** (path: `/dashboard/settings/whatsapp`).
3. **WhatsApp (Meta) section** — save:
   - **Phone number ID** (must match `metadata.phone_number_id` Meta sends on each webhook).
   - **WhatsApp App ID**
   - **Access token** (with `whatsapp_business_messaging` scope as required by Meta).
   - **Display phone** (for your own reference).
   - **Doctor UUID** (optional but recommended): links bookings to a specific doctor in PillSure.
4. **Chatbot persona section** — save:
   - **Business name**, **owner name**, **persona text** (how the bot should sound).
   - **Services (JSON)** — must include services and, for slot hints, `availabilitySlots` per service (see template on the page). The assistant uses this JSON as the catalog.

5. Confirm **Ollama** is reachable from the **same machine** running the API (`OLLAMA_BASE_URL`).

---

## 6. Manual API checks (no phone)

### 6.1 Webhook verification (same as Meta “Verify”)

Replace `YOUR_TOKEN` with `WHATSAPP_VERIFY_TOKEN`:

```bash
curl -sS "http://localhost:7154/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=test123"
```

**Expected:** response body is exactly `test123`.

### 6.2 Fake inbound message (direct POST)

Replace `PHONE_NUMBER_ID` with the ID stored in PillSure **and** used by Meta:

```bash
curl -sS -X POST "http://localhost:7154/whatsapp/webhook" \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "changes": [{
        "value": {
          "messaging_product": "whatsapp",
          "metadata": { "phone_number_id": "PHONE_NUMBER_ID" },
          "messages": [{
            "from": "923001234567",
            "id": "wamid.manual.test",
            "timestamp": "1234567890",
            "type": "text",
            "text": { "body": "Hi, I want to book a consultation online tomorrow at 10:00" }
          }]
        }
      }]
    }]
  }]'
```

**Expected:** immediate JSON like `{"status":"ok"}`. After **~5 seconds** (debounce), the server should call Ollama and attempt to send a WhatsApp reply via Graph API (so token and phone ID must be valid for a real outbound message).

---

## 7. End-to-end test with a real phone

1. Complete sections **4–5**.
2. From a **WhatsApp client** allowed by Meta (test number or production), message the **business WhatsApp number**.
3. **Expected:** reply within a few seconds after you stop typing (debounce).
4. If the model infers a **confirmed** booking with high confidence, you may see:
   - A **pending** appointment in the DB.
   - A **Stripe payment link** in the reply (if fee + Stripe are configured).

---

## 8. What “success” looks like

| Check | Success signal |
|--------|----------------|
| Webhook verify | Meta shows verified; curl challenge returns echo string |
| Inbound message | `POST /whatsapp/webhook` returns `status: ok`; no 5xx in logs |
| Ollama | No connection errors in server logs; assistant text is coherent |
| Outbound reply | Customer receives WhatsApp text (Graph API 200) |
| Booking | New row in `appointments` with `pending` / `unpaid` when booking path runs |
| Pay | Stripe link opens; after test payment, webhook marks appointment paid (if `appointmentId` metadata path is used) |

---

## 9. Common issues

| Symptom | Things to verify |
|---------|------------------|
| Meta verify fails | Public HTTPS, path `/whatsapp/webhook`, token match, firewall |
| 403 on verify | `WHATSAPP_VERIFY_TOKEN` mismatch |
| No account / no reply | `phone_number_id` in DB **equals** Meta payload; access token not expired |
| Ollama errors | `ollama list` shows model name; `OLLAMA_MODEL` matches; service running |
| Stripe on startup | All Stripe + `FRONTEND_BASE_URL` env vars set |
| Booking never triggers | Persona **services** JSON and user message clear enough; model confidence threshold in code |
| Duplicate appointments | Use one clear booking per test thread; check Stripe webhook only fires once |

---

## 10. Optional: scripted smoke (local)

If `jq` is installed:

```bash
export WHATSAPP_VERIFY_TOKEN='...'
export WHATSAPP_PHONE_NUMBER_ID='...'
export PILLSURE_API_BASE='http://localhost:7154'
bash server/scripts/test-whatsapp-flow.sh
```

The script lives at `server/scripts/test-whatsapp-flow.sh` (executable). If you prefer not to use `jq`, use the raw `curl` JSON in section 6.2.

---

## 11. Roles for testers

| Role | Typical tasks |
|------|----------------|
| **Backend** | Env, DB, migrations, API logs, Ollama, Stripe webhooks |
| **Meta admin** | App, tokens, webhook URL, phone number ID |
| **Clinic user** | PillSure WhatsApp + persona settings |
| **QA** | Section 6–7 scenarios, regression on debounce and booking |

---

*Document version: aligned with PillSure monorepo WhatsApp integration (`/whatsapp/webhook`, `/api/settings/whatsapp`, `/api/chatbot/persona`).*
