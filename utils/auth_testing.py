#!/usr/bin/env python3
# auth_testing.py - Python version of auth testing using Playwright

import os
import json
import asyncio
import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any

from playwright.async_api import async_playwright, Browser, Page, Playwright

# Base URL for testing
BASE_URL = os.environ.get("TEST_BASE_URL", "http://localhost:3000")

# Test user accounts for different roles
TEST_USERS = {
    "viewer": {
        "email": "viewer@approvideotest.org",
        "password": "viewerPassword123!",
        "expected_dashboards": ["public-timeline", "community-milestones"],
        "unexpected_dashboards": ["dashboard", "expert-dashboard", "user-management", "dev-tools"]
    },
    "editor": {
        "email": "editor@approvideotest.org",
        "password": "editorPassword123!",
        "expected_dashboards": ["public-timeline", "community-milestones", "dashboard"],
        "unexpected_dashboards": ["expert-dashboard", "user-management", "dev-tools"]
    },
    "expert": {
        "email": "expert@approvideotest.org",
        "password": "expertPassword123!",
        "expected_dashboards": ["public-timeline", "community-milestones", "dashboard", "expert-dashboard"],
        "unexpected_dashboards": ["user-management", "dev-tools"]
    },
    "admin": {
        "email": "admin@approvideotest.org",
        "password": "adminPassword123!",
        "expected_dashboards": ["public-timeline", "community-milestones", "dashboard", "expert-dashboard", "user-management"],
        "unexpected_dashboards": ["dev-tools"]
    },
    "developer": {
        "email": "developer@approvideotest.org",
        "password": "developerPassword123!",
        "expected_dashboards": ["public-timeline", "community-milestones", "dashboard", "expert-dashboard", "user-management", "dev-tools"],
        "unexpected_dashboards": []
    }
}

# Test results storage
test_results = {
    "summary": {
        "total": 0,
        "passed": 0,
        "failed": 0,
        "timestamp": datetime.datetime.now().isoformat()
    },
    "results": []
}

# Setup paths for logs and screenshots
logs_dir = Path("logs")
screenshots_dir = Path("screenshots")
results_dir = Path("results")

for directory in [logs_dir, screenshots_dir, results_dir]:
    directory.mkdir(exist_ok=True)

log_file = logs_dir / f"auth-test-{datetime.datetime.now().strftime('%Y%m%d-%H%M%S')}.log"

# Logging functions
def log_message(message: str, level: str = "INFO") -> None:
    """Log a message to both console and log file."""
    timestamp = datetime.datetime.now().isoformat()
    log_message = f"{timestamp} [{level}] {message}\n"
    print(message)
    
    with open(log_file, "a") as f:
        f.write(log_message)

# Test result recording functions
def record_test_result(test: str, passed: bool, message: str, screenshot: Optional[str] = None) -> Dict:
    """Record a test result and update summary."""
    result = {
        "test": test,
        "passed": passed,
        "message": message,
        "timestamp": datetime.datetime.now().isoformat(),
        "screenshot": screenshot
    }
    
    test_results["results"].append(result)
    test_results["summary"]["total"] += 1
    
    if passed:
        test_results["summary"]["passed"] += 1
    else:
        test_results["summary"]["failed"] += 1
    
    return result

# Save test results to file
def save_test_results() -> str:
    """Save test results to a JSON file."""
    results_file = results_dir / f"auth-test-results-{datetime.datetime.now().strftime('%Y%m%d-%H%M%S')}.json"
    
    with open(results_file, "w") as f:
        json.dump(test_results, f, indent=2)
    
    log_message(f"Test results saved to {results_file}")
    return str(results_file)

# Helper function to take a screenshot
async def take_screenshot(page: Page, name: str) -> Optional[str]:
    """Take a screenshot and save it to the screenshots directory."""
    try:
        screenshot_path = screenshots_dir / f"{name}-{datetime.datetime.now().strftime('%Y%m%d-%H%M%S')}.png"
        await page.screenshot(path=screenshot_path, full_page=True)
        return str(screenshot_path)
    except Exception as e:
        log_message(f"Error taking screenshot: {e}", "ERROR")
        return None
