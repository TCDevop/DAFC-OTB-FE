#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════════
# Frontend Performance Testing — Lighthouse CI
# DAFC OTB Platform — Measures Core Web Vitals, Performance, Accessibility
#
# Prerequisites:
#   npm install -g lighthouse
#
# Usage: ./frontend-perf.sh [URL] [--mobile]
# ═══════════════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORT_DIR="$SCRIPT_DIR/../reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

mkdir -p "$REPORT_DIR/lighthouse"

# Default URL
BASE_URL="${1:-http://localhost:3000}"
DEVICE="desktop"

if [[ "$2" == "--mobile" ]]; then
    DEVICE="mobile"
fi

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  DAFC OTB — Frontend Performance Testing (Lighthouse)${NC}"
echo -e "${BLUE}  URL: ${BASE_URL}${NC}"
echo -e "${BLUE}  Device: ${DEVICE}${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Check if lighthouse is installed
if ! command -v lighthouse &> /dev/null; then
    echo -e "${RED}Error: lighthouse is not installed${NC}"
    echo "Install with: npm install -g lighthouse"
    exit 1
fi

# ─── Pages to Test (matching actual Next.js routes) ───────────────────────────

PAGES=(
    "/"
    "/login"
    "/budget-management"
    "/planning"
    "/proposal"
    "/approvals"
    "/otb-analysis"
    "/import-data"
    "/settings"
)

# ─── Run Lighthouse for Each Page ─────────────────────────────────────────────

RESULTS=()

for PAGE in "${PAGES[@]}"; do
    URL="${BASE_URL}${PAGE}"
    SAFE_NAME=$(echo "$PAGE" | tr '/' '_' | sed 's/^_//')

    if [[ -z "$SAFE_NAME" ]]; then
        SAFE_NAME="home"
    fi

    echo -e "${YELLOW}▸ Testing: ${PAGE}${NC}"

    # Run Lighthouse
    REPORT_FILE="$REPORT_DIR/lighthouse/${SAFE_NAME}_${TIMESTAMP}"

    if [[ "$DEVICE" == "mobile" ]]; then
        lighthouse "$URL" \
            --output=json,html \
            --output-path="$REPORT_FILE" \
            --chrome-flags="--headless --no-sandbox" \
            --preset=perf \
            --form-factor=mobile \
            --screenEmulation.mobile \
            --quiet 2>/dev/null || true
    else
        lighthouse "$URL" \
            --output=json,html \
            --output-path="$REPORT_FILE" \
            --chrome-flags="--headless --no-sandbox" \
            --preset=perf \
            --form-factor=desktop \
            --screenEmulation.width=1920 \
            --screenEmulation.height=1080 \
            --quiet 2>/dev/null || true
    fi

    # Extract scores from JSON
    if [[ -f "${REPORT_FILE}.report.json" ]]; then
        PERF=$(cat "${REPORT_FILE}.report.json" | jq -r '.categories.performance.score * 100 | floor')
        A11Y=$(cat "${REPORT_FILE}.report.json" | jq -r '.categories.accessibility.score * 100 | floor')
        BP=$(cat "${REPORT_FILE}.report.json" | jq -r '.categories["best-practices"].score * 100 | floor')
        SEO=$(cat "${REPORT_FILE}.report.json" | jq -r '.categories.seo.score * 100 | floor')

        # Core Web Vitals
        FCP=$(cat "${REPORT_FILE}.report.json" | jq -r '.audits["first-contentful-paint"].numericValue | floor')
        LCP=$(cat "${REPORT_FILE}.report.json" | jq -r '.audits["largest-contentful-paint"].numericValue | floor')
        TBT=$(cat "${REPORT_FILE}.report.json" | jq -r '.audits["total-blocking-time"].numericValue | floor')
        CLS=$(cat "${REPORT_FILE}.report.json" | jq -r '.audits["cumulative-layout-shift"].numericValue * 1000 | floor')

        echo "  ├─ Performance:    ${PERF}%"
        echo "  ├─ Accessibility:  ${A11Y}%"
        echo "  ├─ Best Practices: ${BP}%"
        echo "  ├─ SEO:            ${SEO}%"
        echo "  ├─ FCP:            ${FCP}ms"
        echo "  ├─ LCP:            ${LCP}ms"
        echo "  ├─ TBT:            ${TBT}ms"
        echo "  └─ CLS:            0.${CLS}"

        RESULTS+=("{\"page\":\"${PAGE}\",\"performance\":${PERF},\"accessibility\":${A11Y},\"bestPractices\":${BP},\"seo\":${SEO},\"fcp\":${FCP},\"lcp\":${LCP},\"tbt\":${TBT},\"cls\":${CLS}}")
    else
        echo -e "  └─ ${RED}Failed to run Lighthouse${NC}"
        RESULTS+=("{\"page\":\"${PAGE}\",\"error\":\"Failed\"}")
    fi

    echo ""
done

# ─── Generate Summary Report ──────────────────────────────────────────────────

SUMMARY_FILE="$REPORT_DIR/lighthouse_summary_${TIMESTAMP}.json"

echo "{" > "$SUMMARY_FILE"
echo "  \"timestamp\": \"$(date -Iseconds)\"," >> "$SUMMARY_FILE"
echo "  \"baseUrl\": \"${BASE_URL}\"," >> "$SUMMARY_FILE"
echo "  \"device\": \"${DEVICE}\"," >> "$SUMMARY_FILE"
echo "  \"pages\": [" >> "$SUMMARY_FILE"

for i in "${!RESULTS[@]}"; do
    if [[ $i -lt $((${#RESULTS[@]} - 1)) ]]; then
        echo "    ${RESULTS[$i]}," >> "$SUMMARY_FILE"
    else
        echo "    ${RESULTS[$i]}" >> "$SUMMARY_FILE"
    fi
done

echo "  ]" >> "$SUMMARY_FILE"
echo "}" >> "$SUMMARY_FILE"

echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Summary saved: ${SUMMARY_FILE}${NC}"
echo -e "${GREEN}  HTML reports: ${REPORT_DIR}/lighthouse/${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"

# ─── Print Summary Table ──────────────────────────────────────────────────────

echo ""
echo "Performance Summary:"
echo "────────────────────────────────────────────────────────────"
printf "%-20s %10s %10s %10s %10s\n" "Page" "Perf" "A11y" "BP" "SEO"
echo "────────────────────────────────────────────────────────────"

for result in "${RESULTS[@]}"; do
    PAGE=$(echo "$result" | jq -r '.page')
    PERF=$(echo "$result" | jq -r '.performance // "N/A"')
    A11Y=$(echo "$result" | jq -r '.accessibility // "N/A"')
    BP=$(echo "$result" | jq -r '.bestPractices // "N/A"')
    SEO=$(echo "$result" | jq -r '.seo // "N/A"')
    printf "%-20s %10s %10s %10s %10s\n" "$PAGE" "$PERF" "$A11Y" "$BP" "$SEO"
done

echo "────────────────────────────────────────────────────────────"
