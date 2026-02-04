import { Link, useNavigate, useParams } from "react-router";
import { useEffect, useState } from "react";
import { usePuterStore } from "~/lib/puter";
import Summary from "~/components/Summary";
import ATS from "~/components/ATS";
import Details from "~/components/Details";

export const meta = () => [
  { title: "Resumind | Review" },
  { name: "description", content: "Detailed overview of your resume" },
];

const Resume = () => {
  const { auth, isLoading, fs, kv } = usePuterStore();
  const { id } = useParams();
  const [imageUrl, setImageUrl] = useState("");
  const [resumeUrl, setResumeUrl] = useState("");
  const [feedback, setFeedback] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && !auth.isAuthenticated) {
      navigate(`/auth?next=/resume/${id}`);
    }
  }, [isLoading, auth, id, navigate]);

  useEffect(() => {
    const loadResume = async () => {
      const resumeRaw = await kv.get(`resume:${id}`);
      if (!resumeRaw) return;

      const data = JSON.parse(resumeRaw);
      console.log("RAW RESUME DATA →", data);

      // --- Load PDF ---
      if (data.resumePath) {
        const resumeBlob = await fs.read(data.resumePath);
        if (resumeBlob) {
          setResumeUrl(
            URL.createObjectURL(new Blob([resumeBlob], { type: "application/pdf" }))
          );
        }
      }

      // --- Load Preview Image ---
      if (data.imagePath) {
        const imageBlob = await fs.read(data.imagePath);
        if (imageBlob) {
          setImageUrl(URL.createObjectURL(imageBlob));
        }
      }

      // --- Normalize Feedback ---
      const fb = data.feedback ?? {};

      const humanScore = Number(fb.overall_score ?? 0); // Your console shows overall_score: 2
      const atsScore = Number(fb.ATS_compatibility ?? 0);

      const transformedFeedback = {
        overallScore: humanScore,
        overallRating: humanScore,
        toneAndStyle: {
          score: humanScore,
          tips: fb.content_feedback?.map((tip: string) => ({ type: "improve", tip, explanation: "" })) || [],
        },
        content: {
          score: humanScore,
          tips: fb.content_feedback?.map((tip: string) => ({ type: "improve", tip, explanation: "" })) || [],
        },
        structure: {
          score: humanScore,
          tips: fb.formatting_feedback?.map((tip: string) => ({ type: "improve", tip, explanation: "" })) || [],
        },
        skills: {
          score: humanScore,
          tips: fb.keyword_feedback?.map((tip: string) => ({ type: "improve", tip, explanation: "" })) || [],
        },
        ATS: {
          score: atsScore,
          tips: fb.ATS_feedback?.map((tip: string) => ({ type: "improve", tip, explanation: "" })) || [],
        },
        finalRecommendation: fb.final_recommendation || "",
      };

      setFeedback(transformedFeedback);
    };

    loadResume();
  }, [id, fs, kv]);

  return (
    <main className="!pt-0">
      <nav className="resume-nav">
        <Link to="/" className="back-button">
          <img src="/back.svg" alt="logo" className="w-2.5 h-2.5" />
          <span className="text-gray-800 text-sm font-semibold">Back to Homepage</span>
        </Link>
      </nav>

      <div className="flex flex-row w-full max-lg:flex-col-reverse">
        {/* Resume Image Section */}
        <section className="feedback-section bg-[url('/bg-small.svg')] bg-cover h-[100vh] sticky top-0 flex items-center justify-center">
          {imageUrl && resumeUrl && (
            <div className="animate-in fade-in duration-1000 gradient-border max-sm:m-0 h-[90%] max-w-xl:h-fit w-fit">
              <a href={resumeUrl} target="_blank" rel="noopener noreferrer">
                <img
                  src={imageUrl}
                  className="w-full h-full object-contain rounded-2xl"
                  alt="resume"
                />
              </a>
            </div>
          )}
        </section>

        {/* Feedback Section */}
        <section className="feedback-section">
          <h2 className="text-4xl !text-black font-bold">Resume Review</h2>

          {feedback ? (
            <div className="flex flex-col gap-8 animate-in fade-in duration-1000">
              <Summary feedback={feedback} />
              <ATS score={feedback.ATS.score} suggestions={feedback.ATS.tips} />
              <Details feedback={feedback} />
            </div>
          ) : (
            <div className="flex flex-col items-center mt-12">
              <h3 className="text-lg font-medium mb-4">Loading resume feedback...</h3>
              <img src="/resume-scan-2.gif" className="w-1/2" />
            </div>
          )}
        </section>
      </div>
    </main>
  );
};

export default Resume;