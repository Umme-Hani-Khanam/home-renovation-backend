import materialsRoutes from "./routes/materials.js";
import dashboardRoutes from "./routes/dashboard.js";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
dotenv.config();
import supabase from "./config/supabase.js";
import contractorRoutes from "./routes/contractors.js";
import inventoryRoutes from "./routes/inventory.js";
import permitRoutes from "./routes/permits.js";
import reminderRoutes from "./routes/reminders.js";
import templateRoutes from "./routes/templates.js";
import inspirationRoutes from "./routes/inspiration.js";
import authRoutes from "./routes/auth.js";
import projectRoutes from "./routes/projects.js";
import taskRoutes from "./routes/tasks.js";
import expenseRoutes from "./routes/expenses.js";
import photoRoutes from "./routes/photos.js";
import reportRoutes from "./routes/report.js";
import shoppingRoutes from "./routes/shoppings.js";
import memberRoutes from "./routes/members.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/shopping", shoppingRoutes);
app.get("/", (req, res) => {
  res.json({
    message: "Home Renovation Tracker API is running",
    version: "1.0.0",
  });
});

app.get("/health", async (req, res) => {
  const { error } = await supabase.from("projects").select("id").limit(1);

  if (error) {
    return res.status(500).json({
      status: "ERROR",
      database: "disconnected",
    });
  }

  res.json({
    status: "OK",
    database: "connected",
  });
});
app.use("/api/materials", materialsRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/photos", photoRoutes);
app.use("/api/contractors", contractorRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/report", reportRoutes);
app.use("/api/members", memberRoutes);

app.use("/api/inventory", inventoryRoutes);
app.use("/api/permits", permitRoutes);
app.use("/api/reminders", reminderRoutes);
app.use("/api/templates", templateRoutes);
app.use("/api/inspiration", inspirationRoutes);
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
