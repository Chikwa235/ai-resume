import { Link } from "react-router";
import ScoreCircle from "~/components/ScoreCircle";
import { useEffect, useMemo, useState } from "react";
import { usePuterStore } from "~/lib/puter";

const clamp100 = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

const pickOverallScore = (feedback: any): number => {
  if (!feedback || typeof feedback !== "object") return 0;
  if (typeof feedback.overallScore === "number") return clamp100(feedback.overallScore);

  const maybe =
    feedback.overall_score ??
    feedback.overall_rating ??
    feedback.resume_score ??
    feedback.resumeScore ??
    feedback.score ??
    0;

  if (typeof maybe === "number") {
    if (maybe <= 5) return clamp100((Math.max(0, maybe) / 5) * 100);
    return clamp100(maybe);
  }
  return 0;
};

const pickAtsScore = (feedback: any): number => {
  if (!feedback || typeof feedback !== "object") return 0;
  if (feedback.ATS && typeof feedback.ATS.score === "number") return clamp100(feedback.ATS.score);

  const maybe =
    feedback.atsScore ??
    feedback.ats_score ??
    feedback.ats_analysis?.score ??
    feedback.section_analysis?.keywords?.score ??
    0;

  if (typeof maybe === "number") {
    if (maybe <= 5) return clamp100((Math.max(0, maybe) / 5) * 100);
    return clamp100(maybe);
  }
  return 0;
};

const pickTopRecommendations = (feedback: any): string[] => {
  if (!feedback || typeof feedback !== "object") return [];

  if (Array.isArray(feedback.recommendations)) {
    return feedback.recommendations
      .filter((x: any) => typeof x === "string" && x.trim())
      .slice(0, 2);
  }

  const fromArray = Array.isArray(feedback.suggestions)
    ? feedback.suggestions.filter((x: any) => typeof x === "string" && x.trim())
    : [];

  const fromSummary =
    typeof feedback.summary === "string" && feedback.summary.trim()
      ? [feedback.summary.trim()]
      : [];

  const fromOverallFeedback =
    typeof feedback.overall_feedback === "string" && feedback.overall_feedback.trim()
      ? [feedback.overall_feedback.trim()]
      : [];

  return [...fromArray, ...fromSummary, ...fromOverallFeedback].slice(0, 2);
};

const ResumeCard = ({
  resume,
  onDeleted,
}: {
  resume: Resume;
  onDeleted: (id: string) => void;
}) => {
  const { fs, kv } = usePuterStore();
  const [resumeUrl, setResumeUrl] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const { id, companyName, jobTitle, feedback, imagePath, resumePath } = resume as any;

  useEffect(() => {
    let url = "";
    const loadThumb = async () => {
      const blob = await fs.read(imagePath);
      if (!blob) return;
      url = URL.createObjectURL(blob);
      setResumeUrl(url);
    };

    loadThumb();

    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [imagePath, fs]);

  const overallScore = useMemo(() => pickOverallScore(feedback), [feedback]);
  const atsScore = useMemo(() => pickAtsScore(feedback), [feedback]);
  const topRecs = useMemo(() => pickTopRecommendations(feedback), [feedback]);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const ok = window.confirm("Delete this resume and its feedback?");
    if (!ok) return;

    setIsDeleting(true);

    try {
      // 1) Delete KV (source of truth)
      const kvOk = await kv.delete(`resume:${id}`);

      // 2) Update UI immediately even if file deletes fail
      onDeleted(id);

      // 3) Delete files best-effort (do not block UI)
      if (resumePath) {
        fs.delete(resumePath).catch((err) =>
          console.warn("Failed to delete resume file:", err)
        );
      }
      if (imagePath) {
        fs.delete(imagePath).catch((err) =>
          console.warn("Failed to delete image file:", err)
        );
      }

      if (kvOk === false) {
        console.warn("KV delete returned false for", id);
      }
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete. Check console for details.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Link to={`/resume/${id}`} className="resume-card animate-in fade-in duration-1000">
      <div className="resume-card-header">
        <div className="flex flex-col gap-2 min-w-0">
          {companyName ? (
            <h2 className="!text-black font-bold break-words">{companyName}</h2>
          ) : (
            <h2 className="!text-black font-bold">Resume</h2>
          )}

          {jobTitle && <h3 className="text-lg break-words text-gray-500">{jobTitle}</h3>}

          <div className="text-sm text-gray-600">
            <span className="font-semibold text-gray-800">ATS:</span> {atsScore}/100
          </div>

          {topRecs.length > 0 && (
            <ul className="mt-1 text-sm text-gray-600 list-disc pl-5">
              {topRecs.map((rec, idx) => (
                <li key={idx} className="break-words">
                  {rec}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <ScoreCircle score={overallScore} />

          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="text-sm font-semibold text-red-600 hover:text-red-700 disabled:opacity-50"
            title="Delete resume"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      {resumeUrl && (
        <div className="gradient-border animate-in fade-in duration-1000">
          <div className="w-full h-full">
            <img
              src={resumeUrl}
              alt="resume"
              className="w-full h-[350px] max-sm:h-[200px] object-cover object-top"
            />
          </div>
        </div>
      )}
    </Link>
  );
};

export default ResumeCard;