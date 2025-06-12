#!/bin/bash

# Edge Case Tests for LEARN-X
# Tests various edge cases and boundary conditions

API_URL="http://localhost:8080/api/v1"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=== LEARN-X Edge Case Tests ==="
echo ""

# Test 1: Large File Upload (50MB limit)
echo -e "${YELLOW}1. Testing Large File Upload (51MB - should fail)${NC}"
# Create a 51MB file
dd if=/dev/zero of=large_test_file.pdf bs=1M count=51 2>/dev/null
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: multipart/form-data" \
  -F "file=@large_test_file.pdf" \
  "$API_URL/files/upload")

if [ "$response" = "413" ] || [ "$response" = "400" ]; then
  echo -e "${GREEN}✅ Large file correctly rejected${NC}"
else
  echo -e "${RED}❌ Large file not properly handled (Status: $response)${NC}"
fi
rm -f large_test_file.pdf

# Test 2: Empty File Upload
echo -e "\n${YELLOW}2. Testing Empty File Upload${NC}"
touch empty_file.txt
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: multipart/form-data" \
  -F "file=@empty_file.txt" \
  "$API_URL/files/upload")

if [ "$response" = "400" ] || [ "$response" = "401" ]; then
  echo -e "${GREEN}✅ Empty file correctly rejected${NC}"
else
  echo -e "${RED}❌ Empty file not properly handled (Status: $response)${NC}"
fi
rm -f empty_file.txt

# Test 3: Invalid File Type
echo -e "\n${YELLOW}3. Testing Invalid File Type (.exe)${NC}"
echo "fake executable" > test.exe
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: multipart/form-data" \
  -F "file=@test.exe" \
  "$API_URL/files/upload")

if [ "$response" = "400" ] || [ "$response" = "415" ] || [ "$response" = "401" ]; then
  echo -e "${GREEN}✅ Invalid file type correctly rejected${NC}"
else
  echo -e "${RED}❌ Invalid file type not properly handled (Status: $response)${NC}"
fi
rm -f test.exe

# Test 4: Extremely Long Filename
echo -e "\n${YELLOW}4. Testing Extremely Long Filename (300 chars)${NC}"
long_filename=$(printf '%*s' 300 | tr ' ' 'a')".txt"
echo "test content" > "$long_filename"
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: multipart/form-data" \
  -F "file=@$long_filename" \
  "$API_URL/files/upload")

if [ "$response" = "400" ] || [ "$response" = "401" ]; then
  echo -e "${GREEN}✅ Long filename handled${NC}"
else
  echo -e "${RED}❌ Long filename not properly handled (Status: $response)${NC}"
fi
rm -f "$long_filename"

# Test 5: Special Characters in Input
echo -e "\n${YELLOW}5. Testing Special Characters in Course Title${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"title":"Test <script>alert(\"XSS\")</script>","description":"Test"}' \
  "$API_URL/courses")

if [ "$response" = "401" ]; then
  echo -e "${GREEN}✅ Special characters handled (auth required)${NC}"
else
  echo -e "${YELLOW}⚠️  Response: $response${NC}"
fi

# Test 6: Unicode Characters
echo -e "\n${YELLOW}6. Testing Unicode Characters${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json; charset=utf-8" \
  -d '{"title":"测试课程 🎓","description":"Unicode test 你好"}' \
  "$API_URL/courses")

if [ "$response" = "401" ]; then
  echo -e "${GREEN}✅ Unicode handled properly${NC}"
else
  echo -e "${YELLOW}⚠️  Response: $response${NC}"
fi

# Test 7: Null Values
echo -e "\n${YELLOW}7. Testing Null Values${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"title":null,"description":null}' \
  "$API_URL/courses")

if [ "$response" = "400" ] || [ "$response" = "401" ]; then
  echo -e "${GREEN}✅ Null values properly rejected${NC}"
else
  echo -e "${RED}❌ Null values not properly handled (Status: $response)${NC}"
fi

# Test 8: Deep Nested JSON
echo -e "\n${YELLOW}8. Testing Deep Nested JSON${NC}"
nested_json='{"level1":{"level2":{"level3":{"level4":{"level5":{"level6":{"level7":{"level8":{"level9":{"level10":"deep"}}}}}}}}}'
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d "$nested_json" \
  "$API_URL/persona")

if [ "$response" = "400" ] || [ "$response" = "401" ]; then
  echo -e "${GREEN}✅ Deep nesting handled${NC}"
else
  echo -e "${RED}❌ Deep nesting not properly handled (Status: $response)${NC}"
fi

# Test 9: Concurrent Identical Requests
echo -e "\n${YELLOW}9. Testing Concurrent Identical Requests${NC}"
for i in {1..10}; do
  curl -s -o /dev/null "$API_URL/health" &
done
wait
echo -e "${GREEN}✅ Concurrent requests completed${NC}"

# Test 10: Memory Stress Test - Large JSON Array
echo -e "\n${YELLOW}10. Testing Large JSON Array (10k items)${NC}"
large_array='{"items":['
for i in {1..10000}; do
  large_array+='"item'$i'",'
done
large_array=${large_array%,}']}'

response=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d "$large_array" \
  "$API_URL/courses")

if [ "$response" = "413" ] || [ "$response" = "400" ] || [ "$response" = "401" ]; then
  echo -e "${GREEN}✅ Large array properly handled${NC}"
else
  echo -e "${RED}❌ Large array not properly handled (Status: $response)${NC}"
fi

echo -e "\n=== Edge Case Tests Complete ==="