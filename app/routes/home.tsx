import type { Route } from "./+types/home";
import Navbar from "~/components/Navbar";
import {resumes} from "../../constants"
import ResumeCard from "~/components/ResumeCard";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Resumind" },
    { name: "description", content: "Smart feedback for your dream job" },
  ];
}

export default function Home() {
  return (
      <main className="bg-[url('bg-main.svg')] bg-cover">
        <Navbar />


        <section className="main-section">
          <div className="page-heading py-16">
            <h1>Track Your Applications & Resume Ratings</h1>
            <h2>Review your submissions and check AI-powered feedback.</h2>
          </div>

          {resumes.length > 0 && (


        <div className="resumes-section flex flex-row flex-wrap justify-center gap-6 ">
            {resumes.map((resume) => (
                <ResumeCard key={resume.id} resume={resume} />
            ))}
        </div>

          )}
        </section>
      </main>
  );
}
