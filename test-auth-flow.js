#!/usr/bin/env node
/**
 * Test Script for Authentication Flow
 * Tests login, session persistence, and /auth/me endpoint
 */

import dotenv from 'dotenv';
dotenv.config();

const API_URL = `http://localhost:${process.env.PORT || 3000}/api`;
const credentials = {
  email: process.env.ROOT_EMAIL || 'root@admin.com',
  password: process.env.ROOT_PASSWORD || 'root123'
};

console.log('🧪 Testing Authentication Flow\n');
console.log('📍 API URL:', API_URL);
console.log('👤 Testing with:', credentials.email);
console.log('─'.repeat(60));

// Test 1: Health Check
async function testHealth() {
  console.log('\n1️⃣ Testing /api/health endpoint...');
  try {
    const response = await fetch(`${API_URL}/health`);
    const data = await response.json();
    
    console.log('✅ Server is running');
    console.log('   Status:', data.status);
    console.log('   Environment:', data.configuration);
    return true;
  } catch (error) {
    console.error('❌ Health check failed:', error.message);
    console.error('💡 Make sure the server is running: npm start');
    return false;
  }
}

// Test 2: Login
async function testLogin() {
  console.log('\n2️⃣ Testing /api/auth/login endpoint...');
  try {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(credentials),
      credentials: 'include' // Important: Include cookies
    });
    
    const data = await response.json();
    
    if (data.success) {
      console.log('✅ Login successful');
      console.log('   User:', data.data.user.email);
      console.log('   Role:', data.data.user.role);
      
      // Extract cookie from response
      const cookies = response.headers.get('set-cookie');
      console.log('   Session Cookie:', cookies ? 'Set ✓' : 'Not Set ✗');
      
      return { success: true, cookies };
    } else {
      console.error('❌ Login failed:', data.message);
      return { success: false };
    }
  } catch (error) {
    console.error('❌ Login request failed:', error.message);
    return { success: false };
  }
}

// Test 3: Check /auth/me (with cookie)
async function testAuthMe(cookies) {
  console.log('\n3️⃣ Testing /api/auth/me endpoint (with session)...');
  try {
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add cookie if available
    if (cookies) {
      headers['Cookie'] = cookies;
    }
    
    const response = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      headers,
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (response.status === 200 && data.success) {
      console.log('✅ Session validated');
      console.log('   User:', data.data.user.email);
      console.log('   Authenticated:', true);
      return true;
    } else {
      console.error('❌ Session validation failed');
      console.error('   Status:', response.status);
      console.error('   Message:', data.message);
      return false;
    }
  } catch (error) {
    console.error('❌ /auth/me request failed:', error.message);
    return false;
  }
}

// Test 4: Check /auth/me (without cookie)
async function testAuthMeWithoutCookie() {
  console.log('\n4️⃣ Testing /api/auth/me endpoint (without session)...');
  try {
    const response = await fetch(`${API_URL}/auth/me`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (response.status === 401) {
      console.log('✅ Correctly returns 401 for unauthenticated request');
      console.log('   Message:', data.message);
      return true;
    } else {
      console.error('⚠️ Expected 401, got:', response.status);
      return false;
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
    return false;
  }
}

// Run all tests
async function runTests() {
  try {
    // Test 1: Health
    const healthOk = await testHealth();
    if (!healthOk) {
      console.log('\n❌ Tests aborted: Server not running');
      process.exit(1);
    }
    
    // Test 2: Login
    const loginResult = await testLogin();
    if (!loginResult.success) {
      console.log('\n❌ Tests aborted: Login failed');
      process.exit(1);
    }
    
    // Test 3: Auth/me with cookie
    const authMeOk = await testAuthMe(loginResult.cookies);
    
    // Test 4: Auth/me without cookie
    await testAuthMeWithoutCookie();
    
    // Summary
    console.log('\n' + '─'.repeat(60));
    console.log('📊 Test Summary:');
    console.log('   Health Check:', healthOk ? '✅' : '❌');
    console.log('   Login:', loginResult.success ? '✅' : '❌');
    console.log('   Session Validation:', authMeOk ? '✅' : '❌');
    
    if (healthOk && loginResult.success && authMeOk) {
      console.log('\n✅ All tests passed! Authentication is working correctly.');
      console.log('\n💡 Next steps:');
      console.log('   1. Make sure dashboard is using the same domain (localhost)');
      console.log('   2. Verify .env files in both server and dashboard');
      console.log('   3. Check browser console for CORS errors');
    } else {
      console.log('\n❌ Some tests failed. Check the errors above.');
      console.log('\n💡 Common issues:');
      console.log('   1. SESSION_SECRET not set in .env');
      console.log('   2. FRONTEND_URL not matching dashboard URL');
      console.log('   3. Cookies blocked by browser');
      console.log('   4. CORS misconfiguration');
    }
    
  } catch (error) {
    console.error('\n❌ Test suite failed:', error);
    process.exit(1);
  }
}

// Run tests
runTests();

