const prisma = require('../prisma/client');
const { v4: uuidv4 } = require('uuid');

const CATEGORIES = ['ELECTRICITY', 'WATER', 'BROADBAND_POSTPAID', 'DTH'];
const BILLERS = {
    'ELECTRICITY': [{ id: 'MAHADISCOM', name: 'MSEDCL' }, { id: 'BESCOM', name: 'BESCOM' }],
    'WATER': [{ id: 'BWSSB', name: 'Bangalore Water Supply' }],
    'BROADBAND_POSTPAID': [{ id: 'JIOFIBER', name: 'Jio Fiber' }, { id: 'AIRTEL', name: 'Airtel Xstream' }],
    'DTH': [{ id: 'TATASKY', name: 'Tata Play' }]
};

exports.getCategories = (req, res) => {
    res.json(CATEGORIES);
};

exports.getBillers = (req, res) => {
    const { category } = req.params;
    const billers = BILLERS[category] || [];
    res.json(billers);
};

exports.fetchBill = (req, res) => {
    const { billerId, consumerNo } = req.body;

    // Mock Bill Fetch Logic
    // In real world, call BBPS API

    if (!billerId || !consumerNo) {
        return res.status(400).json({ message: 'Missing details' });
    }

    // Simulate random bill amount
    const amount = Math.floor(Math.random() * 2000) + 500;

    res.json({
        billerId,
        consumerNo,
        billAmount: amount,
        billDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(), // +15 days
        customerName: 'MOCK USER'
    });
};

exports.payBill = async (req, res) => {
    try {
        const userId = req.userId;
        const { billerId, amount, refId, consumerNo } = req.body;

        const txId = uuidv4();
        const bbpsRefId = 'BBPS_' + uuidv4();

        await prisma.$transaction(async (tx) => {
            // Check Balance
            const user = await tx.user.findUnique({ where: { id: userId } });
            if (parseFloat(user.balance) < amount) {
                throw new Error('Insufficient funds');
            }

            // Deduct Balance
            const newBalance = parseFloat(user.balance) - parseFloat(amount);
            await tx.user.update({
                where: { id: userId },
                data: { balance: newBalance }
            });

            // Create Transaction Record
            await tx.transaction.create({
                data: {
                    userId,
                    amount: amount,
                    type: 'DEBIT',
                    category: 'BILL_PAYMENT',
                    description: `Paid Bill to ${billerId}`,
                    status: 'SUCCESS',
                    balanceAfter: newBalance
                }
            });

            await tx.billPayment.create({
                data: {
                    userId,
                    category: 'UNKNOWN', // Ideally fetch from billerId
                    billerId,
                    billerName: 'Unknown Biller', // Ideally fetch from billerId
                    consumerNumber: consumerNo || 'UNKNOWN',
                    billAmount: amount,
                    transactionId: txId,
                    bbpsRefId,
                    status: 'SUCCESS',
                    paymentMode: 'WALLET'
                }
            });
        });

        res.json({
            message: 'Bill Payment Successful',
            transactionId: txId,
            bbpsRefId
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message === 'Insufficient funds' ? 'Insufficient funds' : 'Server error' });
    }
};

exports.getHistory = async (req, res) => {
    try {
        const userId = req.userId;
        const history = await prisma.billPayment.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(history);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
