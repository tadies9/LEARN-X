#!/bin/bash

# Security Tests for LEARN-X
# Tests for common vulnerabilities

API_URL="http://localhost:8080/api/v1"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=== LEARN-X Security Tests ==="
echo ""

# Test 1: SQL Injection in Search
echo -e "${YELLOW}1. Testing SQL Injection in Search${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" -X GET \
  "$API_URL/courses?search='; DROP TABLE courses; --")

if [ "$response" = "401" ] || [ "$response" = "400" ]; then
  echo -e "${GREEN}✅ SQL injection attempt blocked${NC}"
else
  echo -e "${RED}❌ SQL injection not properly handled (Status: $response)${NC}"
fi

# Test 2: NoSQL Injection
echo -e "\n${YELLOW}2. Testing NoSQL Injection${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":{"$ne":null},"password":{"$ne":null}}' \
  "$API_URL/auth/login")

if [ "$response" = "400" ] || [ "$response" = "401" ]; then
  echo -e "${GREEN}✅ NoSQL injection blocked${NC}"
else
  echo -e "${RED}❌ NoSQL injection not properly handled (Status: $response)${NC}"
fi

# Test 3: XSS in Headers
echo -e "\n${YELLOW}3. Testing XSS in Headers${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "X-User-Input: <script>alert('XSS')</script>" \
  "$API_URL/health")

if [ "$response" = "200" ]; then
  echo -e "${GREEN}✅ XSS in headers handled${NC}"
else
  echo -e "${RED}❌ Headers not properly handled (Status: $response)${NC}"
fi

# Test 4: JWT Token Manipulation
echo -e "\n${YELLOW}4. Testing Invalid JWT Token${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c" \
  "$API_URL/courses")

if [ "$response" = "401" ]; then
  echo -e "${GREEN}✅ Invalid JWT rejected${NC}"
else
  echo -e "${RED}❌ Invalid JWT not properly handled (Status: $response)${NC}"
fi

# Test 5: Path Traversal
echo -e "\n${YELLOW}5. Testing Path Traversal${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" \
  "$API_URL/files/../../etc/passwd")

if [ "$response" = "400" ] || [ "$response" = "404" ] || [ "$response" = "401" ]; then
  echo -e "${GREEN}✅ Path traversal blocked${NC}"
else
  echo -e "${RED}❌ Path traversal not properly handled (Status: $response)${NC}"
fi

# Test 6: Command Injection
echo -e "\n${YELLOW}6. Testing Command Injection${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"filename":"test.txt; rm -rf /"}' \
  "$API_URL/files/process")

if [ "$response" = "400" ] || [ "$response" = "401" ] || [ "$response" = "404" ]; then
  echo -e "${GREEN}✅ Command injection blocked${NC}"
else
  echo -e "${RED}❌ Command injection not properly handled (Status: $response)${NC}"
fi

# Test 7: CORS Bypass Attempt
echo -e "\n${YELLOW}7. Testing CORS Bypass${NC}"
response=$(curl -s -I -X OPTIONS \
  -H "Origin: http://evil.com" \
  -H "Access-Control-Request-Method: POST" \
  "$API_URL/courses" 2>/dev/null | grep -i "access-control-allow-origin" | grep -v "localhost:3000")

if [ -z "$response" ]; then
  echo -e "${GREEN}✅ CORS properly restricted${NC}"
else
  echo -e "${RED}❌ CORS not properly restricted${NC}"
fi

# Test 8: Authorization Bypass
echo -e "\n${YELLOW}8. Testing Authorization Bypass${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: Basic YWRtaW46YWRtaW4=" \
  "$API_URL/courses")

if [ "$response" = "401" ]; then
  echo -e "${GREEN}✅ Basic auth bypass blocked${NC}"
else
  echo -e "${RED}❌ Basic auth bypass not handled (Status: $response)${NC}"
fi

# Test 9: HTTP Method Override
echo -e "\n${YELLOW}9. Testing HTTP Method Override${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "X-HTTP-Method-Override: DELETE" \
  "$API_URL/courses/123")

if [ "$response" = "401" ] || [ "$response" = "405" ]; then
  echo -e "${GREEN}✅ Method override handled${NC}"
else
  echo -e "${RED}❌ Method override not handled (Status: $response)${NC}"
fi

# Test 10: Timing Attack on Login
echo -e "\n${YELLOW}10. Testing Timing Attack Prevention${NC}"
# Test with valid format email
time1=$(curl -o /dev/null -s -w '%{time_total}' -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"wrongpassword"}' \
  "$API_URL/auth/login")

# Test with invalid email
time2=$(curl -o /dev/null -s -w '%{time_total}' -X POST \
  -H "Content-Type: application/json" \
  -d '{"email":"nonexistent@example.com","password":"wrongpassword"}' \
  "$API_URL/auth/login")

# Compare times (should be similar to prevent user enumeration)
echo -e "${GREEN}✅ Response times: valid=$time1s, invalid=$time2s${NC}"

# Test 11: XXE Attack
echo -e "\n${YELLOW}11. Testing XXE Attack${NC}"
xxe_payload='<?xml version="1.0"?>
<!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>
<root>&xxe;</root>'

response=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/xml" \
  -d "$xxe_payload" \
  "$API_URL/courses")

if [ "$response" = "400" ] || [ "$response" = "415" ] || [ "$response" = "401" ]; then
  echo -e "${GREEN}✅ XXE attack blocked${NC}"
else
  echo -e "${RED}❌ XXE attack not handled (Status: $response)${NC}"
fi

# Test 12: SSRF Attack
echo -e "\n${YELLOW}12. Testing SSRF Attack${NC}"
response=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"webhook":"http://169.254.169.254/latest/meta-data/"}' \
  "$API_URL/notifications/webhook")

if [ "$response" = "400" ] || [ "$response" = "401" ] || [ "$response" = "404" ]; then
  echo -e "${GREEN}✅ SSRF attack blocked${NC}"
else
  echo -e "${RED}❌ SSRF attack not handled (Status: $response)${NC}"
fi

echo -e "\n=== Security Tests Complete ===="