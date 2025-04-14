// auth-testing.js
// Automated testing script for role-based authentication system
const puppeteer = require('puppeteer');
const fs = require('fs').promises;
const path = require('path');

// Base URL for testing
const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000';

// Test user accounts for different roles
const TEST_USERS = {
  viewer: {
    email: 'viewer@approvideotest.org',
    password: 'viewerPassword123!',
    expectedDashboards: ['public-timeline', 'community-milestones'],
    unexpectedDashboards: ['dashboard', 'expert-dashboard', 'user-management', 'dev-tools']
  },
  editor: {
    email: 'editor@approvideotest.org',
    password: 'editorPassword123!',
    expectedDashboards: ['public-timeline', 'community-milestones', 'dashboard'],
    unexpectedDashboards: ['expert-dashboard', 'user-management', 'dev-tools']
  },
  expert: {
    email: 'expert@approvideotest.org',
    password: 'expertPassword123!',
    expectedDashboards: ['public-timeline', 'community-milestones', 'dashboard', 'expert-dashboard'],
    unexpectedDashboards: ['user-management', 'dev-tools']
  },
  admin: {
    email: 'admin@approvideotest.org',
    password: 'adminPassword123!',
    expectedDashboards: ['public-timeline', 'community-milestones', 'dashboard', 'expert-dashboard', 'user-management'],
    unexpectedDashboards: ['dev-tools']
  },
  developer: {
    email: 'developer@approvideotest.org',
    password: 'developerPassword123!',
    expectedDashboards: ['public-timeline', 'community-milestones', 'dashboard', 'expert-dashboard', 'user-management', 'dev-tools'],
    unexpectedDashboards: []
  }
};

// Test results storage
const testResults = {
  summary: {
    total: 0,
    passed: 0,
    failed: 0,
    timestamp: new Date().toISOString()
  },
  results: []
};

// Setup logging
async function setupLogger() {
  const logDir = path.join(__dirname, 'logs');
  try {
    await fs.mkdir(logDir, { recursive: true });
  } catch (err) {
    console.error('Error creating log directory:', err);
  }
  return path.join(logDir, `auth-test-${new Date().toISOString().replace(/:/g, '-')}.log`);
}

async function logMessage(logFile, message, level = 'INFO') {
  const timestamp = new Date().toISOString();
  const logMessage = `${timestamp} [${level}] ${message}\n`;
  console.log(message);
  try {
    await fs.appendFile(logFile, logMessage);
  } catch (err) {
    console.error('Error writing to log file:', err);
  }
}

// Helper function to record test result
function recordTestResult(test, passed, message, screenshot = null) {
  const result = {
    test,
    passed,
    message,
    timestamp: new Date().toISOString(),
    screenshot
  };
  
  testResults.results.push(result);
  testResults.summary.total++;
  if (passed) {
    testResults.summary.passed++;
  } else {
    testResults.summary.failed++;
  }
  
  return result;
}

// Helper function to take a screenshot
async function takeScreenshot(page, name) {
  const screenshotDir = path.join(__dirname, 'screenshots');
  try {
    await fs.mkdir(screenshotDir, { recursive: true });
    const screenshotPath = path.join(screenshotDir, `${name}-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });
    return screenshotPath;
  } catch (err) {
    console.error('Error taking screenshot:', err);
    return null;
  }
}

// Helper function to save test results
async function saveTestResults() {
  const resultsDir = path.join(__dirname, 'results');
  try {
    await fs.mkdir(resultsDir, { recursive: true });
    const resultsPath = path.join(resultsDir, `auth-test-results-${Date.now()}.json`);
    await fs.writeFile(resultsPath, JSON.stringify(testResults, null, 2));
    console.log(`Test results saved to ${resultsPath}`);
    return resultsPath;
  } catch (err) {
    console.error('Error saving test results:', err);
    return null;
  }
}

// Helper function to create test users if they don't exist
async function createTestUsers(logFile, supabaseClient) {
  await logMessage(logFile, 'Setting up test users...', 'INFO');
  
  for (const [role, userData] of Object.entries(TEST_USERS)) {
    try {
      // Check if user exists
      const { data: existingUser, error: findError } = await supabaseClient
        .from('auth.users')
        .select('id')
        .eq('email', userData.email)
        .single();
      
      if (!existingUser && !findError) {
        // Create user
        const { data: newUser, error } = await supabaseClient.auth.admin.createUser({
          email: userData.email,
          password: userData.password,
          email_confirm: true
        });
        
        if (error) {
          await logMessage(logFile, `Error creating ${role} user: ${error.message}`, 'ERROR');
          continue;
        }
        
        // Assign role
        const { error: roleError } = await supabaseClient
          .from('user_roles')
          .insert([{ user_id: newUser.id, role }]);
        
        if (roleError) {
          await logMessage(logFile, `Error assigning role to ${role} user: ${roleError.message}`, 'ERROR');
        } else {
          await logMessage(logFile, `Created ${role} user: ${userData.email}`, 'INFO');
        }
      } else {
        await logMessage(logFile, `${role} user already exists`, 'INFO');
      }
    } catch (err) {
      await logMessage(logFile, `Unexpected error setting up ${role} user: ${err.message}`, 'ERROR');
    }
  }
}

// Test login functionality for a user
async function testLogin(page, logFile, role, userData) {
  await logMessage(logFile, `Testing login for ${role} role...`, 'INFO');
  
  try {
    // Navigate to login page
    await page.goto(`${BASE_URL}/login.html`);
    await page.waitForSelector('#login-form');
    
    // Fill in login form
    await page.type('#email', userData.email);
    await page.type('#password', userData.password);
    
    // Take screenshot before login
    const beforeLoginScreenshot = await takeScreenshot(page, `${role}-before-login`);
    
    // Submit form
    await Promise.all([
      page.click('#login-form button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);
    
    // Check if login was successful (look for navigation component)
    const isLoggedIn = await page.evaluate(() => {
      return !!document.querySelector('#app-navigation');
    });
    
    // Take screenshot after login
    const afterLoginScreenshot = await takeScreenshot(page, `${role}-after-login`);
    
    if (isLoggedIn) {
      await logMessage(logFile, `✅ Successfully logged in as ${role}`, 'INFO');
      recordTestResult(`login-${role}`, true, `Successfully logged in as ${role}`, afterLoginScreenshot);
      return true;
    } else {
      await logMessage(logFile, `❌ Failed to log in as ${role}`, 'ERROR');
      recordTestResult(`login-${role}`, false, `Failed to log in as ${role}`, afterLoginScreenshot);
      return false;
    }
  } catch (err) {
    await logMessage(logFile, `❌ Error during login test for ${role}: ${err.message}`, 'ERROR');
    const errorScreenshot = await takeScreenshot(page, `${role}-login-error`);
    recordTestResult(`login-${role}`, false, `Error during login: ${err.message}`, errorScreenshot);
    return false;
  }
}

// Test dashboard access for a user
async function testDashboardAccess(page, logFile, role, userData) {
  await logMessage(logFile, `Testing dashboard access for ${role} role...`, 'INFO');
  
  const results = {
    expectedAccess: [],
    unexpectedAccess: [],
    totalChecked: 0
  };
  
  // Test expected dashboards (should have access)
  for (const dashboard of userData.expectedDashboards) {
    try {
      await logMessage(logFile, `Testing access to ${dashboard} for ${role}...`, 'INFO');
      
      // Navigate to dashboard
      await page.goto(`${BASE_URL}/${dashboard}`);
      await page.waitForTimeout(2000); // Wait for any redirects
      
      // Take screenshot
      const screenshot = await takeScreenshot(page, `${role}-${dashboard}`);
      
      // Check if access was granted (no access denied message)
      const accessDenied = await page.evaluate(() => {
        return !!document.querySelector('.permission-indicator.no-permission');
      });
      
      if (!accessDenied) {
        await logMessage(logFile, `✅ ${role} correctly has access to ${dashboard}`, 'INFO');
        recordTestResult(`${role}-access-${dashboard}`, true, `${role} correctly has access to ${dashboard}`, screenshot);
        results.expectedAccess.push(dashboard);
      } else {
        await logMessage(logFile, `❌ ${role} unexpectedly denied access to ${dashboard}`, 'ERROR');
        recordTestResult(`${role}-access-${dashboard}`, false, `${role} unexpectedly denied access to ${dashboard}`, screenshot);
      }
    } catch (err) {
      await logMessage(logFile, `❌ Error testing ${dashboard} access for ${role}: ${err.message}`, 'ERROR');
      const errorScreenshot = await takeScreenshot(page, `${role}-${dashboard}-error`);
      recordTestResult(`${role}-access-${dashboard}`, false, `Error testing access: ${err.message}`, errorScreenshot);
    }
    
    results.totalChecked++;
  }
  
  // Test unexpected dashboards (should NOT have access)
  for (const dashboard of userData.unexpectedDashboards) {
    try {
      await logMessage(logFile, `Testing no-access to ${dashboard} for ${role}...`, 'INFO');
      
      // Navigate to dashboard
      await page.goto(`${BASE_URL}/${dashboard}`);
      await page.waitForTimeout(2000); // Wait for any redirects
      
      // Take screenshot
      const screenshot = await takeScreenshot(page, `${role}-${dashboard}-denied`);
      
      // Should see access denied message or be redirected to login
      const accessDenied = await page.evaluate(() => {
        return !!document.querySelector('.permission-indicator.no-permission') || 
               window.location.pathname.includes('login');
      });
      
      if (accessDenied) {
        await logMessage(logFile, `✅ ${role} correctly denied access to ${dashboard}`, 'INFO');
        recordTestResult(`${role}-noaccess-${dashboard}`, true, `${role} correctly denied access to ${dashboard}`, screenshot);
        results.unexpectedAccess.push(dashboard);
      } else {
        await logMessage(logFile, `❌ ${role} unexpectedly granted access to ${dashboard}`, 'ERROR');
        recordTestResult(`${role}-noaccess-${dashboard}`, false, `${role} unexpectedly granted access to ${dashboard}`, screenshot);
      }
    } catch (err) {
      await logMessage(logFile, `❌ Error testing ${dashboard} no-access for ${role}: ${err.message}`, 'ERROR');
      const errorScreenshot = await takeScreenshot(page, `${role}-${dashboard}-denied-error`);
      recordTestResult(`${role}-noaccess-${dashboard}`, false, `Error testing no-access: ${err.message}`, errorScreenshot);
    }
    
    results.totalChecked++;
  }
  
  // Log summary
  const successRate = ((results.expectedAccess.length + results.unexpectedAccess.length) / results.totalChecked) * 100;
  await logMessage(logFile, `Dashboard access test for ${role}: ${successRate.toFixed(2)}% success rate`, 'INFO');
  
  return results;
}

// Test UI elements visibility based on role
async function testUIElementsVisibility(page, logFile, role) {
  await logMessage(logFile, `Testing UI elements visibility for ${role} role...`, 'INFO');
  
  try {
    // Navigate to main dashboard
    const dashboardToCheck = TEST_USERS[role].expectedDashboards.includes('dashboard') 
      ? 'dashboard' 
      : TEST_USERS[role].expectedDashboards[0];
    
    await page.goto(`${BASE_URL}/${dashboardToCheck}`);
    await page.waitForTimeout(2000);
    
    // Take screenshot
    const screenshot = await takeScreenshot(page, `${role}-ui-elements`);
    
    // Check role-specific elements
    const visibilityResults = await page.evaluate((role) => {
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
    }, role);
    
    // Log results
    await logMessage(logFile, `Role class applied: ${visibilityResults.roleClasses.length > 0}`, 'INFO');
    await logMessage(logFile, `Visible elements: ${visibilityResults.visibleElements.join(', ')}`, 'INFO');
    await logMessage(logFile, `Invisible elements: ${visibilityResults.invisibleElements.join(', ')}`, 'INFO');
    
    // Record test result
    const correctVisibility = visibilityResults.roleClasses.includes(`role-${role}`);
    recordTestResult(`${role}-ui-visibility`, correctVisibility, 
      `UI elements visibility for ${role}: ${correctVisibility ? 'Correct' : 'Incorrect'}`, screenshot);
    
    return visibilityResults;
  } catch (err) {
    await logMessage(logFile, `❌ Error testing UI elements visibility for ${role}: ${err.message}`, 'ERROR');
    const errorScreenshot = await takeScreenshot(page, `${role}-ui-elements-error`);
    recordTestResult(`${role}-ui-visibility`, false, `Error testing UI visibility: ${err.message}`, errorScreenshot);
    return null;
  }
}

// Test logout functionality
async function testLogout(page, logFile, role) {
  await logMessage(logFile, `Testing logout for ${role} role...`, 'INFO');
  
  try {
    // Click logout button
    await page.waitForSelector('.logout-btn');
    
    // Take screenshot before logout
    const beforeLogoutScreenshot = await takeScreenshot(page, `${role}-before-logout`);
    
    // Click logout and wait for redirect
    await Promise.all([
      page.click('.logout-btn'),
      page.waitForNavigation({ waitUntil: 'networkidle0' })
    ]);
    
    // Take screenshot after logout
    const afterLogoutScreenshot = await takeScreenshot(page, `${role}-after-logout`);
    
    // Check if user was redirected to login page
    const url = page.url();
    const isAtLogin = url.includes('/login');
    
    if (isAtLogin) {
      await logMessage(logFile, `✅ Successfully logged out ${role}`, 'INFO');
      recordTestResult(`logout-${role}`, true, `Successfully logged out ${role}`, afterLogoutScreenshot);
      return true;
    } else {
      await logMessage(logFile, `❌ Failed to log out ${role}`, 'ERROR');
      recordTestResult(`logout-${role}`, false, `Failed to log out ${role}`, afterLogoutScreenshot);
      return false;
    }
  } catch (err) {
    await logMessage(logFile, `❌ Error during logout test for ${role}: ${err.message}`, 'ERROR');
    const errorScreenshot = await takeScreenshot(page, `${role}-logout-error`);
    recordTestResult(`logout-${role}`, false, `Error during logout: ${err.message}`, errorScreenshot);
    return false;
  }
}

// Main test runner
async function runTests() {
  // Set up logging
  const logFile = await setupLogger();
  await logMessage(logFile, '🚀 Starting authentication system tests', 'INFO');
  await logMessage(logFile, `Base URL: ${BASE_URL}`, 'INFO');
  
  // Initialize browser
  const browser = await puppeteer.launch({
    headless: process.env.HEADLESS !== 'false',
    defaultViewport: { width: 1280, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    // Run tests for each role
    for (const [role, userData] of Object.entries(TEST_USERS)) {
      const page = await browser.newPage();
      
      // Set user agent and viewport
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await page.setViewport({ width: 1280, height: 800 });
      
      // Enable console log capture
      page.on('console', msg => {
        logMessage(logFile, `[Browser Console] [${role}] ${msg.text()}`, 'DEBUG');
      });
      
      // Test login
      const loginSuccessful = await testLogin(page, logFile, role, userData);
      
      if (loginSuccessful) {
        // Test dashboard access
        await testDashboardAccess(page, logFile, role, userData);
        
        // Test UI elements visibility
        await testUIElementsVisibility(page, logFile, role);
        
        // Test logout
        await testLogout(page, logFile, role);
      }
      
      await page.close();
      await logMessage(logFile, `Completed tests for ${role} role`, 'INFO');
    }
  } catch (err) {
    await logMessage(logFile, `❌ Unexpected error during tests: ${err.message}`, 'ERROR');
  } finally {
    // Close browser
    await browser.close();
    
    // Save test results
    const resultsPath = await saveTestResults();
    
    // Log summary
    await logMessage(logFile, '📊 Test Summary:', 'INFO');
    await logMessage(logFile, `Total tests: ${testResults.summary.total}`, 'INFO');
    await logMessage(logFile, `Passed: ${testResults.summary.passed}`, 'INFO');
    await logMessage(logFile, `Failed: ${testResults.summary.failed}`, 'INFO');
    await logMessage(logFile, `Success rate: ${(testResults.summary.passed / testResults.summary.total * 100).toFixed(2)}%`, 'INFO');
    
    await logMessage(logFile, '✅ Authentication system tests completed', 'INFO');
  }
}

// Run tests
runTests();
