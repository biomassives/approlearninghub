#!/bin/bash
# run-tests.sh - Script to run all auth tests

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default settings
TEST_TYPE="js"
HEADLESS="true"
TEST_BASE_URL="http://localhost:3000"
SETUP_USERS="false"

# Help function
function show_help {
    echo -e "${BLUE}Auth Testing Tool${NC} - Test runner for ApproVideo role-based authentication"
    echo ""
    echo "Usage: ./run-tests.sh [options]"
    echo ""
    echo "Options:"
    echo "  -t, --type <js|py>         Test type to run (JavaScript or Python)"
    echo "  -u, --url <url>            Base URL to test against (default: http://localhost:3000)"
    echo "  -h, --headless <true|false> Run tests in headless mode (default: true)"
    echo "  -s, --setup-users          Run the user setup script before tests"
    echo "  --help                     Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./run-tests.sh --type py --url https://staging.approvideotest.org"
    echo "  ./run-tests.sh --type js --headless false --setup-users"
    echo ""
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--type)
            TEST_TYPE="$2"
            shift 2
            ;;
        -u|--url)
            TEST_BASE_URL="$2"
            shift 2
            ;;
        -h|--headless)
            HEADLESS="$2"
            shift 2
            ;;
        -s|--setup-users)
            SETUP_USERS="true"
            shift
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Error:${NC} Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Validate arguments
if [[ "$TEST_TYPE" != "js" && "$TEST_TYPE" != "py" ]]; then
    echo -e "${RED}Error:${NC} Invalid test type. Must be 'js' or 'py'."
    exit 1
fi

if [[ "$HEADLESS" != "true" && "$HEADLESS" != "false" ]]; then
    echo -e "${RED}Error:${NC} Invalid headless mode. Must be 'true' or 'false'."
    exit 1
fi

# Export variables for test scripts
export TEST_BASE_URL="$TEST_BASE_URL"
export HEADLESS="$HEADLESS"

echo -e "${BLUE}=================================${NC}"
echo -e "${BLUE}Auth Testing Tool${NC}"
echo -e "${BLUE}=================================${NC}"
echo -e "Test type:      ${YELLOW}${TEST_TYPE}${NC}"
echo -e "Test URL:       ${YELLOW}${TEST_BASE_URL}${NC}"
echo -e "Headless mode:  ${YELLOW}${HEADLESS}${NC}"
echo -e "Setup users:    ${YELLOW}${SETUP_USERS}${NC}"
echo -e "${BLUE}=================================${NC}"

# Setup test users if needed
if [[ "$SETUP_USERS" == "true" ]]; then
    echo -e "\n${BLUE}Setting up test users...${NC}"
    node setup-test-users.js
    
    if [[ $? -ne 0 ]]; then
        echo -e "${RED}Error:${NC} Failed to setup test users. Check the output above for details."
        exit 1
    fi
fi

# Run the tests
echo -e "\n${BLUE}Running tests...${NC}"

if [[ "$TEST_TYPE" == "js" ]]; then
    # Run JavaScript tests with Puppeteer
    node auth-testing.js
    
    if [[ $? -ne 0 ]]; then
        echo -e "${RED}Tests failed. Check the output above and the logs directory for details.${NC}"
        exit 1
    fi
else
    # Run Python tests with Playwright
    python3 auth_testing.py
    
    if [[ $? -ne 0 ]]; then
        echo -e "${RED}Tests failed. Check the output above and the logs directory for details.${NC}"
        exit 1
    fi
fi

echo -e "\n${GREEN}All tests completed! See logs and results directories for test reports.${NC}"
echo -e "${BLUE}=================================${NC}"

# Report results location
echo -e "Test logs:      ${YELLOW}./logs/${NC}"
echo -e "Test results:   ${YELLOW}./results/${NC}"
echo -e "Screenshots:    ${YELLOW}./screenshots/${NC}"
echo -e "${BLUE}=================================${NC}"

exit 0
