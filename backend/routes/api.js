const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const postController = require('../controllers/postController');
const commentController = require('../controllers/commentController');
const userController = require('../controllers/userController');
const aiController = require('../controllers/aiController');
const basicAuth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');

// Auth
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);

// AI Chat
router.post('/ai/chat', aiController.chatWithAI);

// Posts
router.get('/posts/dates', optionalAuth, postController.getPostDates);
router.get('/posts', optionalAuth, postController.getAllPosts);
router.get('/posts/:id', postController.getPostById);
router.get('/posts/user/:username', optionalAuth, postController.getPostsByUser);
router.post('/posts', basicAuth, postController.createPost);
router.post('/posts/:id/like', basicAuth, postController.toggleLike);
router.post('/posts/:id/favorite', basicAuth, postController.toggleFavorite); // New
router.delete('/posts/:id', basicAuth, postController.deletePost);
router.put('/posts/:id', basicAuth, postController.updatePost);


// Comments
router.get('/comments', commentController.getCommentsByPost);
router.post('/comments', basicAuth, commentController.createComment);

// Users
router.get('/users/me', basicAuth, userController.getCurrentUser);
router.put('/users/me', basicAuth, userController.updateProfile);
router.get('/users/me/favorites', basicAuth, userController.getMyFavorites); // New
router.get('/users/me/likes', basicAuth, userController.getMyLikes);         // New
router.post('/users/follow', basicAuth, userController.toggleFollow);
router.get('/users/:username', basicAuth, userController.getUserProfile); // Changed to basicAuth to get isFollowed context if logged in

module.exports = router;
