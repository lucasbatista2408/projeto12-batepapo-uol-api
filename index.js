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


//PARTICIPANTS 
app.post('/participants', async (req, res) =>{
  const {name} = req.body;

  const participant = {
    name,
    lastStatus: Date.now()
  }
  const welcome = {
    from: name, 
    to: 'Todos', 
    text: 'entra na sala...', 
    type: 'status', 
    time: dayjs().format('HH:mm:ss')
  }

  participants = await db.collection('participants').find().toArray()
  const exists = participants.find(participant => participant.name === name)

  if(exists){
    res.status(409).send('conflito')
    return
  } else{
    const userADD = await db.collection('participants').insertOne(participant)
    await db.collection('messages').insertOne(welcome)
    res.send(userADD)
  }
  res.status(201)
})

app.get('/participants', async (req,res) => {
  participants = await db.collection('participants').find().toArray()
  res.send(participants)
})

// MESSAGES
app.post('/messages', async (req, res) => {
  const {to, text, type} = req.body;
  const { User } = req.headers;
  const message = {
    from: User,
    to,
    text,
    type,
    time: dayjs().format('HH:mm:ss')
  }
 await db.collection('messages').insertOne(message)
 res.status(201)

})

app.get('/messages', async (req, res) => {
  const messages = await db.collection('messages').find().toArray()
  res.send(messages)
})

// STATUS
app.post('/status', (req, res) =>{

})

app.listen(process.env.PORT, () => {
  console.log(chalk.bold.blue('server up'))
})