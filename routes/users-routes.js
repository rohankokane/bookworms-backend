const express = require('express')
const { check } = require('express-validator')

const usersController = require('../controllers/users-controllers')
const checkAuth = require('../middleware/check-auth')

const router = express.Router()

router.post(
  '/signup',
  [
    check('fullname').not().isEmpty(),
    check('username').not().isEmpty(),
    check('email').normalizeEmail().isEmail(),
    check('password').isLength({ min: 6 }),
  ],
  usersController.signup
)
router.post('/login', usersController.login)

router.use(checkAuth)

router.get('/', usersController.getUsers)
// router.get('/bootstrap', usersController.bootstrapData)
router.get('/:id', usersController.getUserById)
router.patch('/:id', usersController.updateUser)

module.exports = router
