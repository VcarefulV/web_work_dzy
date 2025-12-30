const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const apiRoutes = require('./routes/api');
const pool = require('./db');

const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api', apiRoutes);

// Database initialization and Server Start
async function startServer() {
    try {
        const connection = await pool.getConnection();
        console.log('Connected to MySQL database!');

        // Auto-migration: Ensure tables exist
        console.log('Verifying database schema...');

        const queries = [
            `CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                username VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                email VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )`,
            `CREATE TABLE IF NOT EXISTS posts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                content TEXT NOT NULL,
                image LONGTEXT,
                status ENUM('published', 'draft', 'scheduled') DEFAULT 'published',
                publish_at TIMESTAMP NULL,
                user_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )`,
            `CREATE TABLE IF NOT EXISTS comments (
                id INT AUTO_INCREMENT PRIMARY KEY,
                content TEXT NOT NULL,
                image LONGTEXT,
                user_id INT NOT NULL,
                post_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
            )`,
            `CREATE TABLE IF NOT EXISTS likes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                post_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
                UNIQUE KEY unique_like (user_id, post_id)
            )`,
            `CREATE TABLE IF NOT EXISTS follows (
                follower_id INT NOT NULL,
                followed_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (follower_id, followed_id),
                FOREIGN KEY (follower_id) REFERENCES users(id),
                FOREIGN KEY (followed_id) REFERENCES users(id)
            )`,
            `CREATE TABLE IF NOT EXISTS favorites (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                post_id INT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
                UNIQUE KEY unique_favorite (user_id, post_id)
            )`
        ];

        for (const query of queries) {
            await connection.execute(query);
        }

        // Migration: Add avatar column if it doesn't exist
        try {
            await connection.execute("ALTER TABLE users ADD COLUMN avatar LONGTEXT");
            console.log("Verified database schema: Added 'avatar' column to users.");
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') {
                console.error("Migration warning (users):", err.message);
            }
        }

        try {
            await connection.execute("ALTER TABLE comments ADD COLUMN image LONGTEXT");
            console.log("Verified database schema: Added 'image' column to comments.");
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') {
                console.error("Migration warning (comments):", err.message);
            }
        }

        try {
            await connection.execute("ALTER TABLE posts ADD COLUMN image LONGTEXT");
            console.log("Verified database schema: Added 'image' column to posts.");
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') {
                console.error("Migration warning (posts):", err.message);
            }
        }

        try {
            await connection.execute("ALTER TABLE posts ADD COLUMN status ENUM('published', 'draft', 'scheduled') DEFAULT 'published'");
            console.log("Verified database schema: Added 'status' column to posts.");
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') {
                console.error("Migration warning (posts status):", err.message);
            }
        }

        try {
            await connection.execute("ALTER TABLE posts ADD COLUMN publish_at TIMESTAMP NULL");
            console.log("Verified database schema: Added 'publish_at' column to posts.");
        } catch (err) {
            if (err.code !== 'ER_DUP_FIELDNAME') {
                console.error("Migration warning (posts publish_at):", err.message);
            }
        }

        console.log('✅ Database schema verified/updated.');
        connection.release();

        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });

    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
}

startServer();
