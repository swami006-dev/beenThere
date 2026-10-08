const express = require('express');
const PostsController = require('../controllers/posts.controller');
const { authenticate, optionalAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/mine', authenticate, PostsController.listMyPosts);
router.get('/', optionalAuth, PostsController.listPosts);
router.get('/:id', optionalAuth, PostsController.getPost);
router.post('/', authenticate, PostsController.createPost);
router.patch('/:id', authenticate, PostsController.updatePost);
router.delete('/:id', authenticate, PostsController.deletePost);

module.exports = router;
