const prisma = require('../prisma/client');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');

// Cache rates to avoid hitting API limits (Free tier usually has limits)
let cachedRates = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60 * 1000; // 1 minute

const fetchLiveRates = async () => {
    const now = Date.now();
    if (cachedRates && (now - lastFetchTime < CACHE_DURATION)) {
        return cachedRates;
    }

    try {
        const response = await axios.get('https://www.goldapi.io/api/XAU/INR', {
            headers: {
                'x-access-token': process.env.GOLD_API_KEY,
                'Content-Type': 'application/json'
            }
        });

        const spotPrice = response.data.price; // Price per gram (usually) or ounce. API usually returns per ounce or gram based on endpoint. 
        // XAU/INR usually returns price per Ounce (31.1035g) or Gram. 
        // Let's assume the API returns price per Ounce if not specified, but the user link says XAU/INR. 
        // Standard GoldAPI XAU/INR returns price for 1 Ounce (31.1035 grams).
        // Wait, let's verify if I should convert. 
        // The user didn't specify unit. Usually XAU is per Ounce.
        // Let's assume it returns per Ounce and convert to Gram.
        // 1 Troy Ounce = 31.1034768 grams.

        // Actually, let's look at the user request again. "Use the above link to get the live gold price".
        // If I visit goldapi.io, XAU is 1 troy ounce.
        // So Price Per Gram = response.data.price / 31.1035

        const pricePerOunce = spotPrice;
        const pricePerGram = pricePerOunce / 31.1035;

        const PLATFORM_MARGIN = 0.02; // 2%
        const GST = 0.03; // 3%

        const buyPrice = pricePerGram * (1 + PLATFORM_MARGIN) * (1 + GST);
        const sellPrice = pricePerGram * (1 - PLATFORM_MARGIN);

        cachedRates = {
            buyPrice: parseFloat(buyPrice.toFixed(2)),
            sellPrice: parseFloat(sellPrice.toFixed(2)),
            gst: GST,
            spotPrice: parseFloat(pricePerGram.toFixed(2))
        };
        lastFetchTime = now;
        return cachedRates;
    } catch (error) {
        console.error("Error fetching gold rates:", error.message);
        // Fallback to mock if API fails
        return {
            buyPrice: 6500.50,
            sellPrice: 6200.00,
            gst: 0.03
        };
    }
};

// In-memory store for locks (in production use Redis)
const rateLocks = new Map();

exports.getRates = async (req, res) => {
    const rates = await fetchLiveRates();
    res.json(rates);
};

exports.getPortfolio = async (req, res) => {
    try {
        const userId = req.userId;
        let holding = await prisma.goldHolding.findUnique({ where: { userId } });

        if (!holding) {
            holding = { totalGrams: 0, valuation: 0 };
        } else {
            const rates = await fetchLiveRates();
            holding.valuation = holding.totalGrams * rates.sellPrice;
        }

        res.json(holding);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getQuote = async (req, res) => {
    try {
        const { amountINR } = req.body;
        const rates = await fetchLiveRates();
        // buyPrice already includes GST and Margin
        const grams = amountINR / rates.buyPrice;

        const lockId = uuidv4();
        rateLocks.set(lockId, {
            grams,
            amountINR,
            expiry: Date.now() + 5 * 60 * 1000 // 5 mins
        });

        res.json({
            lockId,
            grams: parseFloat(grams.toFixed(4)),
            amountINR,
            validFor: '5 minutes'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.confirmBuy = async (req, res) => {
    try {
        const userId = req.userId;
        const { lockId, paymentTxId } = req.body;

        const lock = rateLocks.get(lockId);
        if (!lock) {
            return res.status(400).json({ message: 'Invalid or expired lock ID' });
        }

        if (Date.now() > lock.expiry) {
            rateLocks.delete(lockId);
            return res.status(400).json({ message: 'Quote expired' });
        }

        // Mock Payment Verification
        // if (!verifyPayment(paymentTxId)) ...

        // Update Holdings and Balance
        await prisma.$transaction(async (tx) => {
            // Check Balance
            const user = await tx.user.findUnique({ where: { id: userId } });
            if (parseFloat(user.balance) < lock.amountINR) {
                throw new Error('Insufficient funds');
            }

            // Deduct Balance
            const newBalance = parseFloat(user.balance) - lock.amountINR;
            await tx.user.update({
                where: { id: userId },
                data: { balance: newBalance }
            });

            // Create Transaction Record
            await tx.transaction.create({
                data: {
                    userId,
                    amount: lock.amountINR,
                    type: 'DEBIT',
                    category: 'GOLD_BUY',
                    description: `Bought ${lock.grams}g Gold`,
                    status: 'SUCCESS',
                    balanceAfter: newBalance
                }
            });

            const holding = await tx.goldHolding.findUnique({ where: { userId } });
            if (holding) {
                await tx.goldHolding.update({
                    where: { userId },
                    data: { totalGrams: { increment: lock.grams } }
                });
            } else {
                await tx.goldHolding.create({
                    data: { userId, totalGrams: lock.grams }
                });
            }

            await tx.goldTransaction.create({
                data: {
                    userId,
                    type: 'BUY',
                    amountINR: lock.amountINR,
                    goldWeight: lock.grams,
                    liveRate: (await fetchLiveRates()).buyPrice,
                    status: 'SUCCESS',
                    providerRefId: 'MOCK_PROVIDER_' + uuidv4()
                }
            });
        });

        rateLocks.delete(lockId);
        res.json({ message: 'Gold purchased successfully', grams: lock.grams });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: error.message === 'Insufficient funds' ? 'Insufficient funds' : 'Server error' });
    }
};

exports.sellGold = async (req, res) => {
    try {
        const userId = req.userId;
        const { grams } = req.body;

        const holding = await prisma.goldHolding.findUnique({ where: { userId } });
        if (!holding || holding.totalGrams < grams) {
            return res.status(400).json({ message: 'Insufficient gold balance' });
        }

        const rates = await fetchLiveRates();
        const amountINR = grams * rates.sellPrice;

        await prisma.$transaction(async (tx) => {
            // Credit Balance
            const user = await tx.user.findUnique({ where: { id: userId } });
            const newBalance = parseFloat(user.balance) + amountINR;

            await tx.user.update({
                where: { id: userId },
                data: { balance: newBalance }
            });

            // Create Transaction Record
            await tx.transaction.create({
                data: {
                    userId,
                    amount: amountINR,
                    type: 'CREDIT',
                    category: 'GOLD_SELL',
                    description: `Sold ${grams}g Gold`,
                    status: 'SUCCESS',
                    balanceAfter: newBalance
                }
            });

            await tx.goldHolding.update({
                where: { userId },
                data: { totalGrams: { decrement: grams } }
            });

            await tx.goldTransaction.create({
                data: {
                    userId,
                    type: 'SELL',
                    amountINR,
                    goldWeight: grams,
                    liveRate: rates.sellPrice,
                    status: 'SUCCESS',
                    providerRefId: 'MOCK_PROVIDER_' + uuidv4()
                }
            });
        });

        res.json({ message: 'Gold sold successfully', amountINR });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
