import express from "express"
import dotenv from "dotenv"
import { MongoClient } from "mongodb"

const app = express();
dotenv.config()

// CONNECTION TO MONGO
const url = process.env.URL_CONNECT;
const client = new MongoClient(url);

app.use(cors());
app.use(express.json())






app.listen(process.env.PORT)