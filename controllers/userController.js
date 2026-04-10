const prisma = require('../prisma/client');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10;

exports.getProfile = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                mobile: true,
                email: true,
                fullName: true,
                dob: true,
                panNumber: true,
                kycStatus: true,
                accountNo: true,
                balance: true,
                createdAt: true,
                emailVerified: true,
                mobileVerified: true,
                tempEmail: true,
                tempMobile: true,

            }
        });
        res.json({ user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const userId = req.userId;
        const { fullName, dob } = req.body;

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                fullName,
                dob: dob ? new Date(dob) : undefined
            }
        });

        res.json({ message: 'Profile updated', user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateKYC = async (req, res) => {
    try {
        const userId = req.userId;
        const { panNumber } = req.body;

        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                panNumber,
                kycStatus: 'VERIFIED' // Auto-verify for mock
            }
        });

        res.json({ message: 'KYC details updated', kycStatus: user.kycStatus });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getTransactions = async (req, res) => {
    try {
        const userId = req.userId;
        const transactions = await prisma.transaction.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        res.json({ transactions });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deposit = async (req, res) => {
    try {
        const userId = req.userId;
        const { amount } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid amount' });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });
        const newBalance = parseFloat(user.balance) + parseFloat(amount);

        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: {
                balance: newBalance,
                transactions: {
                    create: {
                        amount: amount,
                        type: 'CREDIT',
                        category: 'DEPOSIT',
                        description: 'Funds Deposited',
                        status: 'SUCCESS',
                        balanceAfter: newBalance
                    }
                }
            }
        });

        res.json({ message: 'Deposit successful', balance: updatedUser.balance });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.initiateContactVerification = async (req, res) => {
    try {
        const userId = req.userId;
        const { type, value } = req.body; // type: 'EMAIL' | 'MOBILE', value: string (optional)

        if (!['EMAIL', 'MOBILE'].includes(type)) {
            return res.status(400).json({ message: 'Invalid type' });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });

        let targetValue = value;
        if (!targetValue) {
            // Verify current
            targetValue = type === 'EMAIL' ? user.email : user.mobile;
        } else {
            // Update flow - Check if already taken
            if (type === 'EMAIL') {
                const existing = await prisma.user.findUnique({ where: { email: value } });
                if (existing) return res.status(400).json({ message: 'Email already in use' });
            } else {
                const existing = await prisma.user.findUnique({ where: { mobile: value } });
                if (existing) return res.status(400).json({ message: 'Mobile already in use' });
            }
        }

        // Generate OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const otpSecret = await bcrypt.hash(otp, SALT_ROUNDS);
        const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

        // Update User
        const updateData = {
            otpSecret,
            otpExpiry
        };

        if (value) {
            if (type === 'EMAIL') updateData.tempEmail = value;
            else updateData.tempMobile = value;
        }

        await prisma.user.update({
            where: { id: userId },
            data: updateData
        });

        // Mock Send OTP
        console.log(`[DEV] OTP for ${targetValue} (${type}): ${otp}`);

        res.json({ message: 'OTP Sent', devOtp: otp });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.verifyContact = async (req, res) => {
    try {
        const userId = req.userId;
        const { type, otp } = req.body;

        if (!['EMAIL', 'MOBILE'].includes(type)) {
            return res.status(400).json({ message: 'Invalid type' });
        }

        const user = await prisma.user.findUnique({ where: { id: userId } });

        if (!user.otpSecret || !user.otpExpiry || new Date() > user.otpExpiry) {
            return res.status(400).json({ message: 'Invalid or expired OTP' });
        }

        const isMatch = await bcrypt.compare(otp, user.otpSecret);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid OTP' });
        }

        const updateData = {
            otpSecret: null,
            otpExpiry: null
        };

        if (type === 'EMAIL') {
            if (user.tempEmail) {
                updateData.email = user.tempEmail;
                updateData.tempEmail = null;
            }
            updateData.emailVerified = true;
        } else {
            if (user.tempMobile) {
                updateData.mobile = user.tempMobile;
                updateData.tempMobile = null;
            }
            updateData.mobileVerified = true;
        }

        await prisma.user.update({
            where: { id: userId },
            data: updateData
        });

        res.json({ message: 'Verification successful' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
