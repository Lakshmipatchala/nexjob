import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "NexJob — AI-Powered Job Search",
  description: "Find your dream job with AI assistance. Aggregates jobs from LinkedIn, Indeed, Glassdoor, Greenhouse, Lever and more. AI tailors your resume for every application.",
  keywords: "job search, AI resume, job portal, LinkedIn jobs, Indeed jobs, remote jobs",
  openGraph: {
    title: "NexJob — AI-Powered Job Search",
    description: "Find your dream job with AI assistance",
    url: "https://nexjob-sigma.vercel.app",
    siteName: "NexJob",
    type: "website",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}