//jshint esversion:6
require("dotenv").config();
const express=require("express");
const bodyParser=require("body-parser");
const ejs=require("ejs");
const mongoose=require("mongoose");
const encrypt=require("mongoose-encryption");

const app=express();

console.log(process.env.API_KEY);

app.use(express.static("public"));
app.set('view engine','ejs');
app.use(bodyParser.urlencoded({extended:true}));

mongoose.connect("mongodb://localhost:27017/contactsDB",{ useUnifiedTopology: true , useNewUrlParser: true  });

const contactSchema=new mongoose.Schema({
    username:String,
    password:String
});

contactSchema.plugin(encrypt,{secret:process.env.SECRET,encryptedFields:["password"]});


const Profile=mongoose.model("profile",contactSchema);

app.get("/",function(req,res){
    res.render("home");
});

app.get("/login",function(req,res){
    res.render("login");
});

app.post("/login",function(req,res){
    Profile.findOne({username:req.body.username},function(err,results){
        if(!err){
            if(!results){
                res.send("Unknown username");
            }else{
                if(results.password===req.body.password){
                    res.render("secrets");
                }
                else{
                    res.send("Wrong password");
                }
            }
        }else{
            res.send(err);
        }
    });
});

app.get("/register",function(req,res){
    res.render("register");
});

app.post("/register",function(req,res){
    const newProfile=new Profile({
        username:req.body.username,
        password:req.body.password
    });
    newProfile.save(function(err){
        if(!err){
            console.log("the account is added successfully");
        }else{
            console.log(err);
        }
    });
});

app.listen(3000,function(){
    console.log("Server is connected on localhost 3000");
});