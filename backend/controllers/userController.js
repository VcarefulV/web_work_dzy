const db = require('../db');

exports.getCurrentUser = async (req, res) => {
    // req.user is already set by middleware
    // Return safe user info
    const { password, ...userWithoutPassword } = req.user;

    // Get follow stats
    try {
        const [stats] = await db.execute(`
            SELECT 
                (SELECT COUNT(*) FROM follows WHERE followed_id = ?) as followers_count,
                (SELECT COUNT(*) FROM follows WHERE follower_id = ?) as following_count,
                (SELECT COUNT(*) FROM posts WHERE user_id = ?) as post_count
            FROM dual
        `, [req.user.id, req.user.id, req.user.id]);

        res.json({ ...userWithoutPassword, stats: stats[0] });
    } catch (err) {
        console.error(err);
        res.json(userWithoutPassword); // Fallback
    }
};

exports.getUserProfile = async (req, res) => {
    const username = req.params.username;
    const currentUserId = req.user ? req.user.id : null;

    try {
        const [users] = await db.execute(`
            SELECT id, username, email, created_at,
            (SELECT COUNT(*) FROM follows WHERE followed_id = users.id) as followers_count,
            (SELECT COUNT(*) FROM follows WHERE follower_id = users.id) as following_count,
            (SELECT COUNT(*) FROM posts WHERE user_id = users.id) as post_count,
            (SELECT COUNT(*) FROM follows WHERE follower_id = ? AND followed_id = users.id) as is_followed
            FROM users 
            WHERE username = ?
        `, [currentUserId, username]);

        if (users.length === 0) return res.status(404).json({ message: 'User not found' });

        const user = users[0];
        res.json({
            ...user,
            isFollowed: user.is_followed > 0
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.toggleFollow = async (req, res) => {
    const targetUserId = req.body.userId;
    const currentUserId = req.user.id;

    if (targetUserId == currentUserId) {
        return res.status(400).json({ message: 'Cannot follow yourself' });
    }

    try {
        // Check if exists
        const [existing] = await db.execute('SELECT * FROM follows WHERE follower_id = ? AND followed_id = ?', [currentUserId, targetUserId]);

        if (existing.length > 0) {
            // Unfollow
            await db.execute('DELETE FROM follows WHERE follower_id = ? AND followed_id = ?', [currentUserId, targetUserId]);
            res.json({ followed: false });
        } else {
            // Follow
            await db.execute('INSERT INTO follows (follower_id, followed_id) VALUES (?, ?)', [currentUserId, targetUserId]);
            res.json({ followed: true });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
