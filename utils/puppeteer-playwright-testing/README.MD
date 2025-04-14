# Node.js requirements (package.json)
{
  "name": "approtech-auth-testing",
  "version": "1.0.0",
  "description": "ApproVideo Hub Authentication Testing Suite",
  "main": "auth-testing.js",
  "scripts": {
    "test": "node auth-testing.js",
    "test:python": "python auth_testing.py",
    "setup-users": "node setup-test-users.js",
    "test:all": "./run-tests.sh"
  },
  "author": "ApproVideo Tech Team",
  "license": "GPL-3.0",
  "dependencies": {
    "@supabase/supabase-js": "^2.38.0",
    "dotenv": "^16.3.1",
    "puppeteer": "^21.3.8"
  }
}

# Python requirements (requirements.txt)
playwright==1.38.0
python-dotenv==1.0.0
pytest==7.4.2
pytest-playwright==0.4.2

# .env file template (.env.example)
# Rename this file to .env and fill in the values
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_key_here
SUPABASE_SERVICE_KEY=your_supabase_service_key_here  # For admin operations
TEST_BASE_URL=http://localhost:3000
HEADLESS=true

# Installation and setup instructions (SETUP.md)
# Auth Testing Setup

This document provides instructions for setting up the authentication testing environment.

## Prerequisites

- Node.js 16+ and npm
- Python 3.8+ and pip
- Supabase account with proper credentials

## Installation

### JavaScript (Puppeteer) Testing

1. Install Node.js dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file from the template:
   ```bash
   cp .env.example .env
   ```

3. Edit the `.env` file and add your Supabase credentials.

### Python (Playwright) Testing

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Install Playwright browsers:
   ```bash
   playwright install
   ```

## Setting Up Test Users

Before running tests, you need to set up test users in your Supabase instance:

```bash
npm run setup-users
```

This will create test users for all roles (viewer, editor, expert, admin, developer) if they don't already exist.

## Running Tests

### JavaScript Tests

```bash
npm test
```

### Python Tests

```bash
npm run test:python
```

### All Tests

```bash
./run-tests.sh
```

For more options:

```bash
./run-tests.sh --help
```

## Test Results

After running tests, you can find:
- Test logs in the `logs` directory
- Test results in the `results` directory
- Screenshots in the `screenshots` directory
