const db = require('../db');

exports.createComment = async (req, res) => {
    const { content, post } = req.body;
    // Frontend sends { content, post: { id: ... } } or just { content, postId }
    // Based on previous Java implementation, frontend sends nested object.
    // Let's support both or check. 
    // In PostDetail.vue: { content: ..., post: { id: postId } }

    const postId = post?.id || req.body.postId;
    const userId = req.user.id;

    if (!postId) return res.status(400).json({ message: 'Post ID required' });

    try {
        const [result] = await db.execute('INSERT INTO comments (content, user_id, post_id) VALUES (?, ?, ?)', [content, userId, postId]);
        const newCommentId = result.insertId;

        // Return comment with author info
        const [comments] = await db.execute(`
            SELECT c.*, u.username as author_username 
            FROM comments c 
            JOIN users u ON c.user_id = u.id 
            WHERE c.id = ?
        `, [newCommentId]);

        const comment = comments[0];
        res.json({
            id: comment.id,
            content: comment.content,
            createdAt: comment.created_at,
            author: { username: comment.author_username }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.getCommentsByPost = async (req, res) => {
    const postId = req.query.postId;

    try {
        const [comments] = await db.execute(`
            SELECT c.*, u.username as author_username 
            FROM comments c 
            JOIN users u ON c.user_id = u.id 
            WHERE c.post_id = ?
            ORDER BY c.created_at ASC
        `, [postId]);

        const formattedComments = comments.map(comment => ({
            id: comment.id,
            content: comment.content,
            createdAt: comment.created_at,
            author: { username: comment.author_username }
        }));

        res.json(formattedComments);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
