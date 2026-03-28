import OpenAI from "openai";

// React Router "resource route" style: export an action for POST
export async function action({ request }: { request: Request }) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Missing OPENAI_API_KEY on server" },
      { status: 500 }
    );
  }

  const body = await request.json().catch(() => null);
  if (!body) {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { jobTitle, jobDescription, resumeText } = body as {
    jobTitle?: string;
    jobDescription?: string;
    resumeText?: string;
  };

  if (!resumeText || typeof resumeText !== "string" || resumeText.trim().length < 50) {
    return Response.json(
      { error: "resumeText is required (min length 50)" },
      { status: 400 }
    );
  }

  const client = new OpenAI({ apiKey });

  // Strict schema to prevent “changing fields”
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
    response_format: responseFormat,
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
    return Response.json(
      { error: "OpenAI returned empty content" },
      { status: 500 }
    );
  }

  // Since we used json_schema response_format, content is guaranteed JSON text
  const parsed = JSON.parse(content);

  return Response.json(parsed);
}