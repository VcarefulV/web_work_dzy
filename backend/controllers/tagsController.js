const db = require('../db');

exports.getAllTags = async (req, res) => {
    try {
        const [tags] = await db.execute('SELECT * FROM tags');
        res.json(tags);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
