const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});





const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})


// MY CODE STARTS HERE
let mongoose;
try {
  mongoose = require("mongoose");
} catch (e) {
  console.log(e);
}
let bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: false }));
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  }
});

const exerciseSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  date: String
});

const logSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  },
  count: Number,
  log: [Object]
});

let User = mongoose.model('User', userSchema);
let Exercise = mongoose.model('Exercise', exerciseSchema);
let Log = mongoose.model('Log', logSchema);

const defaultDate = () => new Date().toDateString();

// Find User by ID
const findUserById = function(id, next) {
  User.findById(id).then(user => next(user));
}

// Find User exercises
const findUserExercises = function(user, next) {
  Exercise.find({username: user.username}).then(exercises => next(exercises));
}

// POST user data
const createAndSaveUser = function(req, res) {
  let username = req.body.username;
  try {
    let user = new User({ username: username });
    user.save().then(user => res.json(user));
  } catch (err) {
    if (err) return console.error(err);
  }
}

// GET user list
const getUsers = function(req, res) {
   User.find({}).then(users => res.json(users));
}

// POST exercise
const saveExercise = function(req, res) {
  findUserById(req.params._id, function(user) {
    let date = new Date(req.body.date).toDateString();
    if (!req.body.date) {
      date = defaultDate();
    }
    let exercise = new Exercise({ 
      username: user.username, 
      description: req.body.description, 
      duration: req.body.duration, 
      date: date
    });
    exercise.save().then(exercise => res.json({
      username: user.username,
      _id: user._id,
      date: exercise.date,
      description: exercise.description,
      duration: exercise.duration
      })
    );
  })
}

// GET User logs
const findUserLogs = function(req, res) {
  findUserById(req.params._id, function(user) {
    findUserExercises(user, function(exercises) {
      let fromDate = req.query.from || "1970-01-01"
      let toDate = req.query.to || "9999-12-31"
      let limit = req.query.limit || 9999

      fromDate = new Date(fromDate);
      toDate = new Date(toDate);

      exercises = exercises.filter(exercise => new Date(exercise.date) >= fromDate && new Date(exercise.date) <= toDate).slice(0, limit);

      let count = 0;
      let log = new Log({username: user.username});
      
      exercises.forEach(function(exercise) {
        log.log.push({
          description: exercise.description,
          duration: exercise.duration,
          date: exercise.date
        });
        count += 1;
      })
      
      log.count = count;
      log.save();
      res.json({
        username: user.username,
        _id: user._id,
        count: log.count,
        log: log.log
      });
    })
  })
}


app.post("/api/users", createAndSaveUser);
app.get("/api/users", getUsers);
app.post("/api/users/:_id/exercises", saveExercise);
app.get("/api/users/:_id/logs", findUserLogs);
