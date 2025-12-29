const db = require('../db');

exports.register = async (req, res) => {
    const { username, password, email } = req.body;
    try {
        // Check if user exists
        const [existing] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
        if (existing.length > 0) {
            return res.status(400).json({ message: 'Username already exists' });
        }

        // Insert user (Plaintext password for simplicity/compatibility as decided)
        await db.execute('INSERT INTO users (username, password, email) VALUES (?, ?, ?)', [username, password, email]);

        const [newUser] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
        res.json(newUser[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.login = async (req, res) => {
    const { username, password } = req.body;
    try {
        const [users] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);
        if (users.length === 0 || users[0].password !== password) {
            return res.status(401).json({ message: 'Invalid username or password' });
        }
        res.json(users[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
