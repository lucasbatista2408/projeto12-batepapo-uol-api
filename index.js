import express from "express"
import dotenv from "dotenv"
import { MongoClient } from "mongodb"
import cors from "cors"
import chalk from "chalk"
import Joi from "joi"
import dayjs from "dayjs"


const app = express();
dotenv.config()
app.use(cors());
app.use(express.json())

// CONNECTION TO MONGO
const url = process.env.URL_CONNECT;
const client = new MongoClient(url);
let db;
let participants;

client.connect().then(() => {
  db = client.db('batepapoapi')
})

const schemaParticipants = Joi.object({
  name: Joi.string().min(1).required(),
});

const schemaMessage = Joi.object({
  to: Joi.string().min(1).required(),
  text: Joi.string().min(1).required(),
  type: Joi.string().valid("message", "private_message").required()
})

//PARTICIPANTS 
app.post('/participants', async (req, res) =>{
  const name = req.body;
  const validation = schemaParticipants.validate(name, { abortEarly: true });

  if(validation.error){
    return res.sendStatus(422);
  }

  try{
    const client = new MongoClient(url);
    await client.connect();
    db = client.db('batepapoapi');

    const exists = await db.collection("participants").find({...name}).toArray();

    if(exists.length > 0){
      console.log("Duplicated");
      return res.status(409).send("Already Exists");
    }

    const participant = {
      name: name.name,
      lastStatus: Date.now()
    }
    const welcome = {
      from: name.name, 
      to: 'Todos', 
      text: 'entra na sala...', 
      type: 'sendStatus', 
      time: dayjs().format('HH:mm:ss')
    }

    await db.collection('participants').insertOne(participant)
    await db.collection('messages').insertOne(welcome)
    res.status(201).send("SUCESSFULL");

  } catch(err){
    console.log(err);
    res.status(422).send("Erro ao cadastrar participante");
  }
})

app.get('/participants', async (req,res) => {
  participants = await db.collection('participants').find().toArray()
  res.status(201).send(participants)
})

// MESSAGES
app.post('/messages', async (req, res) => {
  const data = req.body;
  const validate = schemaMessage.validate(data, { abortEarly: true });
  const { user } = req.headers;

  const message = {
    from: user,
    to: data.to,
    text: data.text,
    type: data.type,
    time: dayjs().format('HH:mm:ss'),
  }

  if(validate.error){
    console.log(validate.error)
    return res.sendStatus(422);
  }

  try{
    const client = new MongoClient(url);
    await client.connect();
    db = client.db('batepapoapi');

    await db.collection('messages').insertOne(message)
    res.sendStatus(201)
  } catch(err){
    console.log(err);
    res.sendStatus(422);
  }
})

app.get('/messages', async (req, res) => {

  const limit = req.query.limit;

  try{
    const client = new MongoClient(url);
    await client.connect();
    db = client.db('batepapoapi');

    const visible =  await db.collection("messages").find({$or: [{type: "message"}, {to: "Todos"}, {to: req.headers.user}, {from: req.headers.user}, ]}).sort({_id: 1}).toArray();
    res.status(200).send(visible.slice(-limit));
  }catch(err){
    console.log(err);
    res.sendStatus(500);
  }
})

// Status

setInterval( async () => {
  // CHECK EVERY 15s IF THE USER IS STILL ONLINE, OTHERWISE IT KICKS THE USER OUT OF THE ROOM AND
  // SENDS A MESSAGE TO THE CHAT ROOM SAYING THE USER LEFT THE ROOM.
  const client = new MongoClient(url);
  await client.connect();
  db = client.db('batepapoapi');

  const tobeDeleted = await db.collection('participants').findOne({lastStatus: {$lt: Date.now() - 15000}})

  if(!tobeDeleted){
    return
  }

  const offline = tobeDeleted.name;
  const offlineMessage = {
    from: offline, 
    to: "Todos", 
    text: 'saiu da sala...', 
    type: "status", 
    time: dayjs().format('HH:mm:ss')
  }
  await db.collection('messages').insertOne(offlineMessage)
  await db.collection('participants').deleteOne({name: offline})
}, 10000)


app.post('/status', async (req, res) =>{
  const {user} = req.headers;

  try{
    
  const client = new MongoClient(url);
  await client.connect();
  db = client.db('batepapoapi');

  const status = await db.collection('participants').findOne({name: user})
    if(!status){
      console.log("NOT_FOUND")
      res.sendStatus(404).send("NOT FOUND")
    }

    const online = await db.collection('participants').updateOne({name: user},
      {$set:
      {lastStatus: Date.now()}})
    
    const tobeDeleted = await db.collection('participants').findOne({lastStatus: {$lt: Date.now() - 15000}})
    const offline = tobeDeleted.name;
    const offlineMessage = {
      from: offline, 
      to: "Todos", 
      text: `saiu da sala...`, 
      type: "status", 
      time: dayjs().format('HH:mm:ss')
    }
    await db.collection('messages').insertOne(offlineMessage)
    await db.collection('participants').deleteOne({name: offline})
    res.status(200).send("UPDATED")
  } catch (err){
    console.log(err);
    res.status(500).send("COULD NOT UPDATE")
  }
})

app.listen(process.env.PORT, () => {
  console.log(chalk.bold.blue('server up'))
})