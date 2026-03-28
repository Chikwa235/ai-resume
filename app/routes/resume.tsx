import { Link, useNavigate, useParams } from "react-router";
import { useEffect, useState } from "react";
import { usePuterStore } from "~/lib/puter";
import Summary from "~/components/Summary";
import ATS from "~/components/ATS";
import Details from "~/components/Details";

export const meta = () => [
  { title: "Resumind | Review " },
  { name: "description", content: "Detailed overview of your resume" },
];

const isNewSchema = (fb: any) => {
  return (
    fb &&
    typeof fb === "object" &&
    typeof fb.overallScore === "number" &&
    fb.ATS &&
    typeof fb.ATS.score === "number" &&
    Array.isArray(fb.ATS.tips) &&
    fb.toneAndStyle &&
    typeof fb.toneAndStyle.score === "number" &&
    fb.content &&
    typeof fb.content.score === "number" &&
    fb.structure &&
    typeof fb.structure.score === "number" &&
    fb.skills &&
    typeof fb.skills.score === "number"
  );
};

const SCALE_MAX = 5;

const toUiScore = (n: unknown) => {
  const num = typeof n === "number" ? n : 0;
  const clamped = Math.max(0, Math.min(SCALE_MAX, num));
  return Math.round((clamped / SCALE_MAX) * 100);
};

const toTips = (value: unknown) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .filter((x) => typeof x === "string" && x.trim().length > 0)
      .map((tip) => ({ tip, explanation: "" }));
  }
  if (typeof value === "string" && value.trim().length > 0) {
    return [{ tip: value, explanation: "" }];
  }
  return [];
};

// schema A: section_analysis.<key> = { score, feedback }
const getSectionA = (sectionAnalysis: any, key: string) => {
  const s = sectionAnalysis?.[key] ?? {};
  return {
    score: toUiScore(s.score),
    tips: toTips(s.feedback),
  };
};

// schema B: <key>_analysis = { score, feedback } OR { rating, feedback } OR { score, suggestions }
const getSectionB = (fb: any, key: string) => {
  const s = fb?.[key] ?? {};
  const rawScore = s.score ?? s.rating ?? s.overall_rating ?? s.value ?? 0;
  const tips = toTips(s.feedback) || toTips(s.suggestions) || [];
  return { score: toUiScore(rawScore), tips };
};

const mapFeedbackToUI = (fb: any) => {
  // --- Schema A ---
  if (fb?.section_analysis) {
    const sectionAnalysis = fb.section_analysis;

    return {
      overallScore: toUiScore(fb.resume_score),
      toneAndStyle: getSectionA(sectionAnalysis, "professional_summary"),
      content: getSectionA(sectionAnalysis, "professional_experience"),
      structure: getSectionA(sectionAnalysis, "formatting"),
      skills: getSectionA(sectionAnalysis, "technical_skills"),
      ATS: getSectionA(sectionAnalysis, "keywords"),
      strengths: Array.isArray(fb.strengths) ? fb.strengths : [],
      recommendations: toTips(fb.overall_feedback).map((x) => x.tip),
    };
  }

  // --- Schema B ---
  const overall = fb?.overall_rating ?? fb?.overall_score ?? 0;

  return {
    overallScore: toUiScore(overall),
    toneAndStyle: getSectionB(fb, "content_analysis"),
    content: getSectionB(fb, "content_analysis"),
    structure: getSectionB(fb, "formatting_analysis"),
    skills: getSectionB(fb, "job_match_analysis"),
    ATS: getSectionB(fb, "ats_analysis"),
    strengths: Array.isArray(fb.strengths) ? fb.strengths : [],
    recommendations: toTips(fb.summary || fb.overall_feedback).map((x) => x.tip),
  };
};

const Resume = () => {
  const { auth, isLoading, fs, kv } = usePuterStore();
  const { id } = useParams();
  const navigate = useNavigate();

  const [imageUrl, setImageUrl] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [feedback, setFeedback] = useState<any>(null);

  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !auth.isAuthenticated) {
      navigate(`/auth?next=/resume/${id}`);
    }
  }, [isLoading, auth?.isAuthenticated, id, navigate]);

  useEffect(() => {
    if (!id) {
      setError("Missing resume id in URL.");
      return;
    }

    let cancelled = false;

    setImageUrl("");
    setResumeUrl("");
    setFeedback(null);
    setError(null);
    setIsFetching(true);

    const loadResume = async () => {
      try {
        const resume = await kv.get(`resume:${id}`);
        if (!resume) {
          if (!cancelled) setError("Resume not found (no data in storage).");
          return;
        }

        const data = JSON.parse(resume);

        // Load PDF blob (optional)
        try {
          const resumeBlob = await fs.read(data.resumePath);
          if (resumeBlob && !cancelled) {
            const pdfBlob = new Blob([resumeBlob], { type: "application/pdf" });
            setResumeUrl(URL.createObjectURL(pdfBlob));
          }
        } catch (e) {
          console.warn("Failed to read resume PDF:", e);
        }

        // Load image blob (optional)
        try {
          const imageBlob = await fs.read(data.imagePath);
          if (imageBlob && !cancelled) {
            setImageUrl(URL.createObjectURL(imageBlob));
          }
        } catch (e) {
          console.warn("Failed to read resume image:", e);
        }

        const fb = data.feedback ?? null;
        console.log("Loaded feedback:", fb);

        if (!cancelled) {
          if (isNewSchema(fb)) setFeedback(fb);
          else if (fb) setFeedback(mapFeedbackToUI(fb));
          else setFeedback(null);
        }
      } catch (e: any) {
        console.error("Failed to load resume:", e);
        if (!cancelled) setError(e?.message ?? "Failed to load resume.");
      } finally {
        if (!cancelled) setIsFetching(false);
      }
    };

    loadResume();

    return () => {
      cancelled = true;
    };
  }, [id, fs, kv]);

  return (
    <main className="!pt-0">
      <nav className="resume-nav">
        <Link to="/" className="back-button">
          <img src="/back.svg" alt="logo" className="w-2.5 h-2.5" />
          <span className="text-gray-800 text-sm font-semibold">
            Back to Homepage
          </span>
        </Link>
      </nav>

      <div className="flex flex-row w-full max-lg:flex-col-reverse">
        <section className="feedback-section bg-[url('/bg-small.svg')] bg-cover h-[100vh] sticky top-0 flex items-center justify-center">
          {imageUrl ? (
            <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-[90%] max-w-xl:h-fit w-fit">
              {resumeUrl ? (
                <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
                  <img
                    src={imageUrl}
                    className="w-full h-full object-contain rounded-2xl"
                    title="resume"
                  />
                </a>
              ) : (
                <img
                  src={imageUrl}
                  className="w-full h-full object-contain rounded-2xl"
                  title="resume"
                />
              )}
            </div>
          ) : (
            <div className="text-gray-700 text-sm">
              {isFetching ? "Loading resume preview..." : "No preview available."}
            </div>
          )}
        </section>

        <section className="feedback-section p-4">
          <h2 className="text-4xl !text-black font-bold">Resume Review</h2>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-700 font-semibold">
              {error}
            </div>
          )}

          {isFetching && !feedback && !error && (
            <img src="/resume-scan-2.gif" className="w-full" />
          )}

          {!isFetching && !feedback && !error && (
            <div className="mt-4 p-3 rounded-lg bg-yellow-50 text-yellow-800">
              No feedback saved for this resume yet.
            </div>
          )}

          {feedback && (
            <div className="flex flex-col gap-8 animate-in fade-in duration-1000">
              <Summary feedback={feedback} />

              <ATS score={feedback?.ATS?.score ?? 0} suggestions={feedback?.ATS?.tips ?? []} />

              <Details feedback={feedback} />

              {feedback.strengths?.length > 0 && (
                <section>
                  <h3 className="text-xl font-semibold">Strengths</h3>
                  <ul className="list-disc pl-5">
                    {feedback.strengths.map((s: string, i: number) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </section>
              )}

              {feedback.recommendations?.length > 0 && (
                <section>
                  <h3 className="text-xl font-semibold">Recommendations</h3>
                  <ul className="list-disc pl-5">
                    {feedback.recommendations.map((r: string, i: number) => (
                      <li key={i}>{r}</li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default Resume;