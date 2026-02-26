import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import supabase from "./config/supabase.js";

import authRoutes from "./routes/auth.js";
import projectRoutes from "./routes/projects.js";
import taskRoutes from "./routes/tasks.js";
import expenseRoutes from "./routes/expenses.js";
import photoRoutes from "./routes/photos.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "Home Renovation Tracker API is running",
    version: "1.0.0"
  });
});

app.get("/health", async (req, res) => {
  const { error } = await supabase
    .from("projects")
    .select("id")
    .limit(1);

  if (error) {
    return res.status(500).json({
      status: "ERROR",
      database: "disconnected"
    });
  }

  res.json({
    status: "OK",
    database: "connected"
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/photos", photoRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});