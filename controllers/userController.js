const prisma = require('../prisma/client');

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
                createdAt: true
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
