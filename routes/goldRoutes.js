const express = require('express');
const router = express.Router();
const goldController = require('../controllers/goldController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/rates', goldController.getRates);
router.get('/portfolio', verifyToken, goldController.getPortfolio);
router.post('/buy/quote', verifyToken, goldController.getQuote);
router.post('/buy/confirm', verifyToken, goldController.confirmBuy);
router.post('/sell', verifyToken, goldController.sellGold);

module.exports = router;
