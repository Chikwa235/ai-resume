import "dotenv/config";
import express from "express";
import cors from "cors";
import OpenAI from "openai";

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

app.post("/api/feedback", async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "Missing OPENAI_API_KEY" });

    const { jobTitle = "", jobDescription = "", resumeText = "" } = req.body || {};
    if (typeof resumeText !== "string" || resumeText.trim().length < 50) {
      return res.status(400).json({ error: "resumeText is required (min length 50)" });
    }

    const client = new OpenAI({ apiKey });

    const responseFormat = {
      type: "json_schema",
      json_schema: {
        name: "resume_feedback",
        strict: true,
        schema: {
          type: "object",
          additionalProperties: false,
          required: [
            "overallScore",
            "ATS",
            "toneAndStyle",
            "content",
            "structure",
            "skills",
            "strengths",
            "recommendations",
          ],
          properties: {
            overallScore: { type: "integer", minimum: 0, maximum: 100 },
            ATS: { $ref: "#/$defs/section" },
            toneAndStyle: { $ref: "#/$defs/section" },
            content: { $ref: "#/$defs/section" },
            structure: { $ref: "#/$defs/section" },
            skills: { $ref: "#/$defs/section" },
            strengths: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } },
          },
          $defs: {
            section: {
              type: "object",
              additionalProperties: false,
              required: ["score", "tips"],
              properties: {
                score: { type: "integer", minimum: 0, maximum: 100 },
                tips: {
                  type: "array",
                  minItems: 3,
                  maxItems: 5,
                  items: {
                    type: "object",
                    additionalProperties: false,
                    required: ["type", "tip", "explanation"],
                    properties: {
                      type: { type: "string", enum: ["good", "improve"] },
                      tip: { type: "string" },
                      explanation: { type: "string" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      response_format: responseFormat,
      messages: [
        { role: "system", content: "You are an expert ATS and resume reviewer." },
        {
          role: "user",
          content: `Job title: ${jobTitle}\nJob description:\n${jobDescription}\n\nResume:\n${resumeText}`,
        },
      ],
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content) return res.status(500).json({ error: "OpenAI returned empty content" });

    res.json(JSON.parse(content));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(3001, () => console.log("OpenAI API server running on http://localhost:3001"));