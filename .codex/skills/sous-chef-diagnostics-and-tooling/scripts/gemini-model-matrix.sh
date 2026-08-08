#!/usr/bin/env bash
# gemini-model-matrix.sh — probe a LIST of candidate Gemini models with one
# cheap generateContent request each and print a health table.
#
# This is the exact experiment that ended the 2026-06 quota goose-chase:
# a single-model 429 looked like "we are rate limited", but probing a matrix
# of models showed one model quota-zeroed (limit 0, permanent) while others
# were healthy — so the fix was switching models, not waiting or retrying.
# When one model misbehaves, ALWAYS probe the matrix before concluding
# anything about the key or the account.
#
# Usage:
#   GEMINI_API_KEY=<key> ./gemini-model-matrix.sh                # default candidates
#   GEMINI_API_KEY=<key> ./gemini-model-matrix.sh model-a model-b ...
#
#   API key comes ONLY from the GEMINI_API_KEY env var (models are the
#   positional args here). NEVER hardcode a key.
#
# Dependencies: bash, curl, python3.
#
# Exit codes: 0 = at least one model healthy; 1 = none healthy; 2 = no key.

set -euo pipefail

API_KEY="${GEMINI_API_KEY:-}"
if [[ -z "$API_KEY" ]]; then
  echo "ERROR: set GEMINI_API_KEY. (Models go in positional args, key does not.)" >&2
  exit 2
fi

# Default candidate set: the app's pinned model first, then plausible
# alternatives. Adjust freely via args — model names churn; verify with
# gemini-list-models.sh when in doubt.
if [[ $# -gt 0 ]]; then
  MODELS=("$@")
else
  MODELS=(
    "gemini-2.5-flash"
    "gemini-2.5-flash-lite"
    "gemini-2.5-pro"
    "gemini-2.0-flash"
    "gemini-2.0-flash-lite"
  )
fi

BODY='{"contents":[{"role":"user","parts":[{"text":"Return exactly {\"ok\": true} and nothing else."}]}]}'

RESPONSE_FILE="$(mktemp)"
RESULTS_FILE="$(mktemp)"
trap 'rm -f "$RESPONSE_FILE" "$RESULTS_FILE"' EXIT

for MODEL in "${MODELS[@]}"; do
  URL="https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent"
  STATUS="$(curl -sS -o "$RESPONSE_FILE" -w '%{http_code}' \
    -X POST "$URL" \
    -H 'Content-Type: application/json' \
    -H "x-goog-api-key: ${API_KEY}" \
    --data "$BODY" \
    --max-time 60 || echo "000")"

  python3 - "$MODEL" "$STATUS" "$RESPONSE_FILE" >> "$RESULTS_FILE" <<'PY'
import json, re, sys

model, status = sys.argv[1], sys.argv[2]
try:
    with open(sys.argv[3]) as f:
        raw = f.read()
    body = json.loads(raw) if raw.strip() else {}
except Exception:
    body = {}

err = body.get("error", {}) if isinstance(body, dict) else {}
message = err.get("message", "") or ""
details = err.get("details", []) or []
text = json.dumps(body)


def quota_zeroed() -> bool:
    for d in details:
        if "QuotaFailure" in str(d.get("@type", "")):
            for v in d.get("violations", []):
                if str(v.get("quotaValue", "")) == "0":
                    return True
    return bool(re.search(r"limit:\s*0\b", message))


if status == "200":
    verdict = "HEALTHY"
elif status == "400" and ("API_KEY_INVALID" in text or "API key not valid" in message):
    verdict = "BAD KEY (affects every row)"
elif status == "400":
    verdict = "BAD REQUEST (probe bug?)"
elif status == "403":
    verdict = "NO/UNPERMITTED KEY"
elif status == "404":
    verdict = "MODEL NAME NOT FOUND"
elif status == "429" and quota_zeroed():
    verdict = "QUOTA-ZEROED (limit 0 — permanent, do NOT retry)"
elif status == "429":
    verdict = "RATE LIMITED (nonzero limit — retry works)"
elif status == "503":
    verdict = "OVERLOADED (transient — retry works)"
elif status == "000":
    verdict = "TRANSPORT FAILURE (no HTTP response)"
else:
    verdict = "UNCLASSIFIED — probe individually for the raw body"

print(f"{model}\t{status}\t{verdict}")
PY
done

echo
printf '%-28s %-6s %s\n' "MODEL" "HTTP" "VERDICT"
printf '%-28s %-6s %s\n' "-----" "----" "-------"
while IFS=$'\t' read -r model status verdict; do
  printf '%-28s %-6s %s\n' "$model" "$status" "$verdict"
done < "$RESULTS_FILE"
echo
echo "For any non-HEALTHY row, run gemini-probe.sh <model> to see the full raw"
echo "error body before drawing conclusions. The table is triage, not evidence."

if grep -q $'\t200\t' "$RESULTS_FILE"; then
  exit 0
fi
exit 1
