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
mongoose.set('useFindAndModify', false);
const userSchema= new mongoose.Schema({
  email:String,
  password:String,
  googleId:String,
  employeeCode:String,
  title:String,
  surName:String,
  middleName:String,
  lastName:String,
  displayName:String,
  emailId:String,
  mobileNUmber:String,
  alternateEmailId:String,
  emergencyContactNo:String,
  gender:String,
  department:String,
  designation:String,
  employeeType:String,
  publication:[{name:String,author:String}]
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
    //console.log(profile);
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
res.render("login");
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
    res.redirect("/user");
  });
}
});

});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] })
);
app.get('/auth/google/researchpublications',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/intermediate');
  });
app.get("/details",function(req,res){
if(req.isAuthenticated()){
  res.render("details");
}
else{
  console.log("not authenticated");
  res.render("/");
}
});
app.post("/details",function(req,res){
 User.findById(req.user._id,function(err,Founduser){
  if(err)
  console.log(err);
  else{
    if(Founduser){
    Founduser.employeeCode=req.body.employeeCode;
    Founduser.title=req.body.title;
    Founduser.surName=req.body.surName;
    Founduser.middleName=req.body.middleName;
    Founduser.lastName=req.body.lastName;
    Founduser.displayName=req.body.displayName;
    Founduser.emailId=req.body.emailId;
    Founduser.mobileNUmber=req.body.mobileNUmber;
    Founduser.alternateEmailId=req.body.alternateEmailId;
    Founduser.emergencyContactNo=req.body.emergencyContactNo;
    Founduser.gender=req.body.gender;
    Founduser.department=req.body.department;
    Founduser.designation=req.body.designation;
    Founduser.employeeType=req.body.employeeType;
    Founduser.save(function(){
      res.redirect("/user");
    });
  }
}
 });
});
app.get("/user",function(req,res){
  if(req.isAuthenticated()){
    res.render("user",{user:req.user});
  }
  else{
    console.log("not authenticated");
    res.redirect("/");
  }
});
app.get("/intermediate",function(req,res){
User.findById(req.user._id,function(err,Founduser){
  if(err)
  console.log(err);
  else{
    if(Founduser){
    if(Founduser.department){
      res.redirect("/user");
    }
    else{
      res.redirect("/details");
    }
    }
  }
});
});
app.get("/logout",function(req,res){
  req.logout();
  res.redirect("/");
});
app.get("/publication",function(req,res){
  if(req.isAuthenticated()){
    res.render("publication");
  }
  else{
    console.log("not authenticated");
    res.redirect("/");
  }
});
//req.user._id
app.post("/publication",function(req,res){
  var newPublication={name:req.body.titleOfThePaper,author:req.body.listOfAuthors};
  User.findOneAndUpdate(
     { _id: req.user._id },
     { $push: { publication:newPublication} },
    function (error, success) {
          if (error) {
              console.log(error);
              res.send("unable to find user");
          } else {
              console.log(success);
              res.redirect("/user");
          }
      });
});
