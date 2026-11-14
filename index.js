import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from 'mongodb';
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


// Users apis

app.get("/user", async (req, res) => {
    try {
        const users = await usersCollection.find().toArray();
        res.send(users);
    } catch (err) {
        console.dir(err);
    }
});


// Jobs apis

app.get("/api/jobs", async (req, res) => {
  try {
    const { recruiterId } = req.query;

    const query = recruiterId ? { recruiterId } : {};

    const jobs = await jobsCollection
      .find(query)
      .sort({ jobPostDate: -1 })
      .toArray();

    res.send(jobs);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Failed to fetch jobs" });
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

app.delete("/api/jobs/:id", async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid job id" });
    }

    const result = await jobsCollection.deleteOne({ _id: new ObjectId (id) });

    if (result.deletedCount === 0) {
      return res.status(404).send({ message: "Job not found" });
    }

    res.send(result);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Failed to delete job" });
  }
});

app.patch("/api/jobs/:id", async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid job id" });
    }

    // never let the client overwrite _id
    const { _id, ...updatedJob } = req.body;

    const result = await jobsCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updatedJob },
    );

    if (result.matchedCount === 0) {
      return res.status(404).send({ message: "Job not found" });
    }

    res.send(result);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Failed to update job" });
  }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});