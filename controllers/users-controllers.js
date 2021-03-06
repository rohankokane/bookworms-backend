const { validationResult } = require('express-validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const HttpError = require('../models/http-error')
const User = require('../models/user')

const getUsers = async (req, res, next) => {
  const userId = req.userData.userId

  const keyword = req.query.search
  let regex = new RegExp(keyword, 'i')

  let users
  try {
    users = await User.find({
      $or: [{ username: regex }, { fullname: regex }],
    })
      .where('_id')
      .ne(userId)
  } catch (err) {
    console.log(err)
    const error = new HttpError('Fetching users failed, please try again.', 500)
    return next(error)
  }
  if (users.length === 0) {
    const error = new HttpError('No user found', 404)
    return next(error)
  } else {
    res
      .status(200)
      .json({ users: users.map((user) => user.toObject({ getters: true })) })
  }
}

const getNewUsers = async (userId) => {
  // const userId = req.userData.userId

  let users
  try {
    users = await User.find({}, '-password')
      .where('_id')
      .ne(userId)
      .sort({ _id: -1 })
      .limit(5)
  } catch (err) {
    const error = new HttpError(
      'Fetching users failed, please try again later.',
      500
    )
    throw error
  }
  return users.map((user) => user.toObject({ getters: true }))
}
const getSuggestionList = async (req, res, next) => {
  const userId = req.userData.userId
  let usersList
  try {
    usersList = await getNewUsers(userId)
  } catch (e) {
    next(e)
  }
  res.status(200).json({ users: usersList })
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
  // console.log(createdUser)
  try {
    await createdUser.save()
  } catch (err) {
    const error = new HttpError(
      `Signing up failed, please try again later. ${err}`,
      500
    )
    return next(error)
  }

  let token
  try {
    token = jwt.sign(
      { userId: createdUser.id, email: createdUser.email },
      process.env.JWT_KEY,
      { expiresIn: '30d' }
    )
  } catch (err) {
    const error = new HttpError(
      'Signing up failed, please try again later.',
      500
    )
    return next(error)
  }

  let userData = createdUser.toObject({ getters: true })
  userData.suggestions = await getNewUsers(userData.id)

  delete userData.password
  res.status(201).json({
    userId: createdUser.id,
    email: createdUser.email,
    token: token,
    expirationDate: Date.now() + 2592000 * 1000,
    ...userData,
  })
}

const login = async (req, res, next) => {
  const { email, password } = req.body

  let existingUser

  try {
    existingUser = await User.findOne({ email: email })
      .populate('followers', 'username fullname')
      .populate('following', 'username fullname')
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
      { expiresIn: '30d' }
    )
  } catch (err) {
    const error = new HttpError(
      'Logging in failed, please try again later.',
      500
    )
    return next(error)
  }

  delete existingUser.password
  existingUser = existingUser.toObject({ getters: true })

  existingUser.suggestions = await getNewUsers(existingUser.id)

  res.status(201).json({
    userId: existingUser.id,
    token: token,
    expirationDate: Date.now() + 2592000 * 1000,
    ...existingUser,
  })
}
const bootstrapData = async (req, res, next) => {
  //user id
  const _id = req.userData.userId
  // const _id = req.params.id

  let userData, suggestions, data
  try {
    data = await Promise.allSettled([fetchUserById(_id), getNewUsers(_id)])
  } catch (e) {
    next(e)
  }
  userData = data[0].value
  suggestions = data[1].value
  // console.log(data)
  userData.suggestions = suggestions
  res.status(200).json({ ...userData, userId: userData.id })
}
const fetchUserById = async (_id) => {
  let user
  try {
    user = await User.findById(_id, '-password')
      .populate('followers', 'username fullname image')
      .populate('following', 'username fullname image')
    if (!user) {
      const error = new HttpError('No user found', 404)
      throw error
    }
  } catch (e) {
    const error = new HttpError(
      'Something went wrong, could not get the user',
      500
    )
    throw error
  }
  const userData = user.toObject({ getters: true })
  return userData
}

const getUserById = async (req, res, next) => {
  const _id = req.params.id
  let userData
  try {
    userData = await fetchUserById(_id)
  } catch (e) {
    return next(e)
  }

  res.status(200).json({ ...userData, userId: userData.id })
}

const updateUser = async (req, res, next) => {
  const id = req.params.id
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    )
  }

  // const updates = Object.keys(req.body)
  // const allowedUpdates = ['username', 'fullname', 'bio', 'image']
  // const isValidUpdates = updates.every((update) => {
  //   return allowedUpdates.includes(update)
  // })

  // if (!isValidUpdates) {
  //   const error = new HttpError('invalid updates!', 400)
  //   return next(error)
  // }

  const { username, fullname, image, bio } = req.body

  let user
  try {
    user = await User.findById(id, '-password')
      .populate('followers', 'username fullname')
      .populate('following', 'username fullname')
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not update user.',
      500
    )
    return next(error)
  }

  user.username = username
  user.fullname = fullname
  user.image = image || ''
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

const followProfile = async (req, res, next) => {
  const userId = req.userData.userId
  const profileId = req.params.pid
  try {
    // const sess = await mongoose.startSession()
    // sess.startTransaction()
    // rohan , pratim
    // rohan -> follow pratim
    await User.updateOne({ _id: userId }, { $push: { following: profileId } })
    await User.updateOne({ _id: profileId }, { $push: { followers: userId } })

    // await createdPost.save({ session: sess })
    // user.posts.push(createdPost)
    // await user.save({ session: sess })
    // await sess.commitTransaction()
  } catch (err) {
    const error = new HttpError(
      `Something went wrong, could not follow this profile. ${err}`,
      500
    )
    return next(error)
  }
  res.status(200).json({ message: 'followed this user' })
}
const unfollowProfile = async (req, res, next) => {
  const userId = req.userData.userId
  // console.log('---> userId', userId)
  const profileId = req.params.pid
  // console.log('---> userId', userId, profileId)
  try {
    await User.updateOne({ _id: userId }, { $pull: { following: profileId } })
    await User.updateOne({ _id: profileId }, { $pull: { followers: userId } })
  } catch (err) {
    const error = new HttpError(
      `Something went wrong, could not unfollow this profile. ${err}`,
      500
    )
    return next(error)
    // res
    //   .status(500)
    //   .json({ message: 'could not unfollow this user', error: err })
  }
  res.status(200).json({ message: 'unfollowed this user' })
}

exports.getUsers = getUsers
exports.getSuggestionList = getSuggestionList
exports.signup = signup
exports.login = login
exports.getUserById = getUserById
exports.bootstrapData = bootstrapData
exports.updateUser = updateUser
exports.followProfile = followProfile
exports.unfollowProfile = unfollowProfile
