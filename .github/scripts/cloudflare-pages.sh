#!/usr/bin/env bash
# Idempotent Cloudflare setup for the Pages site.
#
#   cloudflare-pages.sh project   Ensure the Pages project exists.
#   cloudflare-pages.sh domain    Attach the custom domain and point its DNS record at the project.
#
# Required env: CLOUDFLARE_API_TOKEN, CLOUDFLARE_ACCOUNT_ID, PROJECT_NAME
# Required env for `domain`: CUSTOM_DOMAIN, ZONE_NAME
# Optional env: PRODUCTION_BRANCH (default: main)
set -euo pipefail

API="https://api.cloudflare.com/client/v4"
: "${CLOUDFLARE_API_TOKEN:?}" "${CLOUDFLARE_ACCOUNT_ID:?}" "${PROJECT_NAME:?}"
PROJECT_URL="$API/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects/$PROJECT_NAME"

# cf METHOD URL [JSON_BODY] - prints the response body, fails on API errors.
cf() {
  local method=$1 url=$2 body=${3:-}
  local args=(-sS -X "$method" -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json")
  [[ -n $body ]] && args+=(--data "$body")
  local response
  response=$(curl "${args[@]}" "$url")
  if [[ $(jq -r '.success' <<<"$response") != "true" ]]; then
    echo "Cloudflare API $method $url failed:" >&2
    jq -c '.errors' <<<"$response" >&2 || echo "$response" >&2
    return 1
  fi
  echo "$response"
}

project_exists() {
  local status
  status=$(curl -sS -o /dev/null -w '%{http_code}' -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "$PROJECT_URL")
  case $status in
    200) return 0 ;;
    404) return 1 ;;
    *) echo "Unexpected HTTP $status looking up Pages project $PROJECT_NAME" >&2; exit 1 ;;
  esac
}

ensure_project() {
  if project_exists; then
    echo "Pages project $PROJECT_NAME already exists"
  else
    echo "Creating Pages project $PROJECT_NAME"
    cf POST "$API/accounts/$CLOUDFLARE_ACCOUNT_ID/pages/projects" \
      "$(jq -n --arg name "$PROJECT_NAME" --arg branch "${PRODUCTION_BRANCH:-main}" \
        '{name: $name, production_branch: $branch}')" >/dev/null
  fi
}

ensure_domain() {
  : "${CUSTOM_DOMAIN:?}" "${ZONE_NAME:?}"

  # The pages.dev hostname can differ from the project name if that subdomain was taken.
  local target
  target=$(cf GET "$PROJECT_URL" | jq -r '.result.subdomain')
  echo "Project serves at $target"

  if cf GET "$PROJECT_URL/domains" | jq -e --arg d "$CUSTOM_DOMAIN" '.result[] | select(.name == $d)' >/dev/null; then
    echo "Custom domain $CUSTOM_DOMAIN already attached"
  else
    echo "Attaching custom domain $CUSTOM_DOMAIN"
    cf POST "$PROJECT_URL/domains" "$(jq -n --arg d "$CUSTOM_DOMAIN" '{name: $d}')" >/dev/null
  fi

  local zone_id
  zone_id=$(cf GET "$API/zones?name=$ZONE_NAME" | jq -r '.result[0].id // empty')
  [[ -n $zone_id ]] || { echo "Zone $ZONE_NAME not found for this token" >&2; exit 1; }

  local record desired existing
  desired=$(jq -n --arg name "$CUSTOM_DOMAIN" --arg target "$target" \
    '{type: "CNAME", name: $name, content: $target, proxied: true, ttl: 1, comment: "Cloudflare Pages - managed by GitHub Actions"}')
  # Any A/AAAA/CNAME at this name (e.g. the old host's record) conflicts with the Pages CNAME.
  existing=$(cf GET "$API/zones/$zone_id/dns_records?name=$CUSTOM_DOMAIN&per_page=100" |
    jq -c '[.result[] | select(.type == "A" or .type == "AAAA" or .type == "CNAME")]')

  if jq -e --arg t "$target" 'length == 1 and .[0].type == "CNAME" and .[0].content == $t and .[0].proxied' <<<"$existing" >/dev/null; then
    echo "DNS record $CUSTOM_DOMAIN -> $target already correct"
    return
  fi

  for record in $(jq -r '.[].id' <<<"$existing"); do
    echo "Removing old DNS record $record"
    cf DELETE "$API/zones/$zone_id/dns_records/$record" >/dev/null
  done
  echo "Creating DNS record $CUSTOM_DOMAIN CNAME $target (proxied)"
  cf POST "$API/zones/$zone_id/dns_records" "$desired" >/dev/null
}

case ${1:-} in
  project) ensure_project ;;
  domain) ensure_domain ;;
  *) echo "usage: $0 project|domain" >&2; exit 2 ;;
esac
