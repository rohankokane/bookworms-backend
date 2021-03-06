const { validationResult } = require('express-validator')
const mongoose = require('mongoose')

const HttpError = require('../models/http-error')
const Post = require('../models/post')
const Comment = require('../models/comment')
const User = require('../models/user')

const getAllPosts = async (req, res, next) => {
  let posts
  try {
    posts = await Post.find({})
      .sort({ createdAt: -1 })
      .populate('creator', '-password')

    // posts.username = posts.user.username
  } catch (err) {
    const error = new HttpError(
      'Fetching Posts failed, please try again later.',
      500
    )
    return next(error)
  }

  // if (!Posts || Posts.length === 0) {
  if (!posts || posts.length === 0) {
    return next(
      new HttpError('Could not find Posts for the provided user id.', 404)
    )
  }
  res.status(200).json({
    posts: posts.map((post) => post.toObject({ getters: true })),
  })
}

const getPostsByUserId = async (req, res, next) => {
  //get posts by user id
  const userId = req.params.uid

  // let posts
  let posts
  try {
    posts = await Post.find({ creator: userId })
      .populate('creator', '-password')
      .sort({ createdAt: -1 })
    // userWithPosts = await User.findById(userId).populate('posts')
  } catch (err) {
    const error = new HttpError(
      'Fetching Posts failed, please try again later.',
      500
    )
    return next(error)
  }

  // if (!Posts || Posts.length === 0) {
  // if (posts.length === 0) {
  //   // res.json({ posts: [], message: 'no posts found' })
  //   return next(
  //     new HttpError('Could not find Posts for the provided user id.', 404)
  //   )
  // }
  res.status(200).json({
    posts: posts.map((post) => post.toObject({ getters: true })),
  })
}

const getBookmarksByUserId = async (req, res, next) => {
  //get posts by user id
  const userId = req.userData.userId

  // let posts
  let posts
  try {
    posts = await Post.find({ bookmarks: userId })
      .populate('creator', '-password')
      .sort({ createdAt: -1 })
    // userWithPosts = await User.findById(userId).populate('posts')
  } catch (err) {
    const error = new HttpError(
      'Fetching Posts failed, please try again later.',
      500
    )
    return next(error)
  }

  // if (!Posts || Posts.length === 0) {
  // if (posts.length === 0) {
  //   // res.json({ posts: [], message: 'no posts found' })
  //   return next(
  //     new HttpError('Could not find Posts for the provided user id.', 404)
  //   )
  // }
  res.status(200).json({
    posts: posts.map((post) => post.toObject({ getters: true })),
  })
}

const getPostById = async (req, res, next) => {
  const postId = req.params.pid

  let post
  try {
    post = await Post.findById(postId)
      .populate('creator', '-password')
      .populate({
        path: 'comments',
        populate: {
          path: 'user',
          select: 'username fullname image',
        },
      })
    post.viewCount = post.viewCount + 1
    post.save()
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

  try {
    const sess = await mongoose.startSession()
    sess.startTransaction()
    await createdPost.save({ session: sess })
    user.posts.push(createdPost)
    await user.save({ session: sess })
    await sess.commitTransaction()
  } catch (err) {
    const error = new HttpError(
      `Creating post failed, please try again. ${err} `,
      500
    )
    return next(error)
  }
  // delete user.password
  createdPost.creator = user
  res.status(201).json({ post: createdPost.toObject({ getters: true }) })
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
    post = await Post.findById(postId).populate('creator', '-password')
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not update post.',
      500
    )
    return next(error)
  }

  if (post.creator.id.toString() !== req.userData.userId) {
    const error = new HttpError('You are not allowed to edit this post.', 401)
    return next(error)
  }

  post.caption = caption
  // update likes , bookmarks, caption

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

const addComment = async (req, res, next) => {
  const postId = req.params.pid
  const userId = req.userData.userId
  const { text } = req.body

  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return next(
      new HttpError('Invalid inputs passed, please check your data.', 422)
    )
  }

  let user
  try {
    user = await User.findById(req.userData.userId)
  } catch (err) {
    const error = new HttpError(
      'Failed to post your comment, please try again.',
      500
    )
    return next(error)
  }

  if (!user) {
    const error = new HttpError(
      'Failed to post your comment, please try again.',
      404
    )
    return next(error)
  }

  let post
  const newComment = new Comment({
    text,
    user: userId,
    post: postId,
  })

  try {
    const sess = await mongoose.startSession()
    sess.startTransaction()
    await newComment.save({ session: sess })
    post = await Post.findOneAndUpdate(
      { _id: postId },
      {
        $push: {
          comments: {
            $each: [newComment],
            $position: 0,
          },
        },
      },
      { returnDocument: 'after' }
    )
    await sess.commitTransaction()
    post = await Post.findById(postId)
      .populate('creator', '-password')
      .populate({
        path: 'comments',
        populate: {
          path: 'user',
          select: 'username fullname image',
        },
      })
  } catch (err) {
    console.log(err)
    const error = new HttpError(
      'Could not post your comment, refresh & try again.',
      500
    )
    return next(error)
  }

  res.status(200).json({ post: post.toObject({ getters: true }) })
}
const deleteComment = async (req, res, next) => {
  const commentId = req.params.cid

  let comment
  try {
    comment = await Comment.findById(commentId)
      .populate('post')
      .populate('user', 'id')
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not delete the comment.',
      500
    )
    return next(error)
  }
  console.log(comment, commentId)
  if (!comment) {
    const error = new HttpError('Could not find the comment for this id.', 404)
    return next(error)
  }
  if (comment.user.id !== req.userData.userId) {
    const error = new HttpError(
      'You are not allowed to delete this comment.',
      401
    )
    return next(error)
  }

  try {
    const sess = await mongoose.startSession()
    sess.startTransaction()
    await comment.remove({ session: sess })
    comment.post.comments.pull(comment)
    await comment.post.save({ session: sess })
    await sess.commitTransaction()
  } catch (err) {
    const error = new HttpError(
      'Something went wrong, could not delete comment.',
      500
    )
    return next(error)
  }

  res.status(200).json({ message: 'Deleted comment.' })
}
const likePost = async (req, res, next) => {
  const userId = req.userData.userId
  const postId = req.params.pid
  try {
    await Post.updateOne({ _id: postId }, { $push: { likes: userId } })
  } catch (err) {
    const error = new HttpError(
      `Something went wrong, could not like the post. ${err}`,
      500
    )
    return next(error)
  }
  res.status(200).json({ message: 'liked the post' })
}

const unlikePost = async (req, res, next) => {
  const userId = req.userData.userId
  const postId = req.params.pid
  try {
    await Post.updateOne({ _id: postId }, { $pull: { likes: userId } })
  } catch (err) {
    const error = new HttpError(
      `Something went wrong, could not unlike the post. ${err}`,
      500
    )
    return next(error)
  }
  res.status(200).json({ message: 'unliked the post' })
}

const bookmarkPost = async (req, res, next) => {
  const userId = req.userData.userId
  const postId = req.params.pid
  try {
    await Post.updateOne({ _id: postId }, { $push: { bookmarks: userId } })
  } catch (err) {
    const error = new HttpError(
      `Something went wrong, could not bookmark the post. ${err}`,
      500
    )
    return next(error)
  }
  res.status(200).json({ message: 'bookmarked the post' })
}

const unbookmarkPost = async (req, res, next) => {
  const userId = req.userData.userId
  const postId = req.params.pid
  try {
    await Post.updateOne({ _id: postId }, { $pull: { bookmarks: userId } })
  } catch (err) {
    const error = new HttpError(
      `Something went wrong, could not unbookmark the post. ${err}`,
      500
    )
    return next(error)
  }
  res.status(200).json({ message: 'unbookmarked the post' })
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

exports.getAllPosts = getAllPosts
exports.getPostsByUserId = getPostsByUserId
exports.getBookmarksByUserId = getBookmarksByUserId
exports.getPostById = getPostById
exports.createPost = createPost
exports.addComment = addComment
exports.deleteComment = deleteComment
exports.updatePost = updatePost
exports.deletePost = deletePost
exports.likePost = likePost
exports.unlikePost = unlikePost
exports.bookmarkPost = bookmarkPost
exports.unbookmarkPost = unbookmarkPost
