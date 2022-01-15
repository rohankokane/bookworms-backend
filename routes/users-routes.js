const express = require('express')
const { check } = require('express-validator')

const usersController = require('../controllers/users-controllers')
const fileUpload = require('../middleware/file-upload')
const checkAuth = require('../middleware/check-auth')

const router = express.Router()


router.post(
  '/signup',
  [
    check('name').not().isEmpty(),
    check('email').normalizeEmail().isEmail(),
    check('password').isLength({ min: 6 }),
  ],
  usersController.signup
)

router.post('/login', usersController.login)

router.use(checkAuth)

router.get('/', usersController.getUsers)
router.get('/:id', usersController.getUserById)
router.patch('/:id', usersController.updateUser)

module.exports = router