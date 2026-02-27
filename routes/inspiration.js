import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import { authenticateUser } from "../middleware/auth.js";

dotenv.config();

const router = express.Router();
router.use(authenticateUser);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post("/", async (req, res) => {
  try {
    const { project_name, description, budget } = req.body;

    if (!project_name) {
      return res.status(400).json({
        success: false,
        message: "Project name required",
      });
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash", // recommended free-tier model
    });

    const prompt = `
You are a professional renovation consultant.

Project: ${project_name}
Description: ${description || "General renovation guidance"}
Budget: ₹${budget || "Not specified"}

Provide:
• 5 renovation design ideas
• 5 recommended materials
• 3 actionable DIY tips

Be clear and budget-aware.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    res.json({
      success: true,
      data: text,
    });
  } catch (error) {
    console.error("Gemini Error:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

export default router;