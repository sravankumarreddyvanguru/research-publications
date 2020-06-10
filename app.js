require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose=require("mongoose");
const session = require('express-session');
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate=require('mongoose-findorcreate');
const app = express();

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

app.use(session({
  secret:"sravanWEBdevResearchPublication.",
  resave: false,
  saveUninitialized: true
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/researchuserDB",{useNewUrlParser:true,useUnifiedTopology: true});
mongoose.set("useCreateIndex",true);
const userSchema= new mongoose.Schema({
  username:String,
  password:String,
  googleId:String,
  firstName:String,
  lastName:String
  //username : { type: String,sparse:true}
});

//userSchema.plugin(encrypt, { secret:process.env.SECRET , encryptedFields: ['password']});
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
const User=new mongoose.model("User",userSchema);
passport.use(User.createStrategy());
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});


passport.use(new GoogleStrategy({
    clientID:process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/researchpublications",
    userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));


app.listen(3000,function(){
  console.log("Server started on port 3000");
});

app.get("/",function(req,res){
  res.render("home");
});

app.get("/register",function(req,res){
  res.render("register");
});
app.get("/login",function(req,res){

});
app.post("/register",function(req,res){
User.register({username:req.body.username},req.body.password,function(err,user){
  if(err){
    console.log(err);
    res.redirect("/register");
    }
    else{
      passport.authenticate("local")(req, res, function() {
      res.redirect("/details");
 });
    }
});
});
app.post("/login",function(req,res){
  const user=new User({
    username:req.body.username,
    password:req.user.password
  });
  req.login(user, function(err) {
  if (err) { console.log(err);
  }
  else{
  passport.authenticate("local")(req,res,function(){
    res.redirect("/");
  });
}
});

});
app.post("/logout",function(req,res){
req.logout();
res.redirect("/");
});
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] })
);
app.get('/auth/google/researchpublications',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/details');
  });
app.get("/details",function(req,res){
if(req.isAuthenticated()){
  res.render("details");
}
else{
  console.log("not authenticated");
  res.render("/register");
}
});
app.post("/details",function(req,res){
 User.findById(req.user._id,function(err,Founduser){
  if(err)
  console.log(err);
  else{
    if(Founduser){
    Founduser.firstName=req.body.firstName;
    Founduser.lastName=req.body.lastName;
    Founduser.save(function(){
      res.send("successsfully saved");
    });
  }
}
 });
});
