const mongoose = require('mongoose')
const { Schema } = mongoose

const commentSchema = new Schema(
  {
    text: String,
    post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post',
      required: 'post is required to add a comment',
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: 'user is required to add a comment',
    },
    childrenComments: [
      {
        text: String,
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
          required: 'user is required to add a comment',
        },
      },
    ],
  },
  {
    timestamps: true,
  }
)

module.exports = mongoose.model('Comment', commentSchema)
