import { type FormEvent, useState } from "react";
import Navbar from "~/components/Navbar";
import FileUploader from "~/components/FileUploader";
import { usePuterStore } from "~/lib/puter";
import { useNavigate } from "react-router";
import { convertPdfToImage } from "~/lib/pdf2img";
import { generateUUID } from "~/lib/utils";

const Upload = () => {
  const { fs, kv } = usePuterStore();
  const navigate = useNavigate();

  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const handleFileSelect = (file: File | null) => setFile(file);

  const handleAnalyze = async ({
    companyName,
    jobTitle,
    jobDescription,
    file,
  }: {
    companyName: string;
    jobTitle: string;
    jobDescription: string;
    file: File;
  }) => {
    setIsProcessing(true);

    // 1) Upload PDF to Puter FS
    setStatusText("Uploading the file...");
    let uploadedFile: any;
    try {
      console.log("[1] uploading pdf...");
      uploadedFile = await fs.upload([file]);
      console.log("[1] uploadedFile:", uploadedFile);
    } catch (e) {
      console.error("fs.upload error:", e);
      setIsProcessing(false);
      setStatusText("Error: upload failed (see console)");
      return;
    }
    if (!uploadedFile) {
      setIsProcessing(false);
      setStatusText("Error: Failed to upload file");
      return;
    }

    // 2) Convert to image (for OCR)
    setStatusText("Converting to image...");
    let imageFile: any;
    try {
      console.log("[2] converting pdf to image...");
      imageFile = await convertPdfToImage(file);
      console.log("[2] imageFile:", imageFile);
    } catch (e) {
      console.error("convertPdfToImage error:", e);
      setIsProcessing(false);
      setStatusText("Error: Failed to convert PDF to image (see console)");
      return;
    }
    if (!imageFile?.file) {
      setIsProcessing(false);
      setStatusText("Error: Failed to convert PDF to image");
      return;
    }

    // 3) Upload image to Puter FS
    setStatusText("Uploading the image...");
    let uploadedImage: any;
    try {
      console.log("[3] uploading image...");
      uploadedImage = await fs.upload([imageFile.file]);
      console.log("[3] uploadedImage:", uploadedImage);
    } catch (e) {
      console.error("fs.upload (image) error:", e);
      setIsProcessing(false);
      setStatusText("Error: image upload failed (see console)");
      return;
    }
    if (!uploadedImage) {
      setIsProcessing(false);
      setStatusText("Error: Failed to upload image");
      return;
    }

    // 4) Save initial record
    setStatusText("Preparing data...");
    const uuid = generateUUID();
    const data: any = {
      id: uuid,
      resumePath: uploadedFile.path,
      imagePath: uploadedImage.path,
      companyName,
      jobTitle,
      jobDescription,
      feedback: null,
    };

    try {
      console.log("[4] saving initial kv...");
      await kv.set(`resume:${uuid}`, JSON.stringify(data));
      console.log("[4] saved initial kv");
    } catch (e) {
      console.error("kv.set error:", e);
      setIsProcessing(false);
      setStatusText("Error: failed saving resume data (see console)");
      return;
    }

    // 5) OCR (LOCAL, no Puter AI credits)
    setStatusText("Extracting resume text (OCR)...");
    let resumeText = "";
    try {
      console.log("[5] running tesseract OCR...");
      const { ocrImageFile } = await import("~/lib/ocr");
      resumeText = await ocrImageFile(imageFile.file);
      console.log("[5] resumeText length:", resumeText.length);
    } catch (e) {
      console.error("OCR error:", e);
      setIsProcessing(false);
      setStatusText("Error: OCR failed (see console)");
      return;
    }

    if (!resumeText || resumeText.trim().length < 50) {
      setIsProcessing(false);
      setStatusText("Error: OCR returned empty/too short text");
      return;
    }

    // OPTIONAL: truncate to reduce payload size (helps avoid 413 / function limits)
    const MAX_CHARS = 20000;
    const trimmedResumeText =
      resumeText.length > MAX_CHARS ? resumeText.slice(0, MAX_CHARS) : resumeText;

    console.log("[6] sending chars:", trimmedResumeText.length);

    // 6) Call backend (/api/feedback on Vercel; proxied to local server in dev)
    setStatusText("Analyzing with OpenAI...");
    let res: Response;
    try {
      console.log("[6] calling backend /api/feedback ...");
      res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobTitle,
          jobDescription,
          resumeText: trimmedResumeText,
        }),
      });
      console.log("[6] backend status:", res.status, res.statusText);
    } catch (e) {
      console.error("fetch backend failed:", e);
      setIsProcessing(false);
      setStatusText("Error: server request failed");
      return;
    }

    if (!res.ok) {
      const errText = await res.text();
      console.error("Backend error:", res.status, res.statusText, errText);
      setIsProcessing(false);
      setStatusText(`Error: Failed to analyze resume (server ${res.status})`);
      return;
    }

    let feedback: any;
    try {
      feedback = await res.json();
      console.log("[6] feedback received:", feedback);
    } catch (e) {
      const raw = await res.text().catch(() => "");
      console.error("Failed to parse backend JSON:", e, raw);
      setIsProcessing(false);
      setStatusText("Error: server returned invalid JSON");
      return;
    }

    // 7) Save final record with feedback
    data.feedback = feedback;
    try {
      console.log("[7] saving final kv...");
      await kv.set(`resume:${uuid}`, JSON.stringify(data));
      console.log("[7] saved final kv");
    } catch (e) {
      console.error("kv.set (final) error:", e);
      setIsProcessing(false);
      setStatusText("Error: failed saving feedback (see console)");
      return;
    }

    setStatusText("Analysis complete, redirecting...");
    console.log("[DONE] navigating to resume page:", uuid);
    navigate(`/resume/${uuid}`);
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget.closest("form");
    if (!form) return;

    const formData = new FormData(form);
    const companyName = (formData.get("company-name") as string) || "";
    const jobTitle = (formData.get("job-title") as string) || "";
    const jobDescription = (formData.get("job-description") as string) || "";

    if (!file) return;
    handleAnalyze({ companyName, jobTitle, jobDescription, file });
  };

  return (
    <main className="bg-[url('/bg-main.svg')] bg-cover">
      <Navbar />

      <section className="main-section">
        <div className="page-heading py-16">
          <h1>Smart feedback for your dream job</h1>

          {isProcessing ? (
            <>
              <h2>{statusText}</h2>
              <img src="/resume-scan.gif" className="w-full" />
            </>
          ) : (
            <h2>Drop your resume for an ATS score and improvement tips</h2>
          )}

          {!isProcessing && (
            <form
              id="upload-form"
              onSubmit={handleSubmit}
              className="flex flex-col gap-4 mt-8"
            >
              <div className="form-div">
                <label htmlFor="company-name">Company Name</label>
                <input
                  type="text"
                  name="company-name"
                  placeholder="Company Name"
                  id="company-name"
                />
              </div>

              <div className="form-div">
                <label htmlFor="job-title">Job Title</label>
                <input
                  type="text"
                  name="job-title"
                  placeholder="Job Title"
                  id="job-title"
                />
              </div>

              <div className="form-div">
                <label htmlFor="job-description">Job Description</label>
                <textarea
                  rows={5}
                  name="job-description"
                  placeholder="Job Description"
                  id="job-description"
                />
              </div>

              <div className="form-div">
                <label htmlFor="uploader">Upload Resume</label>
                <FileUploader onFileSelect={handleFileSelect} />
              </div>

              <button className="primary-button" type="submit">
                Analyze Resume
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  );
};

export default Upload;