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
const usersCollection = db.collection("user");
const jobsCollection = db.collection("jobs");


app.get("/", (req, res) => {
    res.send("Hello World!");
});

app.get("/user", async (req, res) => {
    try {
        const users = await usersCollection.find().toArray();
        res.send(users);
    } catch (err) {
        console.dir(err);
    }
});


app.post("/api/jobs", async (req, res) => {
  try {
    const job = req.body;
    const result = await jobsCollection.insertOne(job);
    res.status(201).send(result);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Failed to add job" });
  }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});