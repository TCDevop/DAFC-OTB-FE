#!/bin/bash

# ═══════════════════════════════════════════════════════════════════════════════
# Build Performance Metrics Script
# DAFC OTB Platform — Measures build time, bundle size, dependencies
#
# Usage: ./build-metrics.sh [backend|frontend|all]
# ═══════════════════════════════════════════════════════════════════════════════

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/../.."
REPORT_DIR="$SCRIPT_DIR/../reports"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

mkdir -p "$REPORT_DIR"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# macOS-compatible directory size in bytes
dir_size_bytes() {
    du -sk "$1" 2>/dev/null | awk '{print $1 * 1024}' || echo "0"
}

dir_size_human() {
    du -sh "$1" 2>/dev/null | cut -f1 || echo "N/A"
}

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  DAFC OTB — Build Performance Metrics${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo ""

# ─── Function: Measure Backend ────────────────────────────────────────────────

measure_backend() {
    echo -e "${YELLOW}▸ Measuring Backend (NestJS)...${NC}"

    BACKEND_DIR="$PROJECT_ROOT/backend"
    if [[ ! -d "$BACKEND_DIR" ]]; then
        echo "  Backend directory not found at $BACKEND_DIR"
        return 1
    fi

    cd "$BACKEND_DIR"

    # Clean build
    rm -rf dist node_modules/.cache 2>/dev/null || true

    # Measure build time
    echo "  ├─ Build time..."
    BUILD_START=$(date +%s)
    npm run build 2>&1 > /dev/null
    BUILD_END=$(date +%s)
    BUILD_TIME=$((BUILD_END - BUILD_START))

    # Measure dist size
    DIST_SIZE=$(dir_size_human dist)
    DIST_SIZE_BYTES=$(dir_size_bytes dist)

    # Count files
    DIST_FILES=$(find dist -type f 2>/dev/null | wc -l | tr -d ' ')

    # Measure node_modules
    NODE_MODULES_SIZE=$(dir_size_human node_modules)
    NODE_MODULES_BYTES=$(dir_size_bytes node_modules)

    # Count production dependencies
    PROD_DEPS=$(npm ls --prod --depth=0 2>/dev/null | wc -l | tr -d ' ')

    # TypeScript check time
    echo "  ├─ TypeScript check..."
    TSC_START=$(date +%s)
    npx tsc --noEmit 2>&1 > /dev/null || true
    TSC_END=$(date +%s)
    TSC_TIME=$((TSC_END - TSC_START))

    echo -e "${GREEN}  └─ Backend metrics collected${NC}"

    cat << EOF

Backend Metrics:
────────────────────────────────────
Build Time:       ${BUILD_TIME}s
TypeScript Check: ${TSC_TIME}s
Dist Size:        ${DIST_SIZE} (${DIST_SIZE_BYTES} bytes)
Dist Files:       ${DIST_FILES}
node_modules:     ${NODE_MODULES_SIZE} (${NODE_MODULES_BYTES} bytes)
Dependencies:     ${PROD_DEPS} production

EOF

    cat << EOF >> "$REPORT_DIR/build_metrics_$TIMESTAMP.json"
{
  "backend": {
    "buildTime": $BUILD_TIME,
    "tscTime": $TSC_TIME,
    "distSizeBytes": $DIST_SIZE_BYTES,
    "distFiles": $DIST_FILES,
    "nodeModulesBytes": $NODE_MODULES_BYTES,
    "prodDependencies": $PROD_DEPS,
    "timestamp": "$TIMESTAMP"
  },
EOF
}

# ─── Function: Measure Frontend ───────────────────────────────────────────────

measure_frontend() {
    echo -e "${YELLOW}▸ Measuring Frontend (Next.js)...${NC}"

    cd "$PROJECT_ROOT"

    if [[ ! -f "package.json" ]]; then
        echo "  Frontend package.json not found at $PROJECT_ROOT"
        return 1
    fi

    # Clean build
    rm -rf .next node_modules/.cache 2>/dev/null || true

    # Measure build time
    echo "  ├─ Build time..."
    BUILD_START=$(date +%s)
    npm run build 2>&1 > /dev/null
    BUILD_END=$(date +%s)
    BUILD_TIME=$((BUILD_END - BUILD_START))

    # Measure .next size
    NEXT_SIZE=$(dir_size_human .next)
    NEXT_SIZE_BYTES=$(dir_size_bytes .next)

    # Standalone size (if exists)
    STANDALONE_BYTES="0"
    if [ -d ".next/standalone" ]; then
        STANDALONE_BYTES=$(dir_size_bytes .next/standalone)
    fi

    # Static assets
    STATIC_BYTES="0"
    if [ -d ".next/static" ]; then
        STATIC_BYTES=$(dir_size_bytes .next/static)
    fi

    # JS bundle analysis (approximate)
    JS_TOTAL_BYTES=$(find .next -name "*.js" -type f 2>/dev/null -exec du -ck {} + | tail -1 | awk '{print $1 * 1024}')
    JS_TOTAL_KB=$((JS_TOTAL_BYTES / 1024))

    # Count routes
    ROUTE_COUNT=$(find .next/server/app -name "page.js" 2>/dev/null | wc -l | tr -d ' ')

    # node_modules
    NODE_MODULES_SIZE=$(dir_size_human node_modules)
    NODE_MODULES_BYTES=$(dir_size_bytes node_modules)

    echo -e "${GREEN}  └─ Frontend metrics collected${NC}"

    cat << EOF

Frontend Metrics:
────────────────────────────────────
Build Time:       ${BUILD_TIME}s
.next Size:       ${NEXT_SIZE} (${NEXT_SIZE_BYTES} bytes)
Static Assets:    ${STATIC_BYTES} bytes
JS Bundle Total:  ${JS_TOTAL_KB} KB
Routes:           ${ROUTE_COUNT}
node_modules:     ${NODE_MODULES_SIZE} (${NODE_MODULES_BYTES} bytes)

EOF

    cat << EOF >> "$REPORT_DIR/build_metrics_$TIMESTAMP.json"
  "frontend": {
    "buildTime": $BUILD_TIME,
    "nextSizeBytes": $NEXT_SIZE_BYTES,
    "standaloneSizeBytes": $STANDALONE_BYTES,
    "staticSizeBytes": $STATIC_BYTES,
    "jsBundleBytes": $JS_TOTAL_BYTES,
    "routeCount": $ROUTE_COUNT,
    "nodeModulesBytes": $NODE_MODULES_BYTES,
    "timestamp": "$TIMESTAMP"
  }
}
EOF
}

# ─── Main ─────────────────────────────────────────────────────────────────────

case "${1:-all}" in
    backend)
        measure_backend
        ;;
    frontend)
        measure_frontend
        ;;
    all)
        measure_backend
        measure_frontend
        ;;
    *)
        echo "Usage: $0 [backend|frontend|all]"
        exit 1
        ;;
esac

echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Report saved: $REPORT_DIR/build_metrics_$TIMESTAMP.json${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
