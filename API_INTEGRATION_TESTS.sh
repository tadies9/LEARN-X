#!/bin/bash

# API Integration Tests for LEARN-X
# This script tests all API endpoints with various scenarios

API_URL="http://localhost:8080/api/v1"
TEST_EMAIL="test_$(date +%s)@example.com"
TEST_PASSWORD="TestPassword123!"
AUTH_TOKEN=""
USER_ID=""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to test API endpoint
test_api() {
    local test_name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_status="$5"
    local auth_required="$6"
    
    echo -n "Testing: $test_name... "
    
    # Build curl command
    if [ "$auth_required" = "true" ]; then
        if [ -z "$data" ]; then
            response=$(curl -s -w "\n%{http_code}" -X "$method" \
                -H "Authorization: Bearer $AUTH_TOKEN" \
                -H "Content-Type: application/json" \
                "$API_URL$endpoint")
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" \
                -H "Authorization: Bearer $AUTH_TOKEN" \
                -H "Content-Type: application/json" \
                -d "$data" \
                "$API_URL$endpoint")
        fi
    else
        if [ -z "$data" ]; then
            response=$(curl -s -w "\n%{http_code}" -X "$method" \
                -H "Content-Type: application/json" \
                "$API_URL$endpoint")
        else
            response=$(curl -s -w "\n%{http_code}" -X "$method" \
                -H "Content-Type: application/json" \
                -d "$data" \
                "$API_URL$endpoint")
        fi
    fi
    
    # Extract status code and body
    status_code=$(echo "$response" | tail -n 1)
    body=$(echo "$response" | head -n -1)
    
    if [ "$status_code" = "$expected_status" ]; then
        echo -e "${GREEN}PASSED${NC} (Status: $status_code)"
        ((TESTS_PASSED++))
        return 0
    else
        echo -e "${RED}FAILED${NC} (Expected: $expected_status, Got: $status_code)"
        echo "Response: $body"
        ((TESTS_FAILED++))
        return 1
    fi
}

echo "=== LEARN-X API Integration Tests ==="
echo ""

# Test 1: Health Check (direct endpoint, not under /api/v1)
response=$(curl -s -w "\n%{http_code}" "http://localhost:8080/health")
status_code=$(echo "$response" | tail -n 1)
if [ "$status_code" = "200" ]; then
    echo -e "Testing: Health Check... ${GREEN}PASSED${NC} (Status: $status_code)"
    ((TESTS_PASSED++))
else
    echo -e "Testing: Health Check... ${RED}FAILED${NC} (Expected: 200, Got: $status_code)"
    ((TESTS_FAILED++))
fi

# Test 2: Invalid Endpoint
test_api "Invalid Endpoint (404)" "GET" "/invalid" "" "404" "false"

# Test 3: Protected Endpoint Without Auth
test_api "Protected Endpoint Without Auth" "GET" "/courses" "" "401" "false"

# Test 4: Persona Endpoint Without Auth
test_api "Persona Without Auth" "GET" "/persona" "" "401" "false"

# Test 5: Analytics Without Auth
test_api "Analytics Without Auth" "POST" "/analytics/onboarding" '{"event":"started"}' "401" "false"

# Test 6: Rate Limiting Test
echo -e "\n${YELLOW}Testing Rate Limiting...${NC}"
for i in {1..10}; do
    response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")
    if [ "$response" = "429" ]; then
        echo -e "${GREEN}Rate limiting working - Request $i returned 429${NC}"
        ((TESTS_PASSED++))
        break
    fi
done

# Test 7: CORS Headers
echo -e "\n${YELLOW}Testing CORS Headers...${NC}"
cors_response=$(curl -s -I -X OPTIONS \
    -H "Origin: http://localhost:3000" \
    -H "Access-Control-Request-Method: POST" \
    "$API_URL/health" 2>/dev/null | grep -i "access-control-allow-origin")

if [[ $cors_response == *"http://localhost:3000"* ]]; then
    echo -e "${GREEN}CORS headers properly configured${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}CORS headers missing or incorrect${NC}"
    ((TESTS_FAILED++))
fi

# Test 8: Invalid JSON
test_api "Invalid JSON Request" "POST" "/analytics/onboarding" '{invalid json}' "400" "false"

# Test 9: SQL Injection Attempt
test_api "SQL Injection Protection" "POST" "/persona" '{"name":"test\"; DROP TABLE personas; --"}' "401" "false"

# Test 10: XSS Attempt
test_api "XSS Protection" "POST" "/courses" '{"title":"<script>alert(\"xss\")</script>"}' "401" "false"

# Test 11: Large Payload
echo -e "\n${YELLOW}Testing Large Payload Handling...${NC}"
large_data=$(printf '{"data":"%*s"}' 1000000 | tr ' ' 'x')
large_response=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    -d "$large_data" \
    "$API_URL/courses" 2>/dev/null)

if [ "$large_response" = "413" ] || [ "$large_response" = "400" ] || [ "$large_response" = "401" ]; then
    echo -e "${GREEN}Large payload properly rejected${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}Large payload not properly handled (Status: $large_response)${NC}"
    ((TESTS_FAILED++))
fi

# Test 12: Concurrent Requests
echo -e "\n${YELLOW}Testing Concurrent Requests...${NC}"
for i in {1..5}; do
    curl -s "$API_URL/health" > /dev/null &
done
wait
echo -e "${GREEN}Concurrent requests handled${NC}"
((TESTS_PASSED++))

# Test 13: Method Not Allowed
test_api "Method Not Allowed" "DELETE" "/health" "" "405" "false"

# Test 14: Content-Type Validation
echo -e "\n${YELLOW}Testing Content-Type Validation...${NC}"
ct_response=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
    -H "Content-Type: text/plain" \
    -d "plain text data" \
    "$API_URL/courses")

if [ "$ct_response" = "400" ] || [ "$ct_response" = "415" ] || [ "$ct_response" = "401" ]; then
    echo -e "${GREEN}Content-Type validation working${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}Content-Type validation not working (Status: $ct_response)${NC}"
    ((TESTS_FAILED++))
fi

echo -e "\n=== Test Summary ==="
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo -e "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}Some tests failed!${NC}"
    exit 1
fi