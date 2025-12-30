const db = require('../db');
const fs = require('fs');
const path = require('path');

// Helper to update status in DB for scheduled posts that have passed their publish time
const updateExpiredScheduledPosts = async (posts) => {
    const now = new Date();
    const postsToUpdate = posts.filter(p => p.status === 'scheduled' && p.publish_at && new Date(p.publish_at) <= now);

    if (postsToUpdate.length > 0) {
        try {
            const ids = postsToUpdate.map(p => p.id);
            // Updating one by one to use parameterized queries safely and easily
            await Promise.all(postsToUpdate.map(p =>
                db.execute("UPDATE posts SET status = 'published', created_at = publish_at WHERE id = ?", [p.id])
            ));
            console.log(`Auto-published ${postsToUpdate.length} scheduled posts: IDs ${ids.join(', ')}`);
        } catch (err) {
            console.error('Error auto-publishing posts:', err);
        }
    }
};

exports.getAllPosts = async (req, res) => {
    const currentUserId = req.user ? req.user.id : null;
    const { filter, limit } = req.query;

    try {
        let query = `
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
            FROM posts p 
            JOIN users u ON p.user_id = u.id 
            WHERE (p.status = 'published' OR p.status IS NULL OR (p.status = 'scheduled' AND p.publish_at <= NOW()))
        `;

        const params = [currentUserId, currentUserId, currentUserId];

        // Filter: Follow
        if (filter === 'follow') {
            if (!currentUserId) {
                return res.status(401).json({ message: 'Login required to view followed posts' });
            }
            query += ` AND EXISTS (SELECT 1 FROM follows f WHERE f.followed_id = p.user_id AND f.follower_id = ?)`;
            params.push(currentUserId);
        }

        // Ordering
        if (filter === 'hot') {
            query += ` ORDER BY like_count DESC, p.created_at DESC`;
        } else {
            // Default latest
            query += ` ORDER BY p.created_at DESC`;
        }

        // Limit
        if (limit) {
            const limitVal = parseInt(limit);
            if (!isNaN(limitVal)) {
                query += ` LIMIT ${limitVal}`;
            }
        }

        const [posts] = await db.execute(query, params);

        // Auto-update DB status for scheduled posts
        await updateExpiredScheduledPosts(posts);

        const formattedPosts = posts.map(post => ({
            id: post.id,
            title: post.title,
            content: post.content,
            image: post.image,
            status: (post.status === 'scheduled' && new Date(post.publish_at) <= new Date()) ? 'published' : post.status,
            publishAt: post.publish_at,
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

exports.createPost = async (req, res) => {
    const { title, content, image, status = 'published', publishAt = null } = req.body;
    const userId = req.user.id;

    let imageUrl = null;
    let finalStatus = status;
    let finalPublishAt = publishAt;

    if (finalStatus === 'scheduled') {
        if (!finalPublishAt) {
            return res.status(400).json({ message: 'Scheduled posts must have a publish date' });
        }
        // Ensure it's a valid date object for mysql2
        finalPublishAt = new Date(finalPublishAt);
    } else if (finalStatus === 'published') {
        finalPublishAt = new Date();
    } else {
        finalPublishAt = null;
    }

    try {
        // Handle Image Upload if present
        if (image && image.startsWith('data:image')) {
            // Extract base64
            const base64Data = image.replace(/^data:image\/[a-zA-Z0-9]+;base64,/, "");

            // Create filename
            const filename = `post_${userId}_${Date.now()}.png`;

            // Create timestamp folder structure
            const timestampFolder = Date.now().toString();
            const uploadSubDir = path.join('posts', timestampFolder);
            const uploadDir = path.join(__dirname, '../uploads', uploadSubDir);

            // Ensure directory exists
            if (!fs.existsSync(uploadDir)) {
                fs.mkdirSync(uploadDir, { recursive: true });
            }

            const filePath = path.join(uploadDir, filename);
            fs.writeFileSync(filePath, base64Data, 'base64');

            // Generate URL
            imageUrl = `http://localhost:3000/uploads/${uploadSubDir.replace(/\\/g, '/')}/${filename}`;
        }

        const [result] = await db.execute(
            'INSERT INTO posts (title, content, user_id, image, status, publish_at) VALUES (?, ?, ?, ?, ?, ?)',
            [title, content, userId, imageUrl, finalStatus, finalPublishAt]
        );
        const newPostId = result.insertId;
        const [newPost] = await db.execute('SELECT * FROM posts WHERE id = ?', [newPostId]);
        res.json({ ...newPost[0], likeCount: 0, commentCount: 0, isLiked: false, isFavorited: false });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getPostById = async (req, res) => {
    const postId = req.params.id;
    const currentUserId = req.user ? req.user.id : null;
    try {
        const [posts] = await db.execute(`
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
            FROM posts p 
            JOIN users u ON p.user_id = u.id 
            WHERE p.id = ?
        `, [currentUserId, currentUserId, currentUserId, postId]);

        if (posts.length === 0) return res.status(404).json({ message: 'Post not found' });

        // Auto-update DB status for scheduled posts
        await updateExpiredScheduledPosts(posts);

        const post = posts[0];
        const formattedPost = {
            id: post.id,
            title: post.title,
            content: post.content,
            image: post.image,
            status: (post.status === 'scheduled' && new Date(post.publish_at) <= new Date()) ? 'published' : post.status,
            publishAt: post.publish_at,
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
        };
        res.json(formattedPost);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.toggleLike = async (req, res) => {
    const postId = req.params.id;
    const userId = req.user.id;

    try {
        // Check if like exists
        const [existing] = await db.execute('SELECT * FROM likes WHERE user_id = ? AND post_id = ?', [userId, postId]);

        if (existing.length > 0) {
            // Unlike
            await db.execute('DELETE FROM likes WHERE user_id = ? AND post_id = ?', [userId, postId]);
            res.json({ liked: false });
        } else {
            // Like
            await db.execute('INSERT INTO likes (user_id, post_id) VALUES (?, ?)', [userId, postId]);
            res.json({ liked: true });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.toggleFavorite = async (req, res) => {
    const postId = req.params.id;
    const userId = req.user.id;

    try {
        // Check if favorite exists
        const [existing] = await db.execute('SELECT * FROM favorites WHERE user_id = ? AND post_id = ?', [userId, postId]);

        if (existing.length > 0) {
            // Unfavorite
            await db.execute('DELETE FROM favorites WHERE user_id = ? AND post_id = ?', [userId, postId]);
            res.json({ favorited: false });
        } else {
            // Favorite
            await db.execute('INSERT INTO favorites (user_id, post_id) VALUES (?, ?)', [userId, postId]);
            res.json({ favorited: true });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getPostsByUser = async (req, res) => {
    const username = req.params.username;
    const currentUserId = req.user ? req.user.id : null;

    try {
        const [users] = await db.execute('SELECT id FROM users WHERE username = ?', [username]);
        if (users.length === 0) return res.json([]);
        const targetUserId = users[0].id;

        let query = "SELECT p.*, u.username as author_username FROM posts p JOIN users u ON p.user_id = u.id WHERE u.id = ?";

        if (currentUserId !== targetUserId) {
            query += " AND (p.status = 'published' OR p.status IS NULL OR (p.status = 'scheduled' AND p.publish_at <= NOW()))";
        }

        query += " ORDER BY p.created_at DESC";

        const [posts] = await db.execute(query, [targetUserId]);

        // Auto-update DB status for scheduled posts
        await updateExpiredScheduledPosts(posts);

        const formattedPosts = posts.map(post => ({
            id: post.id,
            title: post.title,
            content: post.content,
            image: post.image,
            status: (post.status === 'scheduled' && new Date(post.publish_at) <= new Date()) ? 'published' : post.status,
            publishAt: post.publish_at,
            createdAt: post.created_at,
            author: {
                username: post.author_username
            }
        }));

        res.json(formattedPosts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.deletePost = async (req, res) => {
    const postId = req.params.id;
    const userId = req.user.id;

    try {
        // Ownership check
        const [posts] = await db.execute('SELECT user_id FROM posts WHERE id = ?', [postId]);
        if (posts.length === 0) return res.status(404).json({ message: 'Post not found' });

        if (posts[0].user_id !== userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        await db.execute('DELETE FROM posts WHERE id = ?', [postId]);
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updatePost = async (req, res) => {
    const postId = req.params.id;
    const userId = req.user.id;
    const { status } = req.body; // Currently only supporting status update for 'Publish Now'

    try {
        // Ownership check
        const [posts] = await db.execute('SELECT user_id FROM posts WHERE id = ?', [postId]);
        if (posts.length === 0) return res.status(404).json({ message: 'Post not found' });

        if (posts[0].user_id !== userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        if (status) {
            if (status === 'published') {
                await db.execute('UPDATE posts SET status = ?, publish_at = NOW(), created_at = NOW() WHERE id = ?', [status, postId]);
            } else {
                await db.execute('UPDATE posts SET status = ? WHERE id = ?', [status, postId]);
            }
        }
        // If we want to support editing content too, we'd add fields here.

        res.json({ message: 'Updated successfully' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
