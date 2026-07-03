#!/usr/bin/env bash
# gemini-probe.sh — probe ONE Gemini model with one cheap generateContent call
# and print the FULL raw error body plus an interpretation footer.
#
# This is the ground-truth tool for any "is the LLM broken?" question.
# The app truncates Gemini errors to bare status codes ("Gemini request
# failed: 429"), which is how a quota-zeroed model was once misdiagnosed as
# an ordinary rate limit. The raw body always disambiguates.
#
# Usage:
#   GEMINI_API_KEY=<key> ./gemini-probe.sh [MODEL]
#   ./gemini-probe.sh [MODEL] [API_KEY]
#
#   MODEL    optional, defaults to gemini-2.5-flash (the app's DEFAULT_MODEL
#            in src/models/api/llm/google.ts)
#   API_KEY  2nd positional arg, or GEMINI_API_KEY env var.
#            NEVER hardcode a key in this file or in a command committed to
#            the repo. Prefer the env var: positional args are visible in
#            shell history and `ps`.
#
# Dependencies: bash, curl, python3. Nothing else.
#
# Exit codes: 0 = probe ran and model is healthy (HTTP 200)
#             1 = probe ran, model or key is NOT healthy (see footer)
#             2 = no API key supplied
#             3 = curl transport failure (no HTTP response at all)

set -euo pipefail

MODEL="${1:-gemini-2.5-flash}"
API_KEY="${2:-${GEMINI_API_KEY:-}}"

if [[ -z "$API_KEY" ]]; then
  echo "ERROR: no API key. Set GEMINI_API_KEY or pass it as the 2nd argument." >&2
  exit 2
fi

URL="https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent"
# Cheapest possible request: tiny prompt, no system instruction.
BODY='{"contents":[{"role":"user","parts":[{"text":"Return exactly {\"ok\": true} and nothing else."}]}]}'

RESPONSE_FILE="$(mktemp)"
trap 'rm -f "$RESPONSE_FILE"' EXIT

# Key goes in a header, not the URL, so it never appears in error output.
HTTP_STATUS="$(curl -sS -o "$RESPONSE_FILE" -w '%{http_code}' \
  -X POST "$URL" \
  -H 'Content-Type: application/json' \
  -H "x-goog-api-key: ${API_KEY}" \
  --data "$BODY" \
  --max-time 60)" || {
    echo "curl transport failure (DNS/TLS/proxy/network) — no HTTP response received." >&2
    exit 3
  }

echo "== Model:  ${MODEL}"
echo "== Status: ${HTTP_STATUS}"
echo "== Full raw response body (pretty-printed) =="
python3 -m json.tool "$RESPONSE_FILE" 2>/dev/null || cat "$RESPONSE_FILE"
echo

python3 - "$HTTP_STATUS" "$RESPONSE_FILE" <<'PY'
import json, re, sys

status = sys.argv[1]
try:
    with open(sys.argv[2]) as f:
        raw = f.read()
    body = json.loads(raw) if raw.strip() else {}
except Exception:
    raw, body = "", {}

err = body.get("error", {}) if isinstance(body, dict) else {}
message = err.get("message", "") or ""
details = err.get("details", []) or []
text = json.dumps(body)


def quota_zeroed() -> bool:
    """True when a QuotaFailure violation reports a limit of 0 for this model."""
    for d in details:
        if "QuotaFailure" in str(d.get("@type", "")):
            for v in d.get("violations", []):
                if str(v.get("quotaValue", "")) == "0":
                    return True
    # Fallback: some responses only carry the limit in the message text.
    return bool(re.search(r"limit:\s*0\b", message))


def retry_delay():
    for d in details:
        if "RetryInfo" in str(d.get("@type", "")):
            return d.get("retryDelay")
    return None


print("== Interpretation ==")
healthy = False
if status == "200":
    healthy = True
    print("200 HEALTHY — key and model both work. If the app still fails,")
    print("the problem is app-side (key resolution, parsing, queue), not the provider.")
elif status == "400" and ("API_KEY_INVALID" in text or "API key not valid" in message):
    print("400 API_KEY_INVALID — the key is bad, rotated, or restricted.")
    print("Note: Gemini returns 400 (not 401) for a bad key. Fix the key;")
    print("the model is fine. In the app this key comes from Settings")
    print("(AsyncStorage app_settings.geminiApiKey) or, dev-only, .env.")
elif status == "400":
    print("400 BAD REQUEST (not a key problem) — malformed request body or")
    print("unknown field. Read the message above; likely a probe/script bug.")
elif status == "403":
    print("403 — no API key reached the API at all (missing/empty key), or")
    print("this key is not permitted to use the Generative Language API.")
elif status == "404":
    print("404 — this model name does not exist for this API version/key.")
    print("Run gemini-list-models.sh to see what the key can actually access.")
elif status == "429" and quota_zeroed():
    print("429 QUOTA-ZEROED — a quota violation reports limit 0: this MODEL has")
    print("ZERO free-tier allocation for this key. This is PERMANENT for the")
    print("model+tier; retrying can never succeed. Switch models (probe")
    print("candidates with gemini-model-matrix.sh) or enable billing.")
elif status == "429":
    print("429 ORDINARY RATE LIMIT — nonzero limits exceeded (RPM/RPD).")
    delay = retry_delay()
    if delay:
        print(f"RetryInfo suggests waiting {delay}. Retrying after the delay works.")
    else:
        print("Retrying after a delay works. Check the violation details above")
        print("to see WHICH limit (per-minute vs per-day) was hit.")
elif status == "503":
    print("503 MODEL OVERLOADED — transient server-side overload. Not your key,")
    print("not your quota. Retry with backoff (the app already does: 2 retries,")
    print("1.5s/3s, in src/models/api/llm/google.ts).")
else:
    print(f"{status} — unclassified. Read the raw body above before concluding")
    print("anything. Do not guess.")

sys.exit(0 if healthy else 1)
PY
