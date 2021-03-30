const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");
var uniqid = require('uniqid');
const cors = require("cors");
const corsOptions ={
    origin:'http://localhost:3000',
    credentials:true,
    optionSuccessStatus:200
};


const app = express();
app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

app.use(cors(corsOptions));


const homeStartingContent = "Lacus vel facilisis volutpat est velit egestas dui id ornare. Semper auctor neque vitae tempus quam. Sit amet cursus sit amet dictum sit amet justo. Viverra tellus in hac habitasse. Imperdiet proin fermentum leo vel orci porta. Donec ultrices tincidunt arcu non sodales neque sodales ut. Mattis molestie a iaculis at erat pellentesque adipiscing. Magnis dis parturient montes nascetur ridiculus mus mauris vitae ultricies. Adipiscing elit ut aliquam purus sit amet luctus venenatis lectus. Ultrices vitae auctor eu augue ut lectus arcu bibendum at. Odio euismod lacinia at quis risus sed vulputate odio ut. Cursus mattis molestie a iaculis at erat pellentesque adipiscing.";
const aboutContent = "Hac habitasse platea dictumst vestibulum rhoncus est pellentesque. Dictumst vestibulum rhoncus est pellentesque elit ullamcorper. Non diam phasellus vestibulum lorem sed. Platea dictumst quisque sagittis purus sit. Egestas sed sed risus pretium quam vulputate dignissim suspendisse. Mauris in aliquam sem fringilla. Semper risus in hendrerit gravida rutrum quisque non tellus orci. Amet massa vitae tortor condimentum lacinia quis vel eros. Enim ut tellus elementum sagittis vitae. Mauris ultrices eros in cursus turpis massa tincidunt dui.";
const contactContent = "Scelerisque eleifend donec pretium vulputate sapien. Rhoncus urna neque viverra justo nec ultrices. Arcu dui vivamus arcu felis bibendum. Consectetur adipiscing elit duis tristique. Risus viverra adipiscing at in tellus integer feugiat. Sapien nec sagittis aliquam malesuada bibendum arcu vitae. Consequat interdum varius sit amet mattis. Iaculis nunc sed augue lacus. Interdum posuere lorem ipsum dolor sit amet consectetur adipiscing elit. Pulvinar elementum integer enim neque. Ultrices gravida dictum fusce ut placerat orci nulla. Mauris in aliquam sem fringilla ut morbi tincidunt. Tortor posuere ac ut consequat semper viverra nam libero.";


app.use(session({
  secret: "secret",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());




mongoose.connect("mongodb://localhost:27017/blogDB", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  useFindAndModify: false
});
mongoose.set("useCreateIndex", true);
const userSchema = new mongoose.Schema({
  name: String,
  mail: String,
  password: String,
  googleId: String,
  posts: []
});

userSchema.plugin(passportLocalMongoose, {
  selectedFields: "name mail",
  usernameField: "username"
});
userSchema.plugin(findOrCreate);
const User = new mongoose.model("user", userSchema);

passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
  done(null, user.id);
});
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});


const postSchema = mongoose.Schema({
  title: String,
  content: String,
  postID: String
});
const Post = new mongoose.model("post", postSchema);





app.get("/", function(req, res) {
  console.log(req.isAuthenticated());

  req.isAuthenticated() ? res.render("home.ejs", {
    firstParagraph: homeStartingContent,
    postContent: req.user.posts
  }) : res.redirect("login");



});

app.get("/login", function(req, res) {
  res.render("login")
});

app.get("/register", function(req, res) {
  res.render("register")
});


app.get("/about", function(req, res) {
  res.render("about.ejs", {
    aboutText: aboutContent
  });
});

app.get("/contact", function(req, res) {
  res.render("contact.ejs", {
    contactText: contactContent
  });
});

app.get("/compose", function(req, res) {
  res.render("compose.ejs", {

  });
});

app.get("/posts/:postID", function(req, res) {
  const id = req.params.postID;

 const post = req.user.posts.find(post=>post.postID === id);

res.render("post",{
  title: post.title,
  content: post.content
})
});





app.post("/compose", function(req, res) {

  let post = new Post({
    title: req.body.titleText,
    content: req.body.composeText,
    postID: uniqid()
  });
  post.save();


  User.findById(req.user.id, (err, foundUser) => {
    err ? console.log(err) : foundUser.posts.push(post);
    foundUser.save(res.redirect("/"))
  })
});

app.post("/delete", function(req, res) {
  const postID = req.body.delete;
  Post.deleteOne({ "postID": postID }, function(err) {
    if (err)
      console.log(err);
  });

  User.findByIdAndUpdate(req.user.id, {
    "$pull": {
      "posts": {
        "postID": postID
      }
    }
  }, function(err, obj) {
    if (!err) {
      res.redirect("/")
    }
  });
});

app.post("/register", (req, res) => {
  console.log(req.body);
  User.register({
    username: req.body.username,
    mail: req.body.email
  }, req.body.password, (err, user) => {
    if (err) {
      console.log(err);
      res.redirect("/register")
    } else {
      passport.authenticate("local")(req, res, () => {
        console.log(user.username + " registered and logged in.");
        res.redirect("/")
      })
    }
  })
})

app.post("/login", (req, res) => {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  req.login(user, (err) => {
    if (err) {
      console.log(err);
      res.redirect("login")
    } else {
      passport.authenticate("local")(req, res, () => {
        res.redirect("/")
      })
    }
  })
})






app.listen(4000, function() {
  console.log("Server started on port 3000");
});
