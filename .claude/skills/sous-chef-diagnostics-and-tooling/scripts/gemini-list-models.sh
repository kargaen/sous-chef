#!/usr/bin/env bash
# gemini-list-models.sh — list the Gemini models a given API key can access,
# with their supported generation methods.
#
# Use this when a probe returns 404 (model name not found) or when choosing
# candidates for gemini-model-matrix.sh. Model names churn; this is the only
# authoritative source for "what can THIS key call TODAY".
#
# Usage:
#   GEMINI_API_KEY=<key> ./gemini-list-models.sh
#   ./gemini-list-models.sh [API_KEY]
#
#   API key: 1st positional arg, or GEMINI_API_KEY env var. NEVER hardcode.
#
# Dependencies: bash, curl, python3.
#
# Exit codes: 0 = list retrieved; 1 = API returned an error; 2 = no key;
#             3 = curl transport failure.

set -euo pipefail

API_KEY="${1:-${GEMINI_API_KEY:-}}"
if [[ -z "$API_KEY" ]]; then
  echo "ERROR: no API key. Set GEMINI_API_KEY or pass it as the 1st argument." >&2
  exit 2
fi

RESPONSE_FILE="$(mktemp)"
trap 'rm -f "$RESPONSE_FILE"' EXIT

# pageSize=1000 fetches everything in one page today; if Google ever returns
# a nextPageToken here, this script needs a pagination loop.
HTTP_STATUS="$(curl -sS -o "$RESPONSE_FILE" -w '%{http_code}' \
  -H "x-goog-api-key: ${API_KEY}" \
  --max-time 60 \
  'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000')" || {
    echo "curl transport failure (DNS/TLS/proxy/network) — no HTTP response received." >&2
    exit 3
  }

if [[ "$HTTP_STATUS" != "200" ]]; then
  echo "== Status: ${HTTP_STATUS} (error — full raw body below) =="
  python3 -m json.tool "$RESPONSE_FILE" 2>/dev/null || cat "$RESPONSE_FILE"
  exit 1
fi

python3 - "$RESPONSE_FILE" <<'PY'
import json, sys

with open(sys.argv[1]) as f:
    body = json.load(f)

models = body.get("models", [])
if body.get("nextPageToken"):
    print("WARNING: response is paginated (nextPageToken present); this list")
    print("is INCOMPLETE. Extend the script with a pagination loop.")
    print()

print(f"{len(models)} models available to this key\n")
print(f"{'MODEL':<45} {'METHODS'}")
print(f"{'-----':<45} {'-------'}")
for m in sorted(models, key=lambda m: m.get("name", "")):
    name = m.get("name", "")
    if name.startswith("models/"):
        name = name[len("models/"):]
    methods = ",".join(m.get("supportedGenerationMethods", []))
    print(f"{name:<45} {methods}")

print()
print("Only models listing generateContent are usable by the app's text path")
print("(src/models/api/llm/google.ts). Being listed does NOT guarantee free-tier")
print("quota — a listed model can still be quota-zeroed. Probe it:")
print("  gemini-probe.sh <model>")
PY
