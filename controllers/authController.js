const prisma = require('../prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const SALT_ROUNDS = 10;

exports.register = async (req, res) => {
    try {
        const { mobile, password, fullName } = req.body;

        const existingUser = await prisma.user.findUnique({ where: { mobile } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

        // Generate random 12-digit account number
        const accountNo = '9' + Math.floor(10000000000 + Math.random() * 90000000000).toString();

        const user = await prisma.user.create({
            data: {
                mobile,
                passwordHash,
                fullName,
                email: `${mobile}@example.com`,
                accountNo,
                balance: 1000.00, // Joining Bonus
                transactions: {
                    create: {
                        amount: 1000.00,
                        type: 'CREDIT',
                        category: 'JOINING_BONUS',
                        description: 'Welcome Bonus',
                        status: 'SUCCESS',
                        balanceAfter: 1000.00
                    }
                }
            }
        });

        res.status(201).json({ userId: user.id, message: 'Login to continue' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.loginInitiate = async (req, res) => {
    try {
        const { mobile, password } = req.body;

        const user = await prisma.user.findUnique({ where: { mobile } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpSecret = await bcrypt.hash(otp, SALT_ROUNDS);
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

        await prisma.user.update({
            where: { id: user.id },
            data: { otpSecret, otpExpiry }
        });

        // Generate Temp Token
        const tempToken = jwt.sign(
            { userId: user.id, purpose: '2FA_PENDING' },
            process.env.JWT_TEMP_SECRET,
            { expiresIn: '5m' }
        );

        // In a real app, send SMS here.
        console.log(`[DEV] OTP for ${mobile}: ${otp}`);

        res.json({ message: 'OTP Sent', tempToken, devOtp: otp });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.loginVerify = async (req, res) => {
    try {
        const { otp } = req.body;
        const userId = req.userId; // From middleware

        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user || !user.otpSecret || !user.otpExpiry) {
            return res.status(400).json({ message: 'Invalid request' });
        }

        if (new Date() > user.otpExpiry) {
            return res.status(400).json({ message: 'OTP Expired' });
        }

        const isOtpMatch = await bcrypt.compare(otp, user.otpSecret);
        if (!isOtpMatch) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        // Clear OTP
        await prisma.user.update({
            where: { id: userId },
            data: { otpSecret: null, otpExpiry: null }
        });

        // Generate Tokens
        const accessToken = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        const refreshToken = jwt.sign({ userId: user.id }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });

        // Create Session
        await prisma.session.create({
            data: {
                userId: user.id,
                refreshToken
            }
        });

        res.json({ accessToken, refreshToken });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) return res.status(401).json({ message: 'No token provided' });

        const session = await prisma.session.findUnique({ where: { refreshToken } });
        if (!session) return res.status(403).json({ message: 'Invalid refresh token' });

        jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
            if (err) return res.status(403).json({ message: 'Invalid token' });

            const accessToken = jwt.sign({ userId: decoded.userId }, process.env.JWT_SECRET, { expiresIn: '1h' });
            res.json({ accessToken });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
