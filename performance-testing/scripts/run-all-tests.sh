#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════════
# Master Performance Test Runner
# DAFC OTB Platform — Runs all performance tests and generates report
#
# Usage: ./run-all-tests.sh [--backend-url URL] [--frontend-url URL]
#
# Prerequisites:
#   - Node.js 20+
#   - k6 (brew install k6)
#   - lighthouse (npm install -g lighthouse)
#   - jq (brew install jq)
# ═══════════════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORT_DIR="$SCRIPT_DIR/../reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Default URLs
BACKEND_URL="${BACKEND_URL:-http://localhost:4000}"
FRONTEND_URL="${FRONTEND_URL:-http://localhost:3000}"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --backend-url)
            BACKEND_URL="$2"
            shift 2
            ;;
        --frontend-url)
            FRONTEND_URL="$2"
            shift 2
            ;;
        *)
            shift
            ;;
    esac
done

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

mkdir -p "$REPORT_DIR"

# ─── Header ───────────────────────────────────────────────────────────────────

clear
echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════════════════╗"
echo "║                                                                           ║"
echo "║     ██████╗  █████╗ ███████╗ ██████╗     ██████╗ ████████╗██████╗         ║"
echo "║     ██╔══██╗██╔══██╗██╔════╝██╔════╝    ██╔═══██╗╚══██╔══╝██╔══██╗        ║"
echo "║     ██║  ██║███████║█████╗  ██║         ██║   ██║   ██║   ██████╔╝        ║"
echo "║     ██║  ██║██╔══██║██╔══╝  ██║         ██║   ██║   ██║   ██╔══██╗        ║"
echo "║     ██████╔╝██║  ██║██║     ╚██████╗    ╚██████╔╝   ██║   ██████╔╝        ║"
echo "║     ╚═════╝ ╚═╝  ╚═╝╚═╝      ╚═════╝     ╚═════╝    ╚═╝   ╚═════╝         ║"
echo "║                                                                           ║"
echo "║                    Performance Testing Suite                              ║"
echo "║                                                                           ║"
echo "╚═══════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "  ${BLUE}Backend URL:${NC}  $BACKEND_URL"
echo -e "  ${BLUE}Frontend URL:${NC} $FRONTEND_URL"
echo -e "  ${BLUE}Report Dir:${NC}   $REPORT_DIR"
echo -e "  ${BLUE}Timestamp:${NC}    $TIMESTAMP"
echo ""

# ─── Check Prerequisites ──────────────────────────────────────────────────────

echo -e "${YELLOW}▸ Checking prerequisites...${NC}"

MISSING_DEPS=()

if ! command -v k6 &> /dev/null; then
    MISSING_DEPS+=("k6")
fi

if ! command -v lighthouse &> /dev/null; then
    MISSING_DEPS+=("lighthouse")
fi

if ! command -v jq &> /dev/null; then
    MISSING_DEPS+=("jq")
fi

if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
    echo -e "${RED}  Missing dependencies: ${MISSING_DEPS[*]}${NC}"
    echo ""
    echo "  Install with:"
    echo "    brew install k6 jq"
    echo "    npm install -g lighthouse"
    echo ""
    echo -e "${YELLOW}  Continue without missing tools? (y/n)${NC}"
    read -r answer
    if [[ "$answer" != "y" ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}  ✓ Prerequisites checked${NC}"
echo ""

# ─── Test 1: Build Metrics ────────────────────────────────────────────────────

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  TEST 1: Build Metrics${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

if [[ -f "$SCRIPT_DIR/build-metrics.sh" ]]; then
    chmod +x "$SCRIPT_DIR/build-metrics.sh"
    "$SCRIPT_DIR/build-metrics.sh" all || echo -e "${RED}  Build metrics failed${NC}"
else
    echo -e "${YELLOW}  Skipping: build-metrics.sh not found${NC}"
fi

echo ""

# ─── Test 2: API Load Test ────────────────────────────────────────────────────

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  TEST 2: API Load Test (k6)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

if command -v k6 &> /dev/null; then
    echo -e "${YELLOW}  Running k6 load test (5 minutes)...${NC}"
    echo ""

    cd "$SCRIPT_DIR"
    k6 run \
        --env API_URL="$BACKEND_URL" \
        --out json="$REPORT_DIR/k6_results_$TIMESTAMP.json" \
        api-load-test.js 2>&1 || echo -e "${RED}  k6 test failed${NC}"
else
    echo -e "${YELLOW}  Skipping: k6 not installed${NC}"
fi

echo ""

# ─── Test 3: Frontend Performance ─────────────────────────────────────────────

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  TEST 3: Frontend Performance (Lighthouse)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

if command -v lighthouse &> /dev/null; then
    chmod +x "$SCRIPT_DIR/frontend-perf.sh"
    "$SCRIPT_DIR/frontend-perf.sh" "$FRONTEND_URL" || echo -e "${RED}  Lighthouse test failed${NC}"
else
    echo -e "${YELLOW}  Skipping: lighthouse not installed${NC}"
fi

echo ""

# ─── Test 4: Database Performance ─────────────────────────────────────────────

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  TEST 4: Database Query Performance${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

if [[ -f "$SCRIPT_DIR/db-perf-test.ts" ]]; then
    echo -e "${YELLOW}  Running database performance tests...${NC}"
    echo ""

    BACKEND_DIR="$SCRIPT_DIR/../../backend"
    if [[ -f "$BACKEND_DIR/package.json" ]]; then
        cd "$BACKEND_DIR"
        npx ts-node "$SCRIPT_DIR/db-perf-test.ts" || echo -e "${RED}  DB perf test failed${NC}"
        cd "$SCRIPT_DIR"
    else
        echo -e "${YELLOW}  Skipping: backend/package.json not found${NC}"
    fi
else
    echo -e "${YELLOW}  Skipping: db-perf-test.ts not found${NC}"
fi

echo ""

# ─── Test 5: Memory Usage ─────────────────────────────────────────────────────

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  TEST 5: Memory Usage Snapshot${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# Check if backend is running
if curl -s "$BACKEND_URL/api/v1/auth/login" > /dev/null 2>&1; then
    echo -e "${YELLOW}  Collecting memory metrics from running backend...${NC}"

    # Fallback: use ps to get memory
    NODE_PID=$(pgrep -f "node.*nest" | head -1)
    if [[ -n "$NODE_PID" ]]; then
        RSS=$(ps -o rss= -p "$NODE_PID" | tr -d ' ')
        RSS_MB=$((RSS / 1024))
        echo "  Backend RSS: ${RSS_MB}MB"
        echo "{\"pid\": $NODE_PID, \"rssKB\": $RSS, \"rssMB\": $RSS_MB, \"timestamp\": \"$(date -Iseconds)\"}" > "$REPORT_DIR/memory_snapshot_$TIMESTAMP.json"
        echo -e "${GREEN}  ✓ Memory snapshot saved${NC}"
    else
        echo -e "${YELLOW}  Could not find NestJS process${NC}"
    fi
else
    echo -e "${YELLOW}  Backend not running, skipping memory test${NC}"
fi

echo ""

# ─── Generate Summary Report ──────────────────────────────────────────────────

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  GENERATING SUMMARY REPORT${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

SUMMARY_FILE="$REPORT_DIR/PERFORMANCE_SUMMARY_$TIMESTAMP.md"

cat << EOF > "$SUMMARY_FILE"
# DAFC OTB — Performance Test Summary

**Date:** $(date +"%Y-%m-%d %H:%M:%S")
**Backend URL:** $BACKEND_URL
**Frontend URL:** $FRONTEND_URL

---

## Test Results

### 1. Build Metrics
EOF

if [[ -f "$REPORT_DIR/build_metrics_$TIMESTAMP.json" ]]; then
    echo '```json' >> "$SUMMARY_FILE"
    cat "$REPORT_DIR/build_metrics_$TIMESTAMP.json" >> "$SUMMARY_FILE"
    echo '```' >> "$SUMMARY_FILE"
else
    echo "Not available" >> "$SUMMARY_FILE"
fi

cat << EOF >> "$SUMMARY_FILE"

### 2. API Load Test
EOF

if [[ -f "$REPORT_DIR/api_load_test.json" ]]; then
    echo '```json' >> "$SUMMARY_FILE"
    cat "$REPORT_DIR/api_load_test.json" >> "$SUMMARY_FILE"
    echo '```' >> "$SUMMARY_FILE"
else
    echo "Not available" >> "$SUMMARY_FILE"
fi

cat << EOF >> "$SUMMARY_FILE"

### 3. Frontend Performance (Lighthouse)
EOF

LIGHTHOUSE_SUMMARY=$(ls "$REPORT_DIR"/lighthouse_summary_*.json 2>/dev/null | tail -1)
if [[ -n "$LIGHTHOUSE_SUMMARY" ]]; then
    echo '```json' >> "$SUMMARY_FILE"
    cat "$LIGHTHOUSE_SUMMARY" >> "$SUMMARY_FILE"
    echo '```' >> "$SUMMARY_FILE"
else
    echo "Not available" >> "$SUMMARY_FILE"
fi

cat << EOF >> "$SUMMARY_FILE"

### 4. Database Performance
EOF

if [[ -f "$REPORT_DIR/db_perf_test.json" ]]; then
    echo '```json' >> "$SUMMARY_FILE"
    cat "$REPORT_DIR/db_perf_test.json" >> "$SUMMARY_FILE"
    echo '```' >> "$SUMMARY_FILE"
else
    echo "Not available" >> "$SUMMARY_FILE"
fi

cat << EOF >> "$SUMMARY_FILE"

---

## Files Generated

EOF

ls -la "$REPORT_DIR"/*$TIMESTAMP* 2>/dev/null >> "$SUMMARY_FILE" || echo "No files generated" >> "$SUMMARY_FILE"

echo -e "${GREEN}  ✓ Summary saved: $SUMMARY_FILE${NC}"
echo ""

# ─── Final Report ─────────────────────────────────────────────────────────────

echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════════════════════╗"
echo "║                        PERFORMANCE TESTING COMPLETE                       ║"
echo "╚═══════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""
echo -e "  ${GREEN}Reports saved to:${NC} $REPORT_DIR"
echo ""
echo "  Files generated:"
ls -1 "$REPORT_DIR"/*$TIMESTAMP* 2>/dev/null | while read f; do
    echo "    - $(basename "$f")"
done
echo ""
echo -e "  ${BLUE}Summary Report:${NC} $SUMMARY_FILE"
echo ""
