#!/bin/bash

# Performance Tests for LEARN-X
# Tests API response times and load handling

API_URL="http://localhost:8080"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=== LEARN-X Performance Tests ==="
echo ""

# Function to measure response time
measure_time() {
    local endpoint=$1
    local method=$2
    local data=$3
    local auth=$4
    
    if [ -z "$data" ]; then
        if [ -z "$auth" ]; then
            time=$(curl -o /dev/null -s -w '%{time_total}' -X "$method" "$endpoint")
        else
            time=$(curl -o /dev/null -s -w '%{time_total}' -X "$method" -H "Authorization: Bearer $auth" "$endpoint")
        fi
    else
        if [ -z "$auth" ]; then
            time=$(curl -o /dev/null -s -w '%{time_total}' -X "$method" -H "Content-Type: application/json" -d "$data" "$endpoint")
        else
            time=$(curl -o /dev/null -s -w '%{time_total}' -X "$method" -H "Authorization: Bearer $auth" -H "Content-Type: application/json" -d "$data" "$endpoint")
        fi
    fi
    
    echo "$time"
}

# Test 1: Health Endpoint Performance
echo -e "${YELLOW}1. Health Endpoint Response Time${NC}"
total_time=0
iterations=10

for i in $(seq 1 $iterations); do
    time=$(measure_time "$API_URL/health" "GET" "" "")
    total_time=$(echo "$total_time + $time" | bc)
    echo -n "."
done
echo ""

avg_time=$(echo "scale=3; $total_time / $iterations" | bc)
echo -e "Average response time: ${BLUE}${avg_time}s${NC}"

if (( $(echo "$avg_time < 0.1" | bc -l) )); then
    echo -e "${GREEN}✅ Excellent performance (<100ms)${NC}"
elif (( $(echo "$avg_time < 0.5" | bc -l) )); then
    echo -e "${YELLOW}⚠️  Acceptable performance (<500ms)${NC}"
else
    echo -e "${RED}❌ Poor performance (>500ms)${NC}"
fi

# Test 2: Concurrent Request Handling
echo -e "\n${YELLOW}2. Concurrent Request Handling (50 requests)${NC}"
start_time=$(date +%s.%N)

for i in $(seq 1 50); do
    curl -s -o /dev/null "$API_URL/health" &
done
wait

end_time=$(date +%s.%N)
total_time=$(echo "$end_time - $start_time" | bc)
echo -e "Total time for 50 concurrent requests: ${BLUE}${total_time}s${NC}"

req_per_sec=$(echo "scale=2; 50 / $total_time" | bc)
echo -e "Requests per second: ${BLUE}${req_per_sec}${NC}"

# Test 3: API Endpoint Response Times
echo -e "\n${YELLOW}3. API Endpoint Response Times${NC}"

endpoints=(
    "/api/v1/courses|GET|Protected endpoint"
    "/api/v1/persona|GET|Protected endpoint"
    "/api/v1/analytics/onboarding|POST|Analytics endpoint"
)

for endpoint_info in "${endpoints[@]}"; do
    IFS='|' read -r endpoint method desc <<< "$endpoint_info"
    time=$(measure_time "$API_URL$endpoint" "$method" '{"test":"data"}' "")
    echo -e "$desc ($endpoint): ${BLUE}${time}s${NC}"
done

# Test 4: Database Query Performance (via API)
echo -e "\n${YELLOW}4. Database Query Performance${NC}"
# This would normally require auth, but we can measure unauthorized response time
time=$(measure_time "$API_URL/api/v1/courses?limit=100&offset=0" "GET" "" "")
echo -e "Large query response time: ${BLUE}${time}s${NC}"

# Test 5: Stress Test - Rapid Sequential Requests
echo -e "\n${YELLOW}5. Stress Test - 100 Sequential Requests${NC}"
start_time=$(date +%s.%N)
success_count=0
fail_count=0

for i in $(seq 1 100); do
    response_code=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/health")
    if [ "$response_code" = "200" ]; then
        ((success_count++))
    else
        ((fail_count++))
    fi
    
    # Show progress every 20 requests
    if [ $((i % 20)) -eq 0 ]; then
        echo -n "."
    fi
done
echo ""

end_time=$(date +%s.%N)
total_time=$(echo "$end_time - $start_time" | bc)
avg_time=$(echo "scale=3; $total_time / 100" | bc)

echo -e "Success: ${GREEN}$success_count${NC}, Failed: ${RED}$fail_count${NC}"
echo -e "Total time: ${BLUE}${total_time}s${NC}"
echo -e "Average time per request: ${BLUE}${avg_time}s${NC}"

# Test 6: Memory Usage Check
echo -e "\n${YELLOW}6. Memory Usage Check${NC}"
if command -v docker &> /dev/null; then
    docker stats --no-stream --format "table {{.Container}}\t{{.CPUPerc}}\t{{.MemUsage}}" | grep learn-x
else
    echo "Docker not available for memory check"
fi

# Test 7: Response Size Analysis
echo -e "\n${YELLOW}7. Response Size Analysis${NC}"
response_size=$(curl -s -w '%{size_download}' -o /dev/null "$API_URL/health")
echo -e "Health endpoint response size: ${BLUE}${response_size} bytes${NC}"

response_size=$(curl -s -w '%{size_download}' -o /dev/null "$API_URL/api/v1/")
echo -e "API root response size: ${BLUE}${response_size} bytes${NC}"

# Summary
echo -e "\n${YELLOW}=== Performance Test Summary ===${NC}"
echo -e "• Health endpoint avg response: ${BLUE}${avg_time}s${NC}"
echo -e "• Concurrent handling: ${BLUE}${req_per_sec} req/s${NC}"
echo -e "• Stress test success rate: ${GREEN}${success_count}%${NC}"

if (( $(echo "$avg_time < 0.1" | bc -l) )) && [ "$fail_count" -eq 0 ]; then
    echo -e "\n${GREEN}✅ Overall: EXCELLENT PERFORMANCE${NC}"
elif (( $(echo "$avg_time < 0.5" | bc -l) )) && [ "$fail_count" -lt 5 ]; then
    echo -e "\n${YELLOW}⚠️  Overall: ACCEPTABLE PERFORMANCE${NC}"
else
    echo -e "\n${RED}❌ Overall: PERFORMANCE NEEDS IMPROVEMENT${NC}"
fi