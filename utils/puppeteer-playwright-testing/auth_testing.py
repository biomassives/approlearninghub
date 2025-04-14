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

# Test login functionality for a user
async def test_login(page: Page, role: str, user_data: Dict) -> bool:
    """Test login functionality for a specific user role."""
    log_message(f"Testing login for {role} role...", "INFO")
    
    try:
        # Navigate to login page
        await page.goto(f"{BASE_URL}/login.html")
        await page.wait_for_selector("#login-form")
        
        # Fill in login form
        await page.fill("#email", user_data["email"])
        await page.fill("#password", user_data["password"])
        
        # Take screenshot before login
        before_login_screenshot = await take_screenshot(page, f"{role}-before-login")
        
        # Submit form and wait for navigation
        async with page.expect_navigation():
            await page.click("#login-form button[type='submit']")
        
        # Wait for any possible redirects or JS loading
        await page.wait_for_timeout(2000)
        
        # Check if login was successful (look for navigation component)
        is_logged_in = await page.evaluate("() => !!document.querySelector('#app-navigation')")
        
        # Take screenshot after login
        after_login_screenshot = await take_screenshot(page, f"{role}-after-login")
        
        if is_logged_in:
            log_message(f"✅ Successfully logged in as {role}", "INFO")
            record_test_result(f"login-{role}", True, f"Successfully logged in as {role}", after_login_screenshot)
            return True
        else:
            log_message(f"❌ Failed to log in as {role}", "ERROR")
            record_test_result(f"login-{role}", False, f"Failed to log in as {role}", after_login_screenshot)
            return False
    
    except Exception as e:
        log_message(f"❌ Error during login test for {role}: {e}", "ERROR")
        error_screenshot = await take_screenshot(page, f"{role}-login-error")
        record_test_result(f"login-{role}", False, f"Error during login: {str(e)}", error_screenshot)
        return False

# Test dashboard access for a user
async def test_dashboard_access(page: Page, role: str, user_data: Dict) -> Dict:
    """Test dashboard access for a specific user role."""
    log_message(f"Testing dashboard access for {role} role...", "INFO")
    
    results = {
        "expected_access": [],
        "unexpected_access": [],
        "total_checked": 0
    }
    
    # Test expected dashboards (should have access)
    for dashboard in user_data["expected_dashboards"]:
        try:
            log_message(f"Testing access to {dashboard} for {role}...", "INFO")
            
            # Navigate to dashboard
            await page.goto(f"{BASE_URL}/{dashboard}")
            await page.wait_for_timeout(2000)  # Wait for any redirects
            
            # Take screenshot
            screenshot = await take_screenshot(page, f"{role}-{dashboard}")
            
            # Check if access was granted (no access denied message)
            access_denied = await page.evaluate("() => !!document.querySelector('.permission-indicator.no-permission')")
            
            if not access_denied:
                log_message(f"✅ {role} correctly has access to {dashboard}", "INFO")
                record_test_result(f"{role}-access-{dashboard}", True, f"{role} correctly has access to {dashboard}", screenshot)
                results["expected_access"].append(dashboard)
            else:
                log_message(f"❌ {role} unexpectedly denied access to {dashboard}", "ERROR")
                record_test_result(f"{role}-access-{dashboard}", False, f"{role} unexpectedly denied access to {dashboard}", screenshot)
        
        except Exception as e:
            log_message(f"❌ Error testing {dashboard} access for {role}: {e}", "ERROR")
            error_screenshot = await take_screenshot(page, f"{role}-{dashboard}-error")
            record_test_result(f"{role}-access-{dashboard}", False, f"Error testing access: {str(e)}", error_screenshot)
        
        results["total_checked"] += 1
    
    # Test unexpected dashboards (should NOT have access)
    for dashboard in user_data["unexpected_dashboards"]:
        try:
            log_message(f"Testing no-access to {dashboard} for {role}...", "INFO")
            
            # Navigate to dashboard
            await page.goto(f"{BASE_URL}/{dashboard}")
            await page.wait_for_timeout(2000)  # Wait for any redirects
            
            # Take screenshot
            screenshot = await take_screenshot(page, f"{role}-{dashboard}-denied")
            
            # Should see access denied message or be redirected to login
            current_url = page.url
            access_denied = await page.evaluate("""
                () => !!document.querySelector('.permission-indicator.no-permission') || 
                window.location.pathname.includes('login')
            """)
            
            if access_denied:
                log_message(f"✅ {role} correctly denied access to {dashboard}", "INFO")
                record_test_result(f"{role}-noaccess-{dashboard}", True, f"{role} correctly denied access to {dashboard}", screenshot)
                results["unexpected_access"].append(dashboard)
            else:
                log_message(f"❌ {role} unexpectedly granted access to {dashboard}", "ERROR")
                record_test_result(f"{role}-noaccess-{dashboard}", False, f"{role} unexpectedly granted access to {dashboard}", screenshot)
        
        except Exception as e:
            log_message(f"❌ Error testing {dashboard} no-access for {role}: {e}", "ERROR")
            error_screenshot = await take_screenshot(page, f"{role}-{dashboard}-denied-error")
            record_test_result(f"{role}-noaccess-{dashboard}", False, f"Error testing no-access: {str(e)}", error_screenshot)
        
        results["total_checked"] += 1
    
    # Log summary
    success_rate = ((len(results["expected_access"]) + len(results["unexpected_access"])) / results["total_checked"]) * 100
    log_message(f"Dashboard access test for {role}: {success_rate:.2f}% success rate", "INFO")
    
    return results

# Test UI elements visibility based on role
async def test_ui_elements_visibility(page: Page, role: str) -> Dict:
    """Test if UI elements are correctly shown/hidden based on user role."""
    log_message(f"Testing UI elements visibility for {role} role...", "INFO")
    
    try:
        # Navigate to main dashboard
        dashboards = TEST_USERS[role]["expected_dashboards"]
        dashboard_to_check = "dashboard" if "dashboard" in dashboards else dashboards[0]
        
        await page.goto(f"{BASE_URL}/{dashboard_to_check}")
        await page.wait_for_timeout(2000)
        
        # Take screenshot
        screenshot = await take_screenshot(page, f"{role}-ui-elements")
        
        # Check role-specific elements
        visibility_results = await page.evaluate("""
            (role) => {
                const results = {
                    visibleElements: [],
                    invisibleElements: [],
                    roleClasses: []
                };
                
                // Check if body has role class
                const body = document.body;
                const hasRoleClass = body.classList.contains(`role-${role}`);
                if (hasRoleClass) {
                    results.roleClasses.push(`role-${role}`);
                }
                
                // Check role-specific content visibility
                const roleSelectors = {
                    viewer: '.for-viewer',
                    editor: '.for-editor',
                    expert: '.for-expert',
                    admin: '.for-admin',
                    developer: '.for-developer'
                };
                
                // Determine which elements should be visible for this role
                const visibleRoles = [];
                if (role === 'viewer') visibleRoles.push('viewer');
                if (role === 'editor') visibleRoles.push('viewer', 'editor');
                if (role === 'expert') visibleRoles.push('viewer', 'editor', 'expert');
                if (role === 'admin') visibleRoles.push('viewer', 'editor', 'expert', 'admin');
                if (role === 'developer') visibleRoles.push('viewer', 'editor', 'expert', 'admin', 'developer');
                
                // Check each role's content
                for (const [checkRole, selector] of Object.entries(roleSelectors)) {
                    const elements = document.querySelectorAll(selector);
                    
                    if (elements.length > 0) {
                        const firstElement = elements[0];
                        const isVisible = visibleRoles.includes(checkRole) && 
                                          window.getComputedStyle(firstElement).display !== 'none';
                        
                        if (isVisible) {
                            results.visibleElements.push(checkRole);
                        } else {
                            results.invisibleElements.push(checkRole);
                        }
                    }
                }
                
                return results;
            }
        """, role)
        
        # Log results
        log_message(f"Role class applied: {visibility_results['roleClasses']}", "INFO")
        log_message(f"Visible elements: {', '.join(visibility_results['visibleElements'])}", "INFO")
        log_message(f"Invisible elements: {', '.join(visibility_results['invisibleElements'])}", "INFO")
        
        # Record test result
        correct_visibility = f"role-{role}" in visibility_results["roleClasses"]
        record_test_result(f"{role}-ui-visibility", correct_visibility, 
                          f"UI elements visibility for {role}: {'Correct' if correct_visibility else 'Incorrect'}", 
                          screenshot)
        
        return visibility_results
    
    except Exception as e:
        log_message(f"❌ Error testing UI elements visibility for {role}: {e}", "ERROR")
        error_screenshot = await take_screenshot(page, f"{role}-ui-elements-error")
        record_test_result(f"{role}-ui-visibility", False, f"Error testing UI visibility: {str(e)}", error_screenshot)
        return None

# Test logout functionality
async def test_logout(page: Page, role: str) -> bool:
    """Test logout functionality for a specific user role."""
    log_message(f"Testing logout for {role} role...", "INFO")
    
    try:
        # Check for logout button
        await page.wait_for_selector(".logout-btn")
        
        # Take screenshot before logout
        before_logout_screenshot = await take_screenshot(page, f"{role}-before-logout")
        
        # Click logout and wait for redirect
        async with page.expect_navigation():
            await page.click(".logout-btn")
        
        # Wait for any redirects to complete
        await page.wait_for_timeout(2000)
        
        # Take screenshot after logout
        after_logout_screenshot = await take_screenshot(page, f"{role}-after-logout")
        
        # Check if user was redirected to login page
        current_url = page.url
        is_at_login = "login" in current_url
        
        if is_at_login:
            log_message(f"✅ Successfully logged out {role}", "INFO")
            record_test_result(f"logout-{role}", True, f"Successfully logged out {role}", after_logout_screenshot)
            return True
        else:
            log_message(f"❌ Failed to log out {role}", "ERROR")
            record_test_result(f"logout-{role}", False, f"Failed to log out {role}", after_logout_screenshot)
            return False
    
    except Exception as e:
        log_message(f"❌ Error during logout test for {role}: {e}", "ERROR")
        error_screenshot = await take_screenshot(page, f"{role}-logout-error")
        record_test_result(f"logout-{role}", False, f"Error during logout: {str(e)}", error_screenshot)
        return False

# Main test runner
async def run_tests() -> None:
    """Run all authentication system tests."""
    # Set up logging
    log_message("🚀 Starting authentication system tests", "INFO")
    log_message(f"Base URL: {BASE_URL}", "INFO")
    
    async with async_playwright() as playwright:
        # Launch browser
        browser = await playwright.chromium.launch(
            headless=os.environ.get("HEADLESS", "true").lower() != "false",
            args=["--no-sandbox", "--disable-setuid-sandbox"]
        )
        
        try:
            # Run tests for each role
            for role, user_data in TEST_USERS.items():
                context = await browser.new_context(
                    viewport={"width": 1280, "height": 800},
                    user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.110 Safari/537.36"
                )
                
                page = await context.new_page()
                
                # Listen for console messages
                page.on("console", lambda msg: log_message(f"[Browser Console] [{role}] {msg.text}", "DEBUG"))
                
                # Test login
                login_successful = await test_login(page, role, user_data)
                
                if login_successful:
                    # Test dashboard access
                    await test_dashboard_access(page, role, user_data)
                    
                    # Test UI elements visibility
                    await test_ui_elements_visibility(page, role)
                    
                    # Test logout
                    await test_logout(page, role)
                
                await context.close()
                log_message(f"Completed tests for {role} role", "INFO")
        
        except Exception as e:
            log_message(f"❌ Unexpected error during tests: {e}", "ERROR")
        
        finally:
            # Close browser
            await browser.close()
            
            # Save test results
            results_path = save_test_results()
            
            # Log summary
            log_message("📊 Test Summary:", "INFO")
            log_message(f"Total tests: {test_results['summary']['total']}", "INFO")
            log_message(f"Passed: {test_results['summary']['passed']}", "INFO")
            log_message(f"Failed: {test_results['summary']['failed']}", "INFO")
            
            pass_rate = (test_results['summary']['passed'] / test_results['summary']['total'] * 100) if test_results['summary']['total'] > 0 else 0
            log_message(f"Success rate: {pass_rate:.2f}%", "INFO")
            
            log_message("✅ Authentication system tests completed", "INFO")

# Entry point
if __name__ == "__main__":
    asyncio.run(run_tests())#!/usr/bin/env python3
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

# Test login functionality for a user
async def test_login(page: Page, role: str, user_data: Dict) -> bool:
    """Test login functionality for a specific user role."""
    log_message(f"Testing login for {role} role...", "INFO")
    
    try:
        # Navigate to login page
        await page.goto(f"{BASE_URL}/login.html")
        await page.wait_for_selector("#login-form")
        
        # Fill in login form
        await page.fill("#email", user_data["email"])
        await page.fill("#password", user_data["password"])
        
        # Take screenshot before login
        before_login_screenshot = await take_screenshot(page, f"{role}-before-login")
        
        # Submit form and wait for navigation
        async with page.expect_navigation():
            await page.click("#login-form button[type='submit']")
        
        # Wait for any possible redirects or JS loading
        await page.wait_for_timeout(2000)
        
        # Check if login was successful (look for navigation component)
        is_logged_in = await page.evaluate("() => !!document.querySelector('#app-navigation')")
        
        # Take screenshot after login
        after_login_screenshot = await take_screenshot(page, f"{role}-after-login")
        
        if is_logged_in:
            log_message(f"✅ Successfully logged in as {role}", "INFO")
            record_test_result(f"login-{role}", True, f"Successfully logged in as {role}", after_login_screenshot)
            return True
        else:
            log_message(f"❌ Failed to log in as {role}", "ERROR")
            record_test_result(f"login-{role}", False, f"Failed to log in as {role}", after_login_screenshot)
            return False
    
    except Exception as e:
        log_message(f"❌ Error during login test for {role}: {e}", "ERROR")
        error_screenshot = await take_screenshot(page, f"{role}-login-error")
        record_test_result(f"login-{role}", False, f"Error during login: {str(e)}", error_screenshot)
        return False

# Test dashboard access for a user
async def test_dashboard_access(page: Page, role: str, user_data: Dict) -> Dict:
    """Test dashboard access for a specific user role."""
    log_message(f"Testing dashboard access for {role} role...", "INFO")
    
    results = {
        "expected_access": [],
        "unexpected_access": [],
        "total_checked": 0
    }
    
    # Test expected dashboards (should have access)
    for dashboard in user_data["expected_dashboards"]:
        try:
            log_message(f"Testing access to {dashboard} for {role}...", "INFO")
            
            # Navigate to dashboard
            await page.goto(f"{BASE_URL}/{dashboard}")
            await page.wait_for_timeout(2000)  # Wait for any redirects
            
            # Take screenshot
            screenshot = await take_screenshot(page, f"{role}-{dashboard}")
            
            # Check if access was granted (no access denied message)
            access_denied = await page.evaluate("() => !!document.querySelector('.permission-indicator.no-permission')")
            
            if not access_denied:
                log_message(f"✅ {role} correctly has access to {dashboard}", "INFO")
                record_test_result(f"{role}-access-{dashboard}", True, f"{role} correctly has access to {dashboard}", screenshot)
                results["expected_access"].append(dashboard)
            else:
                log_message(f"❌ {role} unexpectedly denied access to {dashboard}", "ERROR")
                record_test_result(f"{role}-access-{dashboard}", False, f"{role} unexpectedly denied access to {dashboard}", screenshot)
        
        except Exception as e:
            log_message(f"❌ Error testing {dashboard} access for {role}: {e}", "ERROR")
            error_screenshot = await take_screenshot(page, f"{role}-{dashboard}-error")
            record_test_result(f"{role}-access-{dashboard}", False, f"Error testing access: {str(e)}", error_screenshot)
        
        results["total_checked"] += 1
    
    # Test unexpected dashboards (should NOT have access)
    for dashboard in user_data["unexpected_dashboards"]:
        try:
            log_message(f"Testing no-access to {dashboard} for {role}...", "INFO")
            
            # Navigate to dashboard
            await page.goto(f"{BASE_URL}/{dashboard}")
            await page.wait_for_timeout(2000)  # Wait for any redirects
            
            # Take screenshot
            screenshot = await take_screenshot(page, f"{role}-{dashboard}-denied")
            
            # Should see access denied message or be redirected to login
            current_url = page.url
            access_denied = await page.evaluate("""
                () => !!document.querySelector('.permission-indicator.no-permission') || 
                window.location.pathname.includes('login')
            """)
            
            if access_denied:
                log_message(f"✅ {role} correctly denied access to {dashboard}", "INFO")
                record_test_result(f"{role}-noaccess-{dashboard}", True, f"{role} correctly denied access to {dashboard}", screenshot)
                results["unexpected_access"].append(dashboard)
            else:
                log_message(f"❌ {role} unexpectedly granted access to {dashboard}", "ERROR")
                record_test_result(f"{role}-noaccess-{dashboard}", False, f"{role} unexpectedly granted access to {dashboard}", screenshot)
        
        except Exception as e:
            log_message(f"❌ Error testing {dashboard} no-access for {role}: {e}", "ERROR")
            error_screenshot = await take_screenshot(page, f"{role}-{dashboard}-denied-error")
            record_test_result(f"{role}-noaccess-{dashboard}", False, f"Error testing no-access: {str(e)}", error_screenshot)
        
        results["total_checked"] += 1
    
    # Log summary
    success_rate = ((len(results["expected_access"]) + len(results["unexpected_access"])) / results["total_checked"]) * 100
    log_message(f"Dashboard access test for {role}: {success_rate:.2f}% success rate", "INFO")
    
    return results
