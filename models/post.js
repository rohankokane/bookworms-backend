const mongoose = require('mongoose')
const { Schema } = mongoose

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
const postSchema = new Schema(
  {
    caption: { type: String },
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

module.exports = mongoose.model('Post', postSchema)
