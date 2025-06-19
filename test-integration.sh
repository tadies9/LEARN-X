#!/bin/bash

# Integration Test for Python File Processing Service
# This script tests the end-to-end flow of file processing through PGMQ

set -e

echo "=== LEARN-X Python Integration Test ==="
echo

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
API_BASE="http://localhost:8080/api"
PYTHON_API_BASE="http://localhost:8001/api/v1"
TEST_FILE="test-document.txt"
MODULE_ID="${MODULE_ID:-d4a09fe4-bd1f-4c95-90cd-20d6ae325b84}"
AUTH_TOKEN="${AUTH_TOKEN:-your-auth-token}"

# Function to check service health
check_service() {
    local service_name=$1
    local health_url=$2
    
    echo -n "Checking $service_name health... "
    if curl -s -f "$health_url" > /dev/null; then
        echo -e "${GREEN}OK${NC}"
        return 0
    else
        echo -e "${RED}FAILED${NC}"
        return 1
    fi
}

# Function to create test file
create_test_file() {
    cat > "$TEST_FILE" << EOF
# Test Document for LEARN-X Integration

This is a test document to verify the Python file processing integration.

## Section 1: Introduction
The Python AI service should process this file through PGMQ and create chunks.

## Section 2: Processing Steps
1. File is uploaded to Node.js backend
2. Backend queues the file in PGMQ
3. Python service picks up the job
4. File is processed and chunked
5. Embeddings are generated

## Section 3: Validation
This test will verify each step of the process.
EOF
    echo -e "${GREEN}Test file created${NC}"
}

# Function to upload file
upload_file() {
    echo -n "Uploading test file... "
    
    response=$(curl -s -X POST \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        -F "file=@$TEST_FILE" \
        -F "moduleId=$MODULE_ID" \
        -F "name=Integration Test Document" \
        -F "description=Testing Python file processing" \
        -F 'processingOptions={"chunkSize":500,"priority":"high"}' \
        "$API_BASE/files/upload")
    
    file_id=$(echo "$response" | grep -o '"id":"[^"]*' | grep -o '[^"]*$' | head -1)
    
    if [ -n "$file_id" ]; then
        echo -e "${GREEN}OK${NC} (File ID: $file_id)"
        echo "$file_id"
    else
        echo -e "${RED}FAILED${NC}"
        echo "Response: $response"
        return 1
    fi
}

# Function to check processing status
check_processing_status() {
    local file_id=$1
    local max_attempts=30
    local attempt=0
    
    echo "Checking processing status..."
    
    while [ $attempt -lt $max_attempts ]; do
        response=$(curl -s \
            -H "Authorization: Bearer $AUTH_TOKEN" \
            "$API_BASE/files/$file_id/processing-status")
        
        status=$(echo "$response" | grep -o '"status":"[^"]*' | grep -o '[^"]*$')
        
        case "$status" in
            "completed")
                echo -e "${GREEN}Processing completed!${NC}"
                return 0
                ;;
            "failed"|"dead")
                echo -e "${RED}Processing failed!${NC}"
                echo "Response: $response"
                return 1
                ;;
            *)
                echo -ne "\rStatus: ${YELLOW}$status${NC} (attempt $((attempt+1))/$max_attempts)"
                sleep 2
                ;;
        esac
        
        attempt=$((attempt + 1))
    done
    
    echo -e "\n${RED}Timeout waiting for processing${NC}"
    return 1
}

# Function to verify chunks
verify_chunks() {
    local file_id=$1
    
    echo -n "Verifying file chunks... "
    
    # This would need a proper endpoint to check chunks
    # For now, we just check if the file status shows completion
    response=$(curl -s \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        "$API_BASE/files/$file_id")
    
    if echo "$response" | grep -q '"status":"completed"'; then
        echo -e "${GREEN}OK${NC}"
        return 0
    else
        echo -e "${RED}FAILED${NC}"
        return 1
    fi
}

# Function to check queue health
check_queue_health() {
    echo -n "Checking queue health... "
    
    response=$(curl -s \
        -H "Authorization: Bearer $AUTH_TOKEN" \
        "$API_BASE/files/queue/health")
    
    if echo "$response" | grep -q '"status":"healthy"'; then
        echo -e "${GREEN}Healthy${NC}"
    else
        echo -e "${YELLOW}Degraded or Unhealthy${NC}"
        echo "Response: $response"
    fi
}

# Main test flow
main() {
    echo "Starting integration test..."
    echo
    
    # Step 1: Check services
    echo "Step 1: Checking services"
    check_service "Node.js Backend" "$API_BASE/health" || exit 1
    check_service "Python AI Service" "$PYTHON_API_BASE/health" || exit 1
    echo
    
    # Step 2: Check queue health
    echo "Step 2: Checking queue system"
    check_queue_health
    echo
    
    # Step 3: Create and upload test file
    echo "Step 3: Creating and uploading test file"
    create_test_file
    file_id=$(upload_file) || exit 1
    echo
    
    # Step 4: Monitor processing
    echo "Step 4: Monitoring file processing"
    check_processing_status "$file_id" || exit 1
    echo
    
    # Step 5: Verify results
    echo "Step 5: Verifying results"
    verify_chunks "$file_id" || exit 1
    echo
    
    # Cleanup
    rm -f "$TEST_FILE"
    
    echo -e "${GREEN}=== Integration test completed successfully ===${NC}"
}

# Run the test
main