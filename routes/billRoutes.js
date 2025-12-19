const express = require('express');
const router = express.Router();
const billController = require('../controllers/billController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/categories', billController.getCategories);
router.get('/billers/:category', billController.getBillers);
router.post('/fetch', verifyToken, billController.fetchBill);
router.post('/pay', verifyToken, billController.payBill);
router.get('/history', verifyToken, billController.getHistory);

module.exports = router;
