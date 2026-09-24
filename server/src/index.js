import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import api from "./api.js";
import { seed } from "./seed.js";

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL ? process.env.CLIENT_URL.split(",") : true }));
app.use(express.json());
app.get("/health", (_, res) => res.json({ ok: true }));
app.use("/api", api);
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ error: "Something went wrong on the server." }); });

await mongoose.connect(process.env.MONGODB_URI);
await seed();
const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Synapse API running on http://localhost:${port}`));
