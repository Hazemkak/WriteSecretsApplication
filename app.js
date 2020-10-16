//jshint esversion:6
require("dotenv").config();
const express=require("express");
const bodyParser=require("body-parser");
const ejs=require("ejs");
const mongoose=require("mongoose");
//const md5 = require("md5");
const bcrypt=require("bcrypt");
const saltRounds=10;
const session=require("express-session");
const passport=require("passport");
const passportLocalMongoose=require("passport-local-mongoose");
const GoogleStrategy=require("passport-google-oauth20").Strategy;
const FacebookStrategy=require("passport-facebook").Strategy;
const findOrCreate=require("mongoose-findorcreate");




const app=express();

//console.log(process.env.API_KEY);

app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended:true}));


app.use(session({
    secret:"Our Little secret",//can be any string
    resave:false,
    saveUninitialized:false
}));
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/contactsDB",{ useUnifiedTopology: true , useNewUrlParser: true  });


const contactSchema=new mongoose.Schema({
    username:String,
    password:String,
    googleId:String,
    facebookId:String,
    secret:String
});


contactSchema.plugin(passportLocalMongoose);
contactSchema.plugin(findOrCreate);

//contactSchema.plugin(encrypt,{secret:process.env.SECRET,encryptedFields:["password"]});


const Profile=mongoose.model("profile",contactSchema);

const User=new mongoose.model("User",contactSchema);

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
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL:"https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, done) {
      console.log(profile);
       User.findOrCreate({ googleId: profile.id }, function (err, user) {
         return done(err, user);
       });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FB_APP_ID,
    clientSecret: process.env.FB_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, done) {
    User.findOrCreate({facebookId:profile.id}, function(err, user) {
      if (err) { return done(err); }
      done(null, user);
    });
  }
));






app.get("/",function(req,res){
    res.render("home");
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['https://www.googleapis.com/auth/plus.login'] }));

app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/secrets');
});

app.get('/auth/facebook', passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { successRedirect: '/secrets',
    failureRedirect: '/login' }));



app.get("/login",function(req,res){
    res.render("login");
});

app.post("/login",function(req,res){
    const user = new User({
        username:req.body.username,
        password:req.body.password
    });
    req.login(user,function(err){
        if(err){
            console.log(err);
        }
        else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            });
        }
    });
});

app.get("/register",function(req,res){
    res.render("register");
});

app.post("/register",function(req,res){
    User.register({username:req.body.username},req.body.password,function(err,user){
        if(err){
            console.log(err);
            res.redirect("/register");
        }
        else{
            passport.authenticate("local")(req,res,function(){
                res.redirect("/secrets");
            })
        }
    })
});
 
app.get("/secrets",function(req,res){
    if(req.isAuthenticated()){
        User.find({"secret":{$ne: null}},function(err,results){
            if(err){
                console.log(err);
            }
            else{
                if(results){
                    res.render("secrets",{SECRETS:results}
                    );
                }
            }
        });
    }else{
        console.log("not logged in");
        res.redirect("/login");
    }
})

app.get("/logout",function(req,res){
    req.logout();
    res.redirect("/");
})
//When server is restarted cookies are deleted

app.get("/submit",function(req,res){
    res.render("submit");
})

app.post("/submit",function(req,res){
    User.findOne({_id:req.user.id},function(err,results){
        if(err){
            console.log(err);
        }
        else{
            if(results){
                results.secret=req.body.secret;
                results.save(function(){
                    res.redirect("/secrets");
                })
            }
        }
    });
});

app.listen(3000,function(){
    console.log("Server is connected on localhost 3000");
});