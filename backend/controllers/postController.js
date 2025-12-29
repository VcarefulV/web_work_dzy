const db = require('../db');

exports.getAllPosts = async (req, res) => {
    const currentUserId = req.user ? req.user.id : null;
    try {
        // Query to get posts with author info, like/comment counts, and user relationship (liked/followed)
        // Check if current user follows the author
        const [posts] = await db.execute(`
            SELECT 
                p.*, 
                u.username as author_username, 
                u.email as author_email,
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
                (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked,
                (SELECT COUNT(*) FROM follows WHERE follower_id = ? AND followed_id = p.user_id) as is_followed
            FROM posts p 
            JOIN users u ON p.user_id = u.id 
            ORDER BY p.created_at DESC
        `, [currentUserId, currentUserId]);

        const formattedPosts = posts.map(post => ({
            id: post.id,
            title: post.title,
            content: post.content,
            createdAt: post.created_at,
            author: {
                id: post.user_id, // Expose author ID for follow action
                username: post.author_username,
                email: post.author_email,
                isFollowed: post.is_followed > 0
            },
            likeCount: post.like_count,
            commentCount: post.comment_count,
            isLiked: post.is_liked > 0
        }));

        res.json(formattedPosts);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.createPost = async (req, res) => {
    const { title, content } = req.body;
    const userId = req.user.id;

    try {
        const [result] = await db.execute('INSERT INTO posts (title, content, user_id) VALUES (?, ?, ?)', [title, content, userId]);
        const newPostId = result.insertId;
        const [newPost] = await db.execute('SELECT * FROM posts WHERE id = ?', [newPostId]);
        res.json({ ...newPost[0], likeCount: 0, commentCount: 0, isLiked: false });
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
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id) as like_count,
                (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
                (SELECT COUNT(*) FROM likes WHERE post_id = p.id AND user_id = ?) as is_liked,
                (SELECT COUNT(*) FROM follows WHERE follower_id = ? AND followed_id = p.user_id) as is_followed
            FROM posts p 
            JOIN users u ON p.user_id = u.id 
            WHERE p.id = ?
        `, [currentUserId, currentUserId, postId]);

        if (posts.length === 0) return res.status(404).json({ message: 'Post not found' });

        const post = posts[0];
        const formattedPost = {
            id: post.id,
            title: post.title,
            content: post.content,
            createdAt: post.created_at,
            author: {
                id: post.user_id,
                username: post.author_username,
                email: post.author_email,
                isFollowed: post.is_followed > 0
            },
            likeCount: post.like_count,
            commentCount: post.comment_count,
            isLiked: post.is_liked > 0
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

exports.getPostsByUser = async (req, res) => {
    const username = req.params.username;
    try {
        const [posts] = await db.execute(`
            SELECT p.*, u.username as author_username 
            FROM posts p 
            JOIN users u ON p.user_id = u.id 
            WHERE u.username = ?
            ORDER BY p.created_at DESC
        `, [username]);

        const formattedPosts = posts.map(post => ({
            id: post.id,
            title: post.title,
            content: post.content,
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
