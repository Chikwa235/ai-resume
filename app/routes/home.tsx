import type { Route } from "./+types/home";
import Navbar from "~/components/Navbar";
import {resumes} from "../../constants"

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
          <div className="page-heading">
            <h1>Track Your Applications & Resume Ratings</h1>
            <h2>Review your submissions and check AI-powered feedback.</h2>
          </div>
        </section>

        {resumes.map((resume) => (
            <div key={resume.id}>
              <h1>{resume.jobTitle}</h1>
            </div>
        ))}
      </main>
  );
}
