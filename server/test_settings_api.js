const http = require('http');

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function runTests() {
  console.log('--- STARTING SETTINGS & SECURITY API TESTS ---');

  // Test 1: Student Login
  const loginRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { identifier: '23CSE101', password: 'Student@123', userType: 'STUDENT' }
  );

  console.log('Test 1 (Login):', loginRes.status === 200 ? 'PASS' : 'FAIL', loginRes.status);
  if (!loginRes.data?.data?.token) {
    console.error('Failed to get token:', loginRes);
    process.exit(1);
  }

  const token = loginRes.data.data.token;
  const user = loginRes.data.data.user;
  console.log('Login user settings payload:', {
    darkMode: user.darkMode,
    notificationsEnabled: user.notificationsEnabled,
  });

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };

  // Test 2: GET /api/user/settings
  const getSettingsRes = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/user/settings',
    method: 'GET',
    headers: authHeaders,
  });
  console.log('Test 2 (GET Settings):', getSettingsRes.status === 200 ? 'PASS' : 'FAIL', getSettingsRes.data);

  // Test 3: PUT /api/user/settings
  const updateSettingsRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/user/settings',
      method: 'PUT',
      headers: authHeaders,
    },
    { darkMode: true, notificationsEnabled: false }
  );
  console.log(
    'Test 3 (PUT Settings):',
    updateSettingsRes.status === 200 && updateSettingsRes.data?.data?.darkMode === true
      ? 'PASS'
      : 'FAIL',
    updateSettingsRes.data
  );

  // Test 4: Verify persistence
  const getSettingsRes2 = await request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/user/settings',
    method: 'GET',
    headers: authHeaders,
  });
  console.log(
    'Test 4 (Persistence Check):',
    getSettingsRes2.data?.data?.darkMode === true && getSettingsRes2.data?.data?.notificationsEnabled === false
      ? 'PASS'
      : 'FAIL',
    getSettingsRes2.data
  );

  // Reset settings
  await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/user/settings',
      method: 'PUT',
      headers: authHeaders,
    },
    { darkMode: false, notificationsEnabled: true }
  );

  // Test 5: Wrong current password
  const badPwRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/user/change-password',
      method: 'POST',
      headers: authHeaders,
    },
    {
      currentPassword: 'WrongPassword@123',
      newPassword: 'NewPassword@123',
      confirmPassword: 'NewPassword@123',
    }
  );
  console.log('Test 5 (Wrong current password):', badPwRes.status === 400 ? 'PASS' : 'FAIL', badPwRes.data);

  // Test 6: Mismatched passwords
  const mismatchRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/user/change-password',
      method: 'POST',
      headers: authHeaders,
    },
    {
      currentPassword: 'Student@123',
      newPassword: 'NewPassword@123',
      confirmPassword: 'DifferentPassword@123',
    }
  );
  console.log('Test 6 (Mismatched passwords):', mismatchRes.status === 400 ? 'PASS' : 'FAIL', mismatchRes.data);

  // Test 7: Valid Password Change
  const changeRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/user/change-password',
      method: 'POST',
      headers: authHeaders,
    },
    {
      currentPassword: 'Student@123',
      newPassword: 'NewStudent@1234',
      confirmPassword: 'NewStudent@1234',
    }
  );
  console.log('Test 7 (Change Password Success):', changeRes.status === 200 ? 'PASS' : 'FAIL', changeRes.data);

  // Test 8: Login with newly changed password
  const newLoginRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { identifier: '23CSE101', password: 'NewStudent@1234', userType: 'STUDENT' }
  );
  console.log('Test 8 (Login with new password):', newLoginRes.status === 200 ? 'PASS' : 'FAIL');

  // Test 9: Restore initial password
  const newAuthHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${newLoginRes.data.data.token}`,
  };
  const revertRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/user/change-password',
      method: 'POST',
      headers: newAuthHeaders,
    },
    {
      currentPassword: 'NewStudent@1234',
      newPassword: 'Student@123',
      confirmPassword: 'Student@123',
    }
  );
  console.log('Test 9 (Revert Password):', revertRes.status === 200 ? 'PASS' : 'FAIL');

  // Test 10: Parent Login & Parent Dashboard API
  const parentLoginRes = await request(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    },
    { identifier: '23CSE101', password: 'Parent@123', userType: 'PARENT' }
  );
  console.log('Test 10 (Parent Login):', parentLoginRes.status === 200 ? 'PASS' : 'FAIL');

  if (parentLoginRes.data?.data?.token) {
    const parentDashboardRes = await request({
      hostname: 'localhost',
      port: 5000,
      path: '/api/parent/dashboard',
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${parentLoginRes.data.data.token}`,
      },
    });
    console.log(
      'Test 11 (Parent Dashboard API):',
      parentDashboardRes.status === 200 ? 'PASS' : 'FAIL',
      parentDashboardRes.data?.data?.stats
    );
  }

  console.log('--- ALL BACKEND TESTS COMPLETED ---');
}

runTests().catch(console.error);
