import "dotenv/config";
import express from "express";
import OpenAI from "openai";
import path from "path";

const app = express();

app.use(express.json({ limit: "2mb" }));

app.post("/api/feedback", async (req, res) => {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "Missing OPENAI_API_KEY on server" });
    }

    const { jobTitle, jobDescription, resumeText } = (req.body ?? {}) as {
      jobTitle?: string;
      jobDescription?: string;
      resumeText?: string;
    };

    if (
      !resumeText ||
      typeof resumeText !== "string" ||
      resumeText.trim().length < 50
    ) {
      return res
        .status(400)
        .json({ error: "resumeText is required (min length 50)" });
    }

    const client = new OpenAI({ apiKey });

    const responseFormat = {
      type: "json_schema",
      json_schema: {
        name: "resume_feedback",
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
            ATS: {
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
            toneAndStyle: {
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
            content: {
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
            structure: {
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
            skills: {
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
            strengths: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } },
          },
        },
        strict: true,
      },
    } as const;

    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      temperature: 0.2,
      response_format: responseFormat as any,
      messages: [
        {
          role: "system",
          content:
            "You are an expert ATS and resume reviewer. Be specific, concise, and actionable.",
        },
        {
          role: "user",
          content: `Job title: ${jobTitle ?? ""}\nJob description:\n${
            jobDescription ?? ""
          }\n\nResume:\n${resumeText}`,
        },
      ],
    });

    const content = completion.choices?.[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ error: "OpenAI returned empty content" });
    }

    return res.status(200).json(JSON.parse(content));
  } catch (e: any) {
    return res.status(500).json({ error: e?.message ?? "Server error" });
  }
});

// Serve the built SPA
app.use(express.static(path.join(process.cwd(), "build", "client")));

// SPA fallback (regex catch-all to avoid path-to-regexp "*" issues)
app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(process.cwd(), "build", "client", "index.html"));
});

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => console.log(`Server running on port ${port}`));