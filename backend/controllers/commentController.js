const db = require('../db');
const fs = require('fs');
const path = require('path');

exports.createComment = async (req, res) => {
    const { content, post, image } = req.body;
    // Frontend sends { content, post: { id: ... } } or just { content, postId }
    // Based on previous Java implementation, frontend sends nested object.
    // Let's support both or check. 
    // In PostDetail.vue: { content: ..., post: { id: postId } }

    const postId = post?.id || req.body.postId;
    const userId = req.user.id;

    if (!postId) return res.status(400).json({ message: 'Post ID required' });

    let imageUrl = null;

    try {
        // Handle Image Upload if present
        if (image && image.startsWith('data:image')) {
            // Extract base64
            const base64Data = image.replace(/^data:image\/[a-zA-Z0-9]+;base64,/, "");

            // Create filename
            const filename = `comment_${userId}_${Date.now()}.png`;

            // Create timestamp folder structure
            const timestampFolder = Date.now().toString();
            const uploadSubDir = path.join('comments', timestampFolder);
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

        const [result] = await db.execute('INSERT INTO comments (content, user_id, post_id, image) VALUES (?, ?, ?, ?)', [content, userId, postId, imageUrl]);
        const newCommentId = result.insertId;

        // Return comment with author info
        const [comments] = await db.execute(`
            SELECT c.*, u.username as author_username, u.avatar as author_avatar
            FROM comments c 
            JOIN users u ON c.user_id = u.id 
            WHERE c.id = ?
        `, [newCommentId]);

        const comment = comments[0];
        res.json({
            id: comment.id,
            content: comment.content,
            image: comment.image,
            createdAt: comment.created_at,
            author: {
                username: comment.author_username,
                avatar: comment.author_avatar
            }
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
            SELECT c.*, u.username as author_username, u.avatar as author_avatar
            FROM comments c 
            JOIN users u ON c.user_id = u.id 
            WHERE c.post_id = ?
            ORDER BY c.created_at ASC
        `, [postId]);

        const formattedComments = comments.map(comment => ({
            id: comment.id,
            content: comment.content,
            image: comment.image,
            createdAt: comment.created_at,
            author: {
                username: comment.author_username,
                avatar: comment.author_avatar
            }
        }));

        res.json(formattedComments);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
};
