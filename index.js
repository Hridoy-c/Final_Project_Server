import express from "express";
import cors from "cors";
import { MongoClient, ObjectId } from "mongodb";
import "dotenv/config";

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

const connected = await connectToMongoDB();
const db = connected.db("Final_Project");
const usersCollection = db.collection("user");
const jobsCollection = db.collection("jobs");
const applicationsCollection = db.collection("applications");




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
    const query = {};
    const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const num = (f) => ({
      $convert: { input: `$${f}`, to: "double", onError: 0, onNull: 0 },
    });

    if (req.query.type) {
      const types = [].concat(req.query.type)
        .flatMap((t) => String(t).split(","))
        .map((t) => t.trim())
        .filter(Boolean);
      if (types.length) query.type = { $in: types };
    }

    if (req.query.category) {
      query.category = req.query.category;
    }

    if (req.query.isRemote === "true") {
      query.isRemote = true;
    }

    if (req.query.location) {
      query.location = { $regex: escapeRegex(req.query.location), $options: "i" };
    }

    if (req.query.recruiterId) {
      query.recruiterId = req.query.recruiterId;
    }

    const exprs = [];
    if (req.query.minSalary && !isNaN(req.query.minSalary)) {
      exprs.push({ $gte: [num("maxSalary"), Number(req.query.minSalary)] });
    }
    if (req.query.maxSalary && !isNaN(req.query.maxSalary)) {
      exprs.push({ $lte: [num("minSalary"), Number(req.query.maxSalary)] });
    }
    if (exprs.length) query.$expr = { $and: exprs };

    if (req.query.search && req.query.search.trim()) {
      const fields = ["title", "company", "location", "responsibilities", "requirements"];
      const words = req.query.search.trim().split(/\s+/).map(escapeRegex);

      query.$and = words.map((word) => ({
        $or: fields.map((field) => ({
          [field]: { $regex: word, $options: "i" },
        })),
      }));
    }

    const sortMap = {
      recent: { jobPostDate: -1 },
      "salary-high": { _max: -1 },
      "salary-low": { _min: 1 },
      deadline: { deadline: 1 },
    };
    const sortStage = sortMap[req.query.sort] || sortMap.recent;

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit) || 10, 1);

    const [result] = await jobsCollection
      .aggregate([
        { $match: query },
        { $addFields: { _max: num("maxSalary"), _min: num("minSalary") } },
        {
          $facet: {
            jobs: [
              { $sort: sortStage },
              { $skip: (page - 1) * limit },
              { $limit: limit },
              { $project: { _max: 0, _min: 0 } },
            ],
            total: [{ $count: "count" }],
          },
        },
      ])
      .toArray();

    const total = result.total[0]?.count ?? 0;

    res.send({
      jobs: result.jobs,
      total,
      page,
      totalPages: Math.max(Math.ceil(total / limit), 1),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Failed to fetch jobs" });
  }
});

app.get("/api/jobs/:id", async (req, res) => {
  try {
    const id = req.params.id;

    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid job id" });
    }

    const job = await jobsCollection.findOne({ _id: new ObjectId(id) });

    if (!job) {
      return res.status(404).send({ message: "Job not found" });
    }

    res.send(job);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Failed to fetch job" });
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

    const result = await jobsCollection.deleteOne({ _id: new ObjectId(id) });

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




// Applications apis  


app.get("/api/applications", async (req, res) => {
  try {
    const applications = await applicationsCollection.find().toArray();
    res.send(applications);
  } catch (err) {
    console.dir(err);
  }
});


app.post("/api/applications", async (req, res) => {
  try {
    const application = req.body;
    const result = await applicationsCollection.insertOne(application);
    res.status(201).send(result);
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: "Failed to add application" });
  }
})














app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
