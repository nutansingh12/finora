#!/bin/bash

# Finora Testing Framework Runner
# Comprehensive test execution script for all components

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_DIR="packages/backend"
WEB_DIR="packages/web"
MOBILE_DIR="packages/mobile"
ROOT_DIR="."

# Test types
RUN_UNIT_TESTS=${RUN_UNIT_TESTS:-true}
RUN_INTEGRATION_TESTS=${RUN_INTEGRATION_TESTS:-true}
RUN_E2E_TESTS=${RUN_E2E_TESTS:-false}
GENERATE_COVERAGE=${GENERATE_COVERAGE:-true}

# Helper functions
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

check_dependencies() {
    log_info "Checking dependencies..."
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Check npm
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    log_success "Dependencies check passed"
}

setup_test_environment() {
    log_info "Setting up test environment..."
    
    # Set test environment variables
    export NODE_ENV=test
    export CI=true
    
    # Create test results directories
    mkdir -p test-results/backend
    mkdir -p test-results/web
    mkdir -p test-results/mobile
    mkdir -p test-results/coverage
    
    log_success "Test environment setup complete"
}

run_backend_tests() {
    log_info "Running backend tests..."
    
    cd $BACKEND_DIR
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        log_info "Installing backend dependencies..."
        npm install
    fi
    
    # Run unit tests
    if [ "$RUN_UNIT_TESTS" = true ]; then
        log_info "Running backend unit tests..."
        npm run test:unit || {
            log_error "Backend unit tests failed"
            return 1
        }
    fi
    
    # Run integration tests
    if [ "$RUN_INTEGRATION_TESTS" = true ]; then
        log_info "Running backend integration tests..."
        npm run test:integration || {
            log_error "Backend integration tests failed"
            return 1
        }
    fi
    
    # Generate coverage report
    if [ "$GENERATE_COVERAGE" = true ]; then
        log_info "Generating backend coverage report..."
        npm run test:coverage || {
            log_warning "Backend coverage generation failed"
        }
        
        # Copy coverage to results directory
        if [ -d "coverage" ]; then
            cp -r coverage ../test-results/backend/
        fi
    fi
    
    cd - > /dev/null
    log_success "Backend tests completed"
}

run_web_tests() {
    log_info "Running web application tests..."
    
    cd $WEB_DIR
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        log_info "Installing web dependencies..."
        npm install
    fi
    
    # Run unit tests
    if [ "$RUN_UNIT_TESTS" = true ]; then
        log_info "Running web unit tests..."
        npm run test || {
            log_error "Web unit tests failed"
            return 1
        }
    fi
    
    # Run integration tests
    if [ "$RUN_INTEGRATION_TESTS" = true ]; then
        log_info "Running web integration tests..."
        npm run test -- --testPathPattern=integration || {
            log_error "Web integration tests failed"
            return 1
        }
    fi
    
    # Generate coverage report
    if [ "$GENERATE_COVERAGE" = true ]; then
        log_info "Generating web coverage report..."
        npm run test:coverage || {
            log_warning "Web coverage generation failed"
        }
        
        # Copy coverage to results directory
        if [ -d "coverage" ]; then
            cp -r coverage ../test-results/web/
        fi
    fi
    
    # Run E2E tests
    if [ "$RUN_E2E_TESTS" = true ]; then
        log_info "Running web E2E tests..."
        
        # Install Playwright browsers if needed
        npx playwright install --with-deps || {
            log_warning "Failed to install Playwright browsers"
        }
        
        # Run E2E tests
        npm run test:e2e || {
            log_error "Web E2E tests failed"
            return 1
        }
        
        # Copy E2E results
        if [ -d "test-results" ]; then
            cp -r test-results ../test-results/web/e2e/
        fi
    fi
    
    cd - > /dev/null
    log_success "Web tests completed"
}

run_mobile_tests() {
    log_info "Running mobile application tests..."
    
    cd $MOBILE_DIR
    
    # Check if mobile directory exists and has tests
    if [ ! -d "." ] || [ ! -f "package.json" ]; then
        log_warning "Mobile tests skipped - directory not found or not configured"
        cd - > /dev/null
        return 0
    fi
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        log_info "Installing mobile dependencies..."
        npm install
    fi
    
    # Run unit tests
    if [ "$RUN_UNIT_TESTS" = true ]; then
        log_info "Running mobile unit tests..."
        npm run test || {
            log_error "Mobile unit tests failed"
            return 1
        }
    fi
    
    # Generate coverage report
    if [ "$GENERATE_COVERAGE" = true ]; then
        log_info "Generating mobile coverage report..."
        npm run test:coverage || {
            log_warning "Mobile coverage generation failed"
        }
        
        # Copy coverage to results directory
        if [ -d "coverage" ]; then
            cp -r coverage ../test-results/mobile/
        fi
    fi
    
    cd - > /dev/null
    log_success "Mobile tests completed"
}

generate_combined_report() {
    log_info "Generating combined test report..."
    
    # Create combined report directory
    mkdir -p test-results/combined
    
    # Generate summary report
    cat > test-results/combined/summary.md << EOF
# Finora Test Results Summary

Generated on: $(date)

## Test Execution Summary

### Backend Tests
- Unit Tests: $([ "$RUN_UNIT_TESTS" = true ] && echo "✅ Executed" || echo "⏭️ Skipped")
- Integration Tests: $([ "$RUN_INTEGRATION_TESTS" = true ] && echo "✅ Executed" || echo "⏭️ Skipped")

### Web Application Tests
- Unit Tests: $([ "$RUN_UNIT_TESTS" = true ] && echo "✅ Executed" || echo "⏭️ Skipped")
- Integration Tests: $([ "$RUN_INTEGRATION_TESTS" = true ] && echo "✅ Executed" || echo "⏭️ Skipped")
- E2E Tests: $([ "$RUN_E2E_TESTS" = true ] && echo "✅ Executed" || echo "⏭️ Skipped")

### Mobile Application Tests
- Unit Tests: $([ "$RUN_UNIT_TESTS" = true ] && echo "✅ Executed" || echo "⏭️ Skipped")

## Coverage Reports

Coverage reports are available in the following directories:
- Backend: \`test-results/backend/coverage/\`
- Web: \`test-results/web/coverage/\`
- Mobile: \`test-results/mobile/coverage/\`

## Test Results

Detailed test results and artifacts are available in:
- \`test-results/backend/\`
- \`test-results/web/\`
- \`test-results/mobile/\`

EOF

    log_success "Combined report generated"
}

cleanup() {
    log_info "Cleaning up test environment..."
    
    # Kill any remaining processes
    pkill -f "jest" || true
    pkill -f "playwright" || true
    pkill -f "node.*test" || true
    
    log_success "Cleanup completed"
}

main() {
    log_info "Starting Finora Testing Framework"
    
    # Trap cleanup on exit
    trap cleanup EXIT
    
    # Check dependencies
    check_dependencies
    
    # Setup test environment
    setup_test_environment
    
    # Track test results
    BACKEND_RESULT=0
    WEB_RESULT=0
    MOBILE_RESULT=0
    
    # Run backend tests
    if ! run_backend_tests; then
        BACKEND_RESULT=1
    fi
    
    # Run web tests
    if ! run_web_tests; then
        WEB_RESULT=1
    fi
    
    # Run mobile tests
    if ! run_mobile_tests; then
        MOBILE_RESULT=1
    fi
    
    # Generate combined report
    generate_combined_report
    
    # Print final results
    echo
    log_info "=== TEST EXECUTION SUMMARY ==="
    echo "Backend Tests: $([ $BACKEND_RESULT -eq 0 ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}")"
    echo "Web Tests: $([ $WEB_RESULT -eq 0 ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}")"
    echo "Mobile Tests: $([ $MOBILE_RESULT -eq 0 ] && echo -e "${GREEN}PASSED${NC}" || echo -e "${RED}FAILED${NC}")"
    echo
    
    # Exit with error if any tests failed
    TOTAL_RESULT=$((BACKEND_RESULT + WEB_RESULT + MOBILE_RESULT))
    
    if [ $TOTAL_RESULT -eq 0 ]; then
        log_success "All tests passed successfully!"
        exit 0
    else
        log_error "Some tests failed. Check the results above."
        exit 1
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --no-unit)
            RUN_UNIT_TESTS=false
            shift
            ;;
        --no-integration)
            RUN_INTEGRATION_TESTS=false
            shift
            ;;
        --e2e)
            RUN_E2E_TESTS=true
            shift
            ;;
        --no-coverage)
            GENERATE_COVERAGE=false
            shift
            ;;
        --help)
            echo "Finora Testing Framework"
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --no-unit         Skip unit tests"
            echo "  --no-integration  Skip integration tests"
            echo "  --e2e            Run E2E tests"
            echo "  --no-coverage    Skip coverage generation"
            echo "  --help           Show this help message"
            exit 0
            ;;
        *)
            log_error "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Run main function
main
