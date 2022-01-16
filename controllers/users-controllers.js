const { validationResult } = require('express-validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const HttpError = require('../models/http-error')
const User = require('../models/user')

const getUsers = async (req, res, next) => {
  let users
  try {
    users = await User.find({}, '-password')
  } catch (err) {
    const error = new HttpError(
      'Fetching users failed, please try again later.',
      500
    )
    return next(error)
  }
  res.json({ users: users.map((user) => user.toObject({ getters: true })) })
}

const signup = async (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    )
  }

  const { username, fullname, email, password, image, bio } = req.body

  let existingUser
  try {
    existingUser = await User.findOne({ email: email })
  } catch (err) {
    const error = new HttpError(
      'Signing up failed, please try again later.',
      500
    )
    return next(error)
  }

  if (existingUser) {
    const error = new HttpError(
      'User exists already, please login instead.',
      422
    )
    return next(error)
  }

  let hashedPassword
  try {
    hashedPassword = await bcrypt.hash(password, 12)
  } catch (err) {
    const error = new HttpError('Could not create user, please try again.', 500)
    return next(error)
  }

  const createdUser = new User({
    username,
    fullname,
    email,
    password: hashedPassword,
    image,
    bio,
    followers: [],
    following: [],
  })

  try {
    await createdUser.save()
  } catch (err) {
    const error = new HttpError(
      'Signing up failed, please try again later.',
      500
    )
    return next(error)
  }

  let token
  try {
    token = jwt.sign(
      { userId: createdUser.id, email: createdUser.email },
      process.env.JWT_KEY,
      { expiresIn: '1h' }
    )
  } catch (err) {
    const error = new HttpError(
      'Signing up failed, please try again later.',
      500
    )
    return next(error)
  }

  res
    .status(201)
    .json({ userId: createdUser.id, email: createdUser.email, token: token })
}

const login = async (req, res, next) => {
  const { email, password } = req.body

  let existingUser

  try {
    existingUser = await User.findOne({ email: email })
  } catch (err) {
    const error = new HttpError(
      'Logging in failed, please try again later.',
      500
    )
    return next(error)
  }

  if (!existingUser) {
    const error = new HttpError(
      'Invalid credentials, could not log you in.',
      403
    )
    return next(error)
  }

  let isValidPassword = false
  try {
    isValidPassword = await bcrypt.compare(password, existingUser.password)
  } catch (err) {
    const error = new HttpError(
      'Could not log you in, please check your credentials and try again.',
      500
    )
    return next(error)
  }

  if (!isValidPassword) {
    const error = new HttpError(
      'Invalid credentials, could not log you in.',
      403
    )
    return next(error)
  }

  let token
  try {
    token = jwt.sign(
      { userId: existingUser.id, email: existingUser.email },
      process.env.JWT_KEY,
      { expiresIn: '1h' }
    )
  } catch (err) {
    const error = new HttpError(
      'Logging in failed, please try again later.',
      500
    )
    return next(error)
  }

  delete existingUser.password
  res.json({
    userId: existingUser.id,
    token: token,
    ...existingUser,
  })
}

// const bootstrapData = async (req, res, next) => {
//   const _id = req.userData.userId
//   req.params.id = _id
//   try {
//     const userData = await getUserById()
//   } catch (e) {
//     const error = new HttpError(
//       'Something went wrong, could not get the user',
//       500
//     )
//     return next(error)
//   }
// }

const getUserById = async (req, res, next) => {
  const _id = req.params.id

  try {
    const user = await User.findById(_id, '-password')
    if (!user) {
      const error = new HttpError('No user found', 404)
      return next(error)
    }
    res.status(200).json({ user: user.toObject({ getters: true }) })
  } catch (e) {
    const error = new HttpError(
      'Something went wrong, could not get the user',
      500
    )
    return next(error)
  }
}

const updateUser = async (req, res, next) => {
  const id = req.params.id
  const errors = validationResult(req)

  const updates = Object.keys(req.body)
  const allowedUpdates = ['username', 'fullname', 'bio', 'image']
  const isValidUpdates = updates.every((update) => {
    return allowedUpdates.includes(update)
  })

  if (!isValidUpdates) {
    const error = new HttpError('invalid updates!', 400)
    return next(error)
  }

  const { username, fullname, image, bio } = req.body

  let user
  try {
    user = await User.findById(id)
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not update user.',
      500
    )
    return next(error)
  }

  user.username = username
  user.fullname = fullname
  user.image = image
  user.bio = bio

  try {
    await user.save()
  } catch (e) {
    const error = new HttpError(
      'Something went wrong, could not update user.',
      500
    )
    return next(error)
  }

  res.status(200).json({ user: user.toObject({ getters: true }) })
}

exports.getUsers = getUsers
exports.signup = signup
exports.login = login
exports.getUserById = getUserById
exports.updateUser = updateUser
