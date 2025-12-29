const db = require('../db');
const fs = require('fs');
const path = require('path');

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
            SELECT id, username, email, avatar, created_at,
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

exports.updateProfile = async (req, res) => {
    const userId = req.user.id;
    let { username, avatar, email, newPassword } = req.body;

    try {
        // Check username uniqueness if changed
        if (username) {
            const [existing] = await db.execute('SELECT id FROM users WHERE username = ? AND id != ?', [username, userId]);
            if (existing.length > 0) {
                return res.status(400).json({ message: '用户名已被使用' });
            }
        }

        // Check email uniqueness if changed
        if (email) {
            const [existingEmail] = await db.execute('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);
            if (existingEmail.length > 0) {
                return res.status(400).json({ message: '邮箱已被使用' });
            }
        }

        const updates = [];
        const params = [];

        if (username) {
            updates.push('username = ?');
            params.push(username);
        }
        if (email) {
            updates.push('email = ?');
            params.push(email);
        }
        if (newPassword) {
            updates.push('password = ?');
            params.push(newPassword); // Plain text storage as per current system
        }

        // Handle Avatar File Save
        if (avatar && avatar.startsWith('data:image')) {
            // Extract extension
            const matches = avatar.match(/^data:image\/([a-zA-Z0-9]+);base64,/);
            if (matches) {
                // const ext = matches[1]; // Extension from base64 header (fallback)
                const base64Data = avatar.replace(/^data:image\/[a-zA-Z0-9]+;base64,/, "");

                // Use provided filename or fallback to timestamp
                let filename = `avatar_${userId}_${Date.now()}.png`; // Default fallback
                if (req.body.avatarFilename) {
                    // Sanitize filename to prevent directory traversal
                    const safeFilename = path.basename(req.body.avatarFilename);
                    filename = safeFilename;
                }

                // Create a unique subfolder for this upload
                const timestampFolder = Date.now().toString();
                const uploadSubDir = path.join('avatars', timestampFolder);
                const uploadDir = path.join(__dirname, '../uploads', uploadSubDir);

                // Ensure directory exists
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }

                // Delete old avatar if exists
                try {
                    const [rows] = await db.execute('SELECT avatar FROM users WHERE id = ?', [userId]);
                    if (rows.length > 0 && rows[0].avatar) {
                        const oldAvatarUrl = rows[0].avatar;
                        // Expected format: http://localhost:3000/uploads/avatars/<timestamp>/filename
                        // We need to extract: avatars/<timestamp>/filename
                        const urlParts = oldAvatarUrl.split('/uploads/');
                        if (urlParts.length > 1) {
                            const relativePath = urlParts[1];
                            const oldFilePath = path.join(__dirname, '../uploads', relativePath); // Uses OS separator

                            if (fs.existsSync(oldFilePath)) {
                                fs.unlinkSync(oldFilePath);
                                console.log(`Deleted old avatar: ${oldFilePath}`);

                                // Optional: Try to delete the parent folder if empty (since we create one per upload)
                                const oldFileDir = path.dirname(oldFilePath);
                                try {
                                    const filesInDir = fs.readdirSync(oldFileDir);
                                    if (filesInDir.length === 0) {
                                        fs.rmdirSync(oldFileDir);
                                        console.log(`Deleted empty avatar directory: ${oldFileDir}`);
                                    }
                                } catch (e) {
                                    // Ignore directory deletion errors
                                    console.log('Could not delete directory or it was not empty');
                                }
                            }
                        }
                    }
                } catch (err) {
                    console.error('Error deleting old avatar:', err);
                    // Continue with upload even if delete fails
                }

                const filePath = path.join(uploadDir, filename);

                fs.writeFileSync(filePath, base64Data, 'base64');

                // Set the public URL (assuming server running on same host/port logic)
                // Use forward slashes for URL
                const avatarUrl = `http://localhost:3000/uploads/${uploadSubDir.replace(/\\/g, '/')}/${filename}`;

                updates.push('avatar = ?');
                params.push(avatarUrl);
            }
        }

        if (updates.length > 0) {
            params.push(userId);
            await db.execute(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
        }

        const [users] = await db.execute('SELECT id, username, email, avatar, created_at FROM users WHERE id = ?', [userId]);
        const updatedUser = users[0];

        const [stats] = await db.execute(`
            SELECT 
                (SELECT COUNT(*) FROM follows WHERE followed_id = ?) as followers_count,
                (SELECT COUNT(*) FROM follows WHERE follower_id = ?) as following_count,
                (SELECT COUNT(*) FROM posts WHERE user_id = ?) as post_count
            FROM dual
        `, [userId, userId, userId]);

        res.json({ ...updatedUser, stats: stats[0] });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: '服务器错误' });
    }
};

exports.getMyFavorites = async (req, res) => {
    const userId = req.user.id;
    try {
        const query = `
            SELECT 
                p.*, 
                u.username as author_username, 
                u.email as author_email,
                u.avatar as author_avatar,
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
                (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked,
                (SELECT COUNT(*) FROM favorites WHERE post_id = p.id AND user_id = ?) as is_favorited,
                (SELECT COUNT(*) FROM follows WHERE follower_id = ? AND followed_id = p.user_id) as is_followed
            FROM favorites f
            JOIN posts p ON f.post_id = p.id
            JOIN users u ON p.user_id = u.id 
            WHERE f.user_id = ?
            ORDER BY f.created_at DESC
        `;

        const [posts] = await db.execute(query, [userId, userId, userId, userId]);

        const formattedPosts = posts.map(post => ({
            id: post.id,
            title: post.title,
            content: post.content,
            createdAt: post.created_at,
            author: {
                id: post.user_id,
                username: post.author_username,
                email: post.author_email,
                avatar: post.author_avatar,
                isFollowed: post.is_followed > 0
            },
            likeCount: post.like_count,
            commentCount: post.comment_count,
            isLiked: post.is_liked > 0,
            isFavorited: post.is_favorited > 0
        }));

        res.json(formattedPosts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getMyLikes = async (req, res) => {
    const userId = req.user.id;
    try {
        const query = `
            SELECT 
                l.created_at as like_time,
                u.username as liker_username,
                u.avatar as liker_avatar,
                p.id as post_id,
                p.title as post_title
            FROM likes l
            JOIN posts p ON l.post_id = p.id
            JOIN users u ON l.user_id = u.id 
            WHERE p.user_id = ?
            ORDER BY l.created_at DESC
        `;

        const [likes] = await db.execute(query, [userId]);

        const formattedLikes = likes.map(like => ({
            id: `like_${like.like_time}_${like.liker_username}`, // Virtual ID for key
            liker: {
                username: like.liker_username,
                avatar: like.liker_avatar
            },
            post: {
                id: like.post_id,
                title: like.post_title
            },
            createdAt: like.like_time
        }));

        res.json(formattedLikes);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
