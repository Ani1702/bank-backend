const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { verifyToken } = require('../middlewares/authMiddleware');

router.get('/profile', verifyToken, userController.getProfile);
router.put('/profile', verifyToken, userController.updateProfile);
router.post('/kyc', verifyToken, userController.updateKYC);
router.get('/transactions', verifyToken, userController.getTransactions);
router.post('/deposit', verifyToken, userController.deposit);

module.exports = router;
