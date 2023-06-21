const express = require('express')
const app = express()
require('dotenv').config()
const port = process.env.PORT || 9000
const cors = require('cors')
const bodyParser = require("body-parser");

// jwt or jsonwebtoken
const jwt = require('jsonwebtoken')
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY

// bcypt
const bcrypt = require('bcrypt')
const SALT_ROUNDS = Number(process.env.SALT_ROUNDS)

// Connect to mongodb using mongoose
const mongoose = require('mongoose')
const memory = require('./models/memoriesSchema')
const user = require('./models/usersSchema')
const post = require('./models/postsSchema')
const url = process.env.MONGOURL
mongoose.connect(url);
const con = mongoose.connection
con.on('open', async () => { 
})

// multer
const multer = require("multer");

// cloudinary
var cloudinary = require('cloudinary').v2
cloudinary.config({ 
  cloud_name: process.env.CLOUD_NAME, 
  api_key: process.env.API_KEY, 
  api_secret: process.env.API_SECRET,
  secure: true
});

app.use(express.json())
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json({limit: '200mb'}));
app.use(express.urlencoded({limit: '200mb'}));
// app.use(multip)
app.use(cors());

//////////////////////////
///     API routes     ///
//////////////////////////

// test
app.get('/test',(req,res)=>{
  res.send('it is working')
})

// login 
app.post('/login',async (req, res) => {

  const loginUser = req.body

  try {
    const fetchedUser = await user.findOne({username:loginUser.username});
    if(fetchedUser===null){
      return res.send('Incorrect Username/Password')
    }
    bcrypt.compare(loginUser.password, fetchedUser.password, function(err, result) {
      if (err) {  return res.send('Incorrect Username/Password1')}

      if(result === false)
      return res.send('Incorrect Username/Password')
      else{
        const token = jwt.sign({
          username: loginUser.username
        }, JWT_SECRET_KEY)
        
        return res.json({status: 'logged', data:token})
      }
    });
  } catch (error) {
    return res.send(error);
  }
  
})

// signup 
app.post('/signup',async (req, res) => {

  const newUser = new user(req.body);
  try {
      const usersEmail = await user.findOne({email:newUser.email});
      const usersUsername = await user.findOne({username: newUser.username})
        if(usersEmail)
        return res.send("Email Already Registered");
        else if(usersUsername)
        return res.send("Username is already taken");

    } catch (error) {
      return res.send(error);
    }

  try {
    const hash = await bcrypt.hash(req.body.password, SALT_ROUNDS)
      newUser.password = hash
      const addedUser = await newUser.save()
      return res.send("You are registered")
    } catch (error) {
      return res.send('Could not register');
    }
 
})


// get memories
app.post('/memories',  async (req, res) => {
  const token = req.body.token;
  try {
    const user = jwt.verify(token,JWT_SECRET_KEY)
    const fetchedMemories = await memory.find({user:user.username});
      const memories = {
        memoriesArray: fetchedMemories
      }
    return res.send(memories);
  } catch (error) {
    return res.send('You are not logged in')
  }
   
})

// upload file
async function handleUpload(file) {
  const res = await cloudinary.uploader.upload(file, {
    resource_type: "auto",
  });
  return res;
}
// multer middleware
const storage = new multer.memoryStorage();
const upload = multer({
  storage,
});

// add new memory
app.post('/add_new_memory', upload.single("file"),  async (req,res) =>{

  
    const token  = req.body.token;
    delete req.body.token;
    try {
        const user = jwt.verify(token,JWT_SECRET_KEY)
        req.body.user = user.username
    }catch(error){
      return res.send('Please Login')
    }

    try {
      const b64 = Buffer.from(req.file.buffer).toString("base64");
      let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
      const cldRes = await handleUpload(dataURI);
      req.body.imageUrl = cldRes.secure_url
      req.body.imagePublicId = cldRes.public_id
    } catch (error) {
      return res.send('Could not upload your image')
    }

      let newMemory = new memory(req.body);
      try{
        const addedMemory = await newMemory.save();
        return res.send('Memory Added Succesfully');
      } catch (error) {
        return res.send('Could not update your memory', error);
      } 

})

// edit memory
app.post('/editMemory', upload.single("file"),  async (req,res) =>{
  
  const token  = req.body.token;
  delete req.body.token;
  try {
      const user = jwt.verify(token,JWT_SECRET_KEY)
      req.body.user = user.username
  }catch(error){
    return res.send('Please Login')
  }

  try {
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
    const cldRes = await handleUpload(dataURI);
    req.body.imageUrl = cldRes.secure_url
    req.body.imagePublicId = cldRes.public_id
  } catch (error) {
    return res.send('Could not upload your image')
  }

    const objectId = req.body.objectId;
    delete req.body.objectId
    let newMemory = req.body;

    try{
      const addedMemory = await memory.updateOne({_id:objectId},newMemory);
      return res.send('Memory Updated Succesfully');
    } catch (error) {
      return res.send('Could not update your memory', error);
    } 

})

// delete memory
app.post('/deleteMemory', async(req,res) =>{

  const token = req.body.token
  try{
   const user = jwt.verify(token, JWT_SECRET_KEY)
  }catch(error){
    return res.send('Please Login To Delete Memory')
  }

  const objectId = req.body.objectId;
  try {
    const foundMemory = await memory.findOne({_id:objectId})
    const deleteMemory = await memory.deleteOne({_id:objectId})
    const imagePublicId = foundMemory.imagePublicId
    await cloudinary.uploader.destroy(imagePublicId, function(result){});
  } catch (error) {
    return res.send('Could not delete memory')
  }finally{
    return res.send('Memory Deleted Succesfully')
  }

})

// get posts
app.get('/posts', async(req,res) =>{
 
  let posts =[]
  try {
    posts = await post.find();
    return res.send(posts)
  } catch (error) {
    return res.send('Could not fetch posts')
  }

})

// add new post
app.post('/add_new_post', upload.single("file"), async(req,res) =>{

  const token = req.body.token
  delete req.body.token
  let newPost = req.body

  try{
    const user = jwt.verify(token, JWT_SECRET_KEY)
    newPost.user = user.username
  }catch(error){
    return res.send('Please Login To Post Something')
  }

  try {
    const b64 = Buffer.from(req.file.buffer).toString("base64");
    let dataURI = "data:" + req.file.mimetype + ";base64," + b64;
    const cldRes = await handleUpload(dataURI);
    req.body.imageUrl = cldRes.secure_url
    req.body.imagePublicId = cldRes.public_id
  } catch (error) {
    return res.send('Could not upload your image')
  }

  const dt = new Date()
  const date = `${dt.getFullYear()}-${dt.getMonth()+1}-${dt.getDate()}`
  newPost.uploadDate = date
  const newPostTemp = new post(newPost)

  try {
    await newPostTemp.save();
    return res.send('Posted Succesfully')
  } catch (error) {
    return res.send('Could not add your post')
  }

})


app.listen(port, () => {
})