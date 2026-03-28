// constants.ts (or whatever file this lives in)

export const resumes: Resume[] = [
  {
    id: "1",
    companyName: "Google",
    jobTitle: "Frontend Developer",
    imagePath: "/images/resume-1.png",
    resumePath: "/resumes/resume-1.pdf",
    feedback: {
      overallScore: 85,
      ATS: { score: 90, tips: [] },
      toneAndStyle: { score: 90, tips: [] },
      content: { score: 90, tips: [] },
      structure: { score: 90, tips: [] },
      skills: { score: 90, tips: [] },
      strengths: [],
      recommendations: [],
    },
  },
  {
    id: "2",
    companyName: "Microsoft",
    jobTitle: "Cloud Engineer",
    imagePath: "/images/resume-2.png",
    resumePath: "/resumes/resume-2.pdf",
    feedback: {
      overallScore: 55,
      ATS: { score: 90, tips: [] },
      toneAndStyle: { score: 90, tips: [] },
      content: { score: 90, tips: [] },
      structure: { score: 90, tips: [] },
      skills: { score: 90, tips: [] },
      strengths: [],
      recommendations: [],
    },
  },
  {
    id: "3",
    companyName: "Apple",
    jobTitle: "iOS Developer",
    imagePath: "/images/resume-3.png",
    resumePath: "/resumes/resume-3.pdf",
    feedback: {
      overallScore: 75,
      ATS: { score: 90, tips: [] },
      toneAndStyle: { score: 90, tips: [] },
      content: { score: 90, tips: [] },
      structure: { score: 90, tips: [] },
      skills: { score: 90, tips: [] },
      strengths: [],
      recommendations: [],
    },
  },
];

export const AIResponseFormat = `
Return ONLY valid JSON matching this exact schema (no markdown, no backticks, no extra text).

{
  "overallScore": 0,
  "ATS": {
    "score": 0,
    "tips": [
      { "type": "good", "tip": "Short title", "explanation": "Detailed explanation" },
      { "type": "improve", "tip": "Short title", "explanation": "Detailed explanation" }
    ]
  },
  "toneAndStyle": {
    "score": 0,
    "tips": [
      { "type": "good", "tip": "Short title", "explanation": "Detailed explanation" },
      { "type": "improve", "tip": "Short title", "explanation": "Detailed explanation" }
    ]
  },
  "content": {
    "score": 0,
    "tips": [
      { "type": "good", "tip": "Short title", "explanation": "Detailed explanation" },
      { "type": "improve", "tip": "Short title", "explanation": "Detailed explanation" }
    ]
  },
  "structure": {
    "score": 0,
    "tips": [
      { "type": "good", "tip": "Short title", "explanation": "Detailed explanation" },
      { "type": "improve", "tip": "Short title", "explanation": "Detailed explanation" }
    ]
  },
  "skills": {
    "score": 0,
    "tips": [
      { "type": "good", "tip": "Short title", "explanation": "Detailed explanation" },
      { "type": "improve", "tip": "Short title", "explanation": "Detailed explanation" }
    ]
  },
  "strengths": ["..."],
  "recommendations": ["..."]
}

Rules:
- All scores must be integers from 0 to 100.
- Each tips array must contain 3 to 5 items.
- "type" must be exactly "good" or "improve".
- Do not change any key names.
- Do not omit any fields (use empty arrays if needed).
`.trim();

export const prepareInstructions = ({
  jobTitle,
  jobDescription,
}: {
  jobTitle: string;
  jobDescription: string;
}) =>
  `
You are an expert in ATS (Applicant Tracking System) and resume analysis.

Analyze the attached resume file and produce structured feedback tailored to:
Job title: ${jobTitle}
Job description: ${jobDescription}

${AIResponseFormat}
`.trim();