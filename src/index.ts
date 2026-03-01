import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import uploadRoute from "./routes/upload.route";
import queryRoute from "./routes/query.route";
import sessionRoute from "./routes/session.route";
import { connectDB } from "./config/db";   
import ragConfigRoute from "./routes/ragConfig.route";
dotenv.config();

connectDB();  // ADD THIS

const app = express();
app.use(cors());
app.use(express.json());
app.use("/upload", uploadRoute);
app.use("/query", queryRoute);
app.use("/sessions", sessionRoute);
app.use("/rag-config", ragConfigRoute);
app.listen(5000, () => {
  console.log("Server running on port 5000");
});