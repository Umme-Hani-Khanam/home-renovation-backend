import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { authenticateUser } from "../middleware/auth.js";

const router = express.Router();
router.use(authenticateUser);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post("/", async (req, res) => {
  try {
    const { project_name, description, budget } = req.body;

    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const prompt = `
You are a professional renovation consultant.

Project Name: ${project_name}
Description: ${description}
Budget: ₹${budget}

Give:
- 5 creative renovation design ideas
- 5 recommended materials
- 3 practical DIY tips

Keep it practical and realistic.
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    res.json({
      success: true,
      data: text,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "AI recommendation failed",
    });
  }
});

export default router;