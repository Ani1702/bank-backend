const axios = require('axios');

const BASE_URL = 'http://localhost:8080/api/v1';
const MOBILE = '99' + Math.floor(10000000 + Math.random() * 90000000);
const PASSWORD = 'password123';
const EMAIL = `test_${MOBILE}@customemail.com`;

async function runTests() {
    try {
        console.log(`Testing with Mobile: ${MOBILE} and Email: ${EMAIL}`);

        // 1. Register
        console.log('\n1. Registering...');
        try {
            const res = await axios.post(`${BASE_URL}/auth/register`, {
                mobile: MOBILE,
                password: PASSWORD,
                fullName: 'Test User',
                email: EMAIL
            });
            console.log('✅ Registered');
            console.log('Response:', res.data);
        } catch (e) {
            console.error('❌ Registration Failed:', e.response ? e.response.data : e.message);
            process.exit(1);
        }

        // 2. Login Initiate
        console.log('\n2. Login Initiate...');
        const initRes = await axios.post(`${BASE_URL}/auth/login/initiate`, {
            mobile: MOBILE,
            password: PASSWORD
        });
        const { tempToken, devOtp } = initRes.data;
        console.log(`✅ OTP Sent. Dev OTP: ${devOtp}`);

        // 3. Login Verify
        console.log('\n3. Login Verify...');
        const verifyRes = await axios.post(
            `${BASE_URL}/auth/login/verify`,
            { otp: devOtp },
            { headers: { Authorization: `Bearer ${tempToken}` } }
        );
        const { accessToken } = verifyRes.data;
        console.log('✅ Logged In. Access Token received.');

        const authHeaders = { headers: { Authorization: `Bearer ${accessToken}` } };

        // 4. Get Profile to verify Email
        console.log('\n4. Get Profile to verify Email...');
        const profileRes = await axios.get(`${BASE_URL}/user/profile`, authHeaders);
        console.log(`✅ Profile Email: ${profileRes.data.user.email}`);

        if (profileRes.data.user.email === EMAIL) {
            console.log('🎉 SUCCESS: Email matches the provided email!');
        } else {
            console.error(`❌ FAILURE: Email mismatch! Expected ${EMAIL}, got ${profileRes.data.user.email}`);
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Test Failed:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

runTests();
