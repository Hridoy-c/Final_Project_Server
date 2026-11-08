import express from "express";
import cors from "cors";
import { MongoClient } from 'mongodb';
import 'dotenv/config'

const app = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());


const client = new MongoClient(process.env.MONGODB_URI);

export async function connectToMongoDB() {
  try {
    await client.connect();
    console.log("You successfully connected to MongoDB!");
    return client;
  } catch (err) {
    console.dir(err);
  }
}

const connected= await connectToMongoDB();
const db = connected.db("Final_Project");
const usersCollection = db.collection("users");


app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.get("/users", async (req, res) => {
    try {
        const users = await usersCollection.find().toArray();
        res.send(users);
    } catch (err) {
        console.dir(err);
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});