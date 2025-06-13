#!/bin/bash

# Test file upload endpoint
echo "Testing file upload endpoint..."

# Create a test file
echo "This is a test file" > test.txt

# First, get auth token (you'll need to update these credentials)
TOKEN="your-auth-token-here"
MODULE_ID="3f4455b6-f435-483b-a712-017fc0fd2b5e"

# Test upload
curl -X POST http://localhost:8080/api/v1/files/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.txt" \
  -F "moduleId=$MODULE_ID" \
  -F "name=Test File" \
  -F "description=Test description" \
  -v

# Clean up
rm test.txt