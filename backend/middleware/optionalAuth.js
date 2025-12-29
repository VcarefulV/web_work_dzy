const db = require('../db');

const optionalAuth = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        req.user = null;
        return next();
    }

    const auth = new Buffer.from(authHeader.split(' ')[1], 'base64').toString().split(':');
    const username = auth[0];
    const password = auth[1];

    try {
        const [users] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0) {
            // Provided auth but invalid user - treat as anonymous or error? 
            // Better to return 401 if they TRIED to login but failed.
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = users[0];
        if (user.password !== password) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        req.user = user;
        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Server error' });
    }
};

module.exports = optionalAuth;
