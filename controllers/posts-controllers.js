const { validationResult } = require('express-validator')
const mongoose = require('mongoose')

const HttpError = require('../models/http-error')
const Post = require('../models/post')
const User = require('../models/user')

const getPostsByUserId = async (req, res, next) => {
  //get posts by user id
  const userId = req.params.uid

  let userWithPosts
  try {
    userWithPosts = await User.findById(userId).populate('Posts')
  } catch (err) {
    const error = new HttpError(
      'Fetching Posts failed, please try again later.',
      500
    )
    return next(error)
  }

  // if (!Posts || Posts.length === 0) {
  if (!userWithPosts || userWithPosts.Posts.length === 0) {
    return next(
      new HttpError('Could not find Posts for the provided user id.', 404)
    )
  }
  res.json({
    posts: userWithPosts.posts.map((post) => post.toObject({ getters: true })),
  })
}

const getPostById = async (req, res, next) => {
  const postId = req.params.pid

  let post
  try {
    post = await Post.findById(postId)
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not find a post.',
      500
    )
    return next(error)
  }

  if (!post) {
    const error = new HttpError('Could not find post for the provided id.', 404)
    return next(error)
  }

  res.json({ post: post.toObject({ getters: true }) })
}

const createPost = async (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    )
  }
  // add image
  const { caption } = req.body

  const createdPost = new Post({
    caption,
    // location: coordinates,
    // image: req.file.path,
    creator: req.userData.userId,
  })

  let user
  try {
    user = await User.findById(req.userData.userId)
  } catch (err) {
    const error = new HttpError('Creating Post failed, please try again.', 500)
    return next(error)
  }

  if (!user) {
    const error = new HttpError('Could not find user for provided id.', 404)
    return next(error)
  }

  console.log(user)

  try {
    const sess = await mongoose.startSession()
    sess.startTransaction()
    await createdPost.save({ session: sess })
    user.posts.push(createdPost)
    await user.save({ session: sess })
    await sess.commitTransaction()
  } catch (err) {
    const error = new HttpError('Creating post failed, please try again.', 500)
    return next(error)
  }

  res.status(201).json({ post: createdPost })
}

const updatePost = async (req, res, next) => {
  const postId = req.params.pid

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    )
  }

  const { caption } = req.body

  let post
  try {
    post = await Post.findById(postId)
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not update post.',
      500
    )
    return next(error)
  }

  if (post.creator.toString() !== req.userData.userId) {
    const error = new HttpError('You are not allowed to edit this post.', 401)
    return next(error)
  }

  post.caption = caption

  try {
    await post.save()
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not update post.',
      500
    )
    return next(error)
  }

  res.status(200).json({ post: post.toObject({ getters: true }) })
}
const deletePost = async (req, res, next) => {
  const postId = req.params.pid

  let post
  try {
    post = await Post.findById(postId).populate('creator')
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not delete post.',
      500
    )
    return next(error)
  }

  if (!post) {
    const error = new HttpError('Could not find post for this id.', 404)
    return next(error)
  }

  if (post.creator.id !== req.userData.userId) {
    const error = new HttpError('You are not allowed to delete this post.', 401)
    return next(error)
  }

  // const imagePath = post.image;

  try {
    const sess = await mongoose.startSession()
    sess.startTransaction()
    await post.remove({ session: sess })
    post.creator.posts.pull(post)
    await post.creator.save({ session: sess })
    await sess.commitTransaction()
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not delete post.',
      500
    )
    return next(error)
  }

  // fs.unlink(imagePath, err => {
  //   console.log(err);
  // });

  res.status(200).json({ message: 'Deleted post.' })
}

exports.getPostsByUserId = getPostsByUserId
exports.getPostById = getPostById
exports.createPost = createPost
exports.updatePost = updatePost
exports.deletePost = deletePost
