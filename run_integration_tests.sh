#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────
# run_integration_tests.sh
# ──────────────────────────────────────────────────────────────────────────
# Orchestrates the full integration test lifecycle:
#   1. Build and start all Docker containers
#   2. Wait for health checks to pass
#   3. Run integration test suite
#   4. Tear down containers and volumes
# ──────────────────────────────────────────────────────────────────────────

set -euo pipefail

COMPOSE_FILE="docker-compose.test.yml"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  Math Topic Classifier — Integration Tests${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"

# Step 1: Build and start containers
echo -e "\n${GREEN}[1/4]${NC} Building and starting Docker containers..."
docker-compose -f "$COMPOSE_FILE" up -d --build

# Step 2: Wait for backend health check
echo -e "\n${GREEN}[2/4]${NC} Waiting for services to become healthy..."
MAX_WAIT=90
ELAPSED=0
until curl -sf http://localhost:8000/health > /dev/null 2>&1; do
    if [ $ELAPSED -ge $MAX_WAIT ]; then
        echo -e "${RED}[TIMEOUT]${NC} Backend did not become healthy within ${MAX_WAIT}s"
        docker-compose -f "$COMPOSE_FILE" logs backend
        docker-compose -f "$COMPOSE_FILE" down -v
        exit 1
    fi
    sleep 3
    ELAPSED=$((ELAPSED + 3))
    echo "  Waiting... (${ELAPSED}s)"
done
echo -e "  ${GREEN}Backend is healthy!${NC}"

# Step 3: Run integration tests
echo -e "\n${GREEN}[3/4]${NC} Running integration tests..."
if pytest tests/integration/ -v --tb=short; then
    echo -e "\n${GREEN}[PASS]${NC} All integration tests passed!"
    TEST_EXIT=0
else
    echo -e "\n${RED}[FAIL]${NC} Some integration tests failed."
    TEST_EXIT=1
fi

# Step 4: Tear down
echo -e "\n${GREEN}[4/4]${NC} Tearing down containers..."
docker-compose -f "$COMPOSE_FILE" down -v

echo -e "\n${YELLOW}═══════════════════════════════════════════════════${NC}"
if [ $TEST_EXIT -eq 0 ]; then
    echo -e "${GREEN}  RESULT: ALL TESTS PASSED${NC}"
else
    echo -e "${RED}  RESULT: TESTS FAILED${NC}"
fi
echo -e "${YELLOW}═══════════════════════════════════════════════════${NC}"

exit $TEST_EXIT
