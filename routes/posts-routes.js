const express = require('express')
const { check } = require('express-validator')

const postsControllers = require('../controllers/posts-controllers')
// const fileUpload = require('../middleware/file-upload');
const checkAuth = require('../middleware/check-auth')
const router = express.Router()

router.use(checkAuth)

router.get('/', postsControllers.getAllPosts)
//posts/user/:userId GET getAllPostsByUSERID
router.get('/user/:uid', postsControllers.getPostsByUserId)
router.get('/bookmarked', postsControllers.getBookmarksByUserId)
//posts/:pid GET getPostById
router.get('/:pid', postsControllers.getPostById)
//POST create post
router.post(
  '/',
  [check('caption').not().isEmpty()],
  postsControllers.createPost
)
// posts/:pid PATCH updatePost by pid
router.patch(
  '/:pid',
  [check('caption').not().isEmpty()],
  postsControllers.updatePost
)
router.patch(
  '/addComment/:pid',
  [check('text').not().isEmpty()],
  postsControllers.addComment
)
router.delete('/deleteComment/:cid', postsControllers.deleteComment)
// router.patch(
//   ':pid/removeComment',
//   postsControllers.addComment
// )

router.get('/like/:pid', postsControllers.likePost)
router.get('/unlike/:pid', postsControllers.unlikePost)
router.get('/bookmark/:pid', postsControllers.bookmarkPost)
router.get('/unbookmark/:pid', postsControllers.unbookmarkPost)

// posts/:pid DELETE
router.delete('/:pid', postsControllers.deletePost)

module.exports = router
