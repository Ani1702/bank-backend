const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyTempToken } = require('../middlewares/authMiddleware');

router.post('/register', authController.register);
router.post('/login/initiate', authController.loginInitiate);
router.post('/login/verify', verifyTempToken, authController.loginVerify);
router.post('/refresh', authController.refresh);

module.exports = router;
