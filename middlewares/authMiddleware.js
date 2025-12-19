const jwt = require('jsonwebtoken');

exports.verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(403).json({ message: 'No token provided' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        req.userId = decoded.userId;
        next();
    });
};

exports.verifyTempToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(403).json({ message: 'No token provided' });
    }

    jwt.verify(token, process.env.JWT_TEMP_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Unauthorized or Token Expired' });
        }
        if (decoded.purpose !== '2FA_PENDING') {
            return res.status(401).json({ message: 'Invalid token purpose' });
        }
        req.userId = decoded.userId;
        next();
    });
};
