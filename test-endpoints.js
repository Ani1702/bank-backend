const axios = require('axios');

const BASE_URL = 'http://localhost:8080/api/v1';
const MOBILE = '99' + Math.floor(10000000 + Math.random() * 90000000);
const PASSWORD = 'password123';

async function runTests() {
    try {
        console.log(`Testing with Mobile: ${MOBILE}`);

        // 1. Register
        console.log('\n1. Registering...');
        try {
            await axios.post(`${BASE_URL}/auth/register`, {
                mobile: MOBILE,
                password: PASSWORD,
                fullName: 'Test User'
            });
            console.log('✅ Registered');
        } catch (e) {
            if (e.response && e.response.status === 400) {
                console.log('⚠️ User already exists, proceeding...');
            } else {
                throw e;
            }
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

        // 4. Get Profile
        console.log('\n4. Get Profile...');
        const profileRes = await axios.get(`${BASE_URL}/user/profile`, authHeaders);
        console.log(`✅ Profile: ${profileRes.data.fullName}`);

        // 5. Get Gold Rates
        console.log('\n5. Get Gold Rates...');
        const ratesRes = await axios.get(`${BASE_URL}/gold/rates`);
        console.log(`✅ Buy Price: ${ratesRes.data.buyPrice}`);

        // 6. Buy Gold Quote
        console.log('\n6. Buy Gold Quote...');
        const quoteRes = await axios.post(
            `${BASE_URL}/gold/buy/quote`,
            { amountINR: 5000 },
            authHeaders
        );
        const { lockId, grams } = quoteRes.data;
        console.log(`✅ Quote: ${grams}g for ₹5000 (Lock ID: ${lockId})`);

        // 7. Confirm Buy
        console.log('\n7. Confirm Buy...');
        await axios.post(
            `${BASE_URL}/gold/buy/confirm`,
            { lockId, paymentTxId: 'mock_tx_123' },
            authHeaders
        );
        console.log('✅ Gold Purchased');

        // 8. Get Portfolio
        console.log('\n8. Get Portfolio...');
        const portfolioRes = await axios.get(`${BASE_URL}/gold/portfolio`, authHeaders);
        console.log(`✅ Portfolio: ${portfolioRes.data.totalGrams}g`);

        // 9. Fetch Bill
        console.log('\n9. Fetch Bill...');
        const billRes = await axios.post(
            `${BASE_URL}/bills/fetch`,
            { billerId: 'BESCOM', consumerNo: '1234567890' },
            authHeaders
        );
        console.log(`✅ Bill Amount: ₹${billRes.data.billAmount}`);

        // 10. Pay Bill
        console.log('\n10. Pay Bill...');
        await axios.post(
            `${BASE_URL}/bills/pay`,
            {
                billerId: 'BESCOM',
                consumerNo: '1234567890',
                amount: billRes.data.billAmount,
                refId: 'ref_123'
            },
            authHeaders
        );
        console.log('✅ Bill Paid');

        console.log('\n🎉 All Tests Passed!');
    } catch (error) {
        console.error('❌ Test Failed:', error.response ? error.response.data : error.message);
    }
}

runTests();
