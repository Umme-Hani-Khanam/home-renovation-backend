import express from "express";
import supabase from "../config/supabase.js";
import PDFDocument from "pdfkit";
import axios from "axios";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticateUser);

function sumAmount(items) {
  return (Array.isArray(items) ? items : []).reduce(
    (sum, item) => sum + Number(item?.amount || 0),
    0
  );
}

router.get("/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .single();

    if (projectError) throw projectError;

    const { data: expenses, error: expenseError } = await supabase
      .from("expenses")
      .select("id, amount, category, description, expense_date")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (expenseError) throw expenseError;

    const { data: tasks, error: taskError } = await supabase
      .from("tasks")
      .select("id, title, status, priority, assigned_to, deadline")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (taskError) throw taskError;

    const { data: photos, error: photoError } = await supabase
      .from("project_photos")
      .select("id, image_url")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (photoError) throw photoError;

    const totalBudget = Number(project?.total_budget || 0);
    const totalSpent = sumAmount(expenses);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=project-report-${projectId}.pdf`);

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    doc.pipe(res);

    doc.fontSize(20).text("Renovation Project Report", { underline: true });
    doc.moveDown(0.75);

    doc.fontSize(12).text(`Project: ${project?.name || "N/A"}`);
    doc.text(`Location: ${project?.location || "N/A"}`);
    doc.text(`Status: ${project?.status || "N/A"}`);
    doc.text(`Date Range: ${project?.start_date || "N/A"} - ${project?.end_date || "N/A"}`);
    doc.moveDown(0.5);

    doc.fontSize(14).text("Budget Summary", { underline: true });
    doc.fontSize(12).text(`Total Budget: INR ${totalBudget.toLocaleString()}`);
    doc.text(`Total Spent: INR ${totalSpent.toLocaleString()}`);
    doc.text(`Remaining: INR ${Math.max(totalBudget - totalSpent, 0).toLocaleString()}`);
    doc.moveDown(0.5);

    doc.fontSize(14).text("Task Summary", { underline: true });
    const safeTasks = Array.isArray(tasks) ? tasks : [];
    const completedTasks = safeTasks.filter((task) => task.status === "completed").length;
    doc.fontSize(12).text(`Total Tasks: ${safeTasks.length}`);
    doc.text(`Completed Tasks: ${completedTasks}`);
    doc.moveDown(0.25);

    safeTasks.slice(0, 10).forEach((task, index) => {
      doc.text(
        `${index + 1}. ${task.title || "Untitled"} | ${task.status || "pending"} | ${task.priority || "medium"}`
      );
    });

    doc.moveDown(0.5);
    doc.fontSize(14).text("Expense Summary", { underline: true });
    const safeExpenses = Array.isArray(expenses) ? expenses : [];
    safeExpenses.slice(0, 10).forEach((expense, index) => {
      doc.fontSize(11).text(
        `${index + 1}. ${expense.category || "uncategorized"} - INR ${Number(expense.amount || 0).toLocaleString()} (${expense.expense_date || "N/A"})`
      );
    });

    doc.moveDown(0.5);
    doc.fontSize(14).text("Project Photos", { underline: true });

    const safePhotos = Array.isArray(photos) ? photos : [];
    for (const photo of safePhotos.slice(0, 6)) {
      const url = photo?.image_url;
      if (!url) continue;

      try {
        const img = await axios.get(url, {
          responseType: "arraybuffer",
          timeout: 8000,
        });

        if (doc.y > 700) doc.addPage();
        doc.image(img.data, { fit: [240, 170], align: "left" });
        doc.moveDown(0.5);
      } catch {
        doc.fontSize(10).fillColor("#64748B").text("Photo could not be loaded.");
        doc.fillColor("#000000");
      }
    }

    doc.end();
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
