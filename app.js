const express = require('express')
const bodyParser = require('body-parser')
const mongoose = require('mongoose')

const postsRoutes = require('./routes/posts-routes')
const usersRoutes = require('./routes/users-routes')
const HttpError = require('./models/http-error')
const cors = require('cors')
const app = express()

app.options('*', cors())
app.use(cors())
app.use(bodyParser.json())
// app.use((req, res, next) => {
//   res.setHeader('Access-Control-Allow-Origin', '*')
//   res.setHeader(
//     'Access-Control-Allow-Headers',
//     'Origin, X-Requested-With, Content-Type, Accept, Authorization'
//   )
//   res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE')

//   next()
// })

app.use('/api/users', usersRoutes)
app.use('/api/posts', postsRoutes)

app.use((req, res, next) => {
  const error = new HttpError('Could not find this route.', 404)
  throw error
})

app.use((error, req, res, next) => {
  // if (res.headerSent) {
  //   return next(error)
  // }
  res.status(error.code || 500)
  res.json({ message: error.message || 'An unknown error occurred!' })
})
// mongoose.connect(
//   `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.wtuap.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority`
// )
mongoose
  .connect(
    'mongodb+srv://cluster0.wtuap.mongodb.net/bookworms?retryWrites=true&w=majority',
    {
      user: process.env.DB_USER,
      pass: process.env.DB_PASSWORD,
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    app.listen(process.env.PORT)
    console.log('db connected')
  })
  .catch((err) => {
    console.log(err)
  })
