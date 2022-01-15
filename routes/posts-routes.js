const express = require('express')
const { check } = require('express-validator')

const postsControllers = require('../controllers/posts-controllers')
// const fileUpload = require('../middleware/file-upload');
const checkAuth = require('../middleware/check-auth')
const router = express.Router()

router.use(checkAuth)

//posts/user/:userId GET getAllPostsByUSERID
router.get('/user/:uid', postsControllers.getPostsByUserId)

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
// posts/:pid DELETE
router.delete('/:pid', postsControllers.deletePost)

module.exports = router
