const mongoose = require('mongoose')
const { Schema } = mongoose

const postSchema = new Schema(
  {
    caption: { type: String },
    // image :String,
    // likes:String,
    // bookmark:String,
    // comments :[{
    //     parrentComment :String,
    //     _id:{
    //         type :mongoose.Schema.Types.ObjectId,
    //         ref :"User",
    //         required:false
    //       }
    // }],
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    bookmarks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    creator: { type: mongoose.Types.ObjectId, required: true, ref: 'User' },
  },
  {
    timestamps: true,
  }
)

const Post = mongoose.model('Post', postSchema)

module.exports = { Post }
