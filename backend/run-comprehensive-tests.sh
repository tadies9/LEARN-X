#!/bin/bash

# Comprehensive Test Runner for LEARN-X
# This script runs all E2E tests and generates comprehensive reports

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TEST_RESULTS_DIR="./test-results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_DIR="${TEST_RESULTS_DIR}/${TIMESTAMP}"

# Functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

cleanup() {
    log_info "Cleaning up test processes..."
    # Kill any background processes if needed
    pkill -f "node.*test" || true
}

# Set up cleanup trap
trap cleanup EXIT

# Main execution
main() {
    log_info "🚀 Starting LEARN-X Comprehensive E2E Testing Suite"
    log_info "Test results will be saved to: ${REPORT_DIR}"
    
    # Create results directory
    mkdir -p "${REPORT_DIR}"
    
    # Step 1: Environment Validation
    log_info "🔍 Step 1: Validating test environment..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check if backend is running
    if ! curl -s http://localhost:8080/health > /dev/null; then
        log_warning "Backend server not running on localhost:8080"
        log_info "Starting backend server..."
        
        # Start backend in background
        npm run dev &
        BACKEND_PID=$!
        
        # Wait for server to start
        log_info "Waiting for backend server to start..."
        for i in {1..30}; do
            if curl -s http://localhost:8080/health > /dev/null; then
                log_success "Backend server started successfully"
                break
            fi
            sleep 1
        done
        
        if ! curl -s http://localhost:8080/health > /dev/null; then
            log_error "Failed to start backend server"
            exit 1
        fi
    else
        log_success "Backend server is already running"
    fi
    
    # Step 2: Run Unit Tests
    log_info "🧪 Step 2: Running unit tests..."
    if npm test > "${REPORT_DIR}/unit-tests.log" 2>&1; then
        log_success "Unit tests passed"
    else
        log_warning "Some unit tests failed (see ${REPORT_DIR}/unit-tests.log)"
    fi
    
    # Step 3: Run Integration Tests
    log_info "🔗 Step 3: Running integration tests..."
    if npm run test:integration > "${REPORT_DIR}/integration-tests.log" 2>&1; then
        log_success "Integration tests passed"
    else
        log_warning "Some integration tests failed (see ${REPORT_DIR}/integration-tests.log)"
    fi
    
    # Step 4: Run E2E Tests
    log_info "🎯 Step 4: Running comprehensive E2E tests..."
    if npm run test:e2e > "${REPORT_DIR}/e2e-tests.log" 2>&1; then
        log_success "E2E tests passed"
    else
        log_error "E2E tests failed (see ${REPORT_DIR}/e2e-tests.log)"
        # Don't exit - continue with other tests
    fi
    
    # Step 5: Run Load Tests (if k6 is available)
    if command -v k6 &> /dev/null; then
        log_info "⚡ Step 5: Running load tests..."
        if npm run test:load > "${REPORT_DIR}/load-tests.log" 2>&1; then
            log_success "Load tests completed"
        else
            log_warning "Load tests had issues (see ${REPORT_DIR}/load-tests.log)"
        fi
    else
        log_warning "k6 not installed, skipping load tests"
    fi
    
    # Step 6: Generate Coverage Report
    log_info "📊 Step 6: Generating test coverage report..."
    if npm run test:coverage > "${REPORT_DIR}/coverage.log" 2>&1; then
        log_success "Coverage report generated"
        
        # Copy coverage files if they exist
        if [ -d "./coverage" ]; then
            cp -r ./coverage "${REPORT_DIR}/coverage-html"
        fi
    else
        log_warning "Coverage report generation failed"
    fi
    
    # Step 7: System Health Check
    log_info "🔍 Step 7: Running final system health check..."
    if curl -s http://localhost:8080/health/comprehensive > "${REPORT_DIR}/final-health-check.json"; then
        log_success "Final health check completed"
    else
        log_warning "Final health check failed"
    fi
    
    # Step 8: Generate Summary Report
    log_info "📋 Step 8: Generating test summary report..."
    generate_summary_report
    
    # Display final results
    display_final_results
}

generate_summary_report() {
    local summary_file="${REPORT_DIR}/test-summary.md"
    
    cat > "${summary_file}" << EOF
# LEARN-X Comprehensive Test Report

**Generated:** $(date)
**Test Run ID:** ${TIMESTAMP}

## Test Summary

### Test Execution Status

| Test Type | Status | Log File |
|-----------|--------|----------|
| Unit Tests | $(check_log_status "${REPORT_DIR}/unit-tests.log") | unit-tests.log |
| Integration Tests | $(check_log_status "${REPORT_DIR}/integration-tests.log") | integration-tests.log |
| E2E Tests | $(check_log_status "${REPORT_DIR}/e2e-tests.log") | e2e-tests.log |
| Load Tests | $(check_log_status "${REPORT_DIR}/load-tests.log") | load-tests.log |

### Coverage Information

$(if [ -f "${REPORT_DIR}/coverage.log" ]; then echo "✅ Coverage report generated"; else echo "❌ Coverage report not available"; fi)

### System Health

$(if [ -f "${REPORT_DIR}/final-health-check.json" ]; then echo "✅ System health check completed"; else echo "❌ Health check failed"; fi)

## Test Artifacts

- **Unit Test Logs:** unit-tests.log
- **Integration Test Logs:** integration-tests.log  
- **E2E Test Logs:** e2e-tests.log
- **Load Test Logs:** load-tests.log
- **Coverage Report:** coverage-html/
- **Health Check:** final-health-check.json

## Recommendations

$(generate_recommendations)

---
*Generated by LEARN-X Test Suite*
EOF

    log_success "Summary report generated: ${summary_file}"
}

check_log_status() {
    local log_file="$1"
    if [ -f "${log_file}" ]; then
        if grep -q "FAIL" "${log_file}" || grep -q "ERROR" "${log_file}"; then
            echo "❌ Failed"
        else
            echo "✅ Passed"
        fi
    else
        echo "⚠️ Not Run"
    fi
}

generate_recommendations() {
    echo "Based on test results:"
    echo ""
    
    # Check E2E test results
    if [ -f "${REPORT_DIR}/e2e-tests.log" ] && grep -q "FAIL" "${REPORT_DIR}/e2e-tests.log"; then
        echo "- 🔴 **Critical:** Fix failing E2E tests to ensure system reliability"
    fi
    
    # Check load test results
    if [ -f "${REPORT_DIR}/load-tests.log" ] && grep -q "threshold" "${REPORT_DIR}/load-tests.log"; then
        echo "- 🟡 **Performance:** Review load test thresholds and optimize slow endpoints"
    fi
    
    # Check coverage
    if [ -f "${REPORT_DIR}/coverage.log" ]; then
        echo "- 🔵 **Quality:** Review test coverage and add tests for uncovered code paths"
    fi
    
    echo "- 🟢 **Monitoring:** Set up continuous monitoring for performance metrics"
    echo "- 🟢 **Automation:** Consider automating this test suite in CI/CD pipeline"
}

display_final_results() {
    echo ""
    echo "╔══════════════════════════════════════════════════════════════════════════════╗"
    echo "║                          LEARN-X TEST SUITE RESULTS                         ║"
    echo "╠══════════════════════════════════════════════════════════════════════════════╣"
    echo "║  Test Run: ${TIMESTAMP}                                                    ║"
    echo "║  Results:  ${REPORT_DIR}/                                                  ║"
    echo "╚══════════════════════════════════════════════════════════════════════════════╝"
    echo ""
    
    # Display quick status overview
    log_info "Quick Status Overview:"
    echo "  • Unit Tests:       $(check_log_status "${REPORT_DIR}/unit-tests.log")"
    echo "  • Integration:      $(check_log_status "${REPORT_DIR}/integration-tests.log")"
    echo "  • E2E Tests:        $(check_log_status "${REPORT_DIR}/e2e-tests.log")"
    echo "  • Load Tests:       $(check_log_status "${REPORT_DIR}/load-tests.log")"
    echo ""
    
    log_info "📋 Full test summary available at: ${REPORT_DIR}/test-summary.md"
    
    # Open summary in browser if possible
    if command -v open &> /dev/null; then
        open "${REPORT_DIR}/test-summary.md"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "${REPORT_DIR}/test-summary.md"
    fi
}

# Execute main function
main "$@"