"use client"
import { useState, useRef } from "react"
import mammoth from "mammoth"

export default function ResumePage() {
  const [resumeText, setResumeText] = useState("")
  const [jobDescription, setJobDescription] = useState("")
  const [jobTitle, setJobTitle] = useState("")
  const [company, setCompany] = useState("")
  const [pages, setPages] = useState("1")
  const [style, setStyle] = useState("professional")
  const [experienceLevel, setExperienceLevel] = useState("senior")
  const [bulletsPerJob, setBulletsPerJob] = useState(3)
  const [includeSections, setIncludeSections] = useState({
    summary: true, experience: true, education: true,
    skills: true, certifications: false, projects: false
  })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState("")
  const [downloadingPDF, setDownloadingPDF] = useState(false)
  const [downloadingWord, setDownloadingWord] = useState(false)
  const [fileName, setFileName] = useState("")
  const resumeRef = useRef<HTMLDivElement>(null)

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    if (file.name.endsWith(".docx")) {
      const arrayBuffer = await file.arrayBuffer()
      const res = await mammoth.extractRawText({ arrayBuffer })
      setResumeText(res.value)
    } else {
      const reader = new FileReader()
      reader.onload = (evt) => setResumeText(evt.target?.result as string)
      reader.readAsText(file)
    }
  }

  function toggleSection(key: string) {
    setIncludeSections(prev => ({ ...prev, [key]: !prev[key as keyof typeof prev] }))
  }

  async function handleGenerate() {
    if (!resumeText || !jobDescription) {
      setError("Please provide your resume and the job description")
      return
    }
    setLoading(true)
    setError("")
    setResult(null)
    const sections = Object.entries(includeSections).filter(([,v])=>v).map(([k])=>k).join(", ")
    const formData = new FormData()
    formData.append("resumeText", resumeText)
    formData.append("jobDescription", jobDescription)
    formData.append("jobTitle", jobTitle)
    formData.append("company", company)
    formData.append("pages", pages)
    formData.append("style", style)
    formData.append("experienceLevel", experienceLevel)
    formData.append("sections", sections)
    formData.append("bulletsPerJob", bulletsPerJob.toString())
    const res = await fetch("/api/resume", { method: "POST", body: formData })
    const data = await res.json()
    if (data.error) setError(data.error)
    else setResult(data.result)
    setLoading(false)
  }

  async function downloadPDF() {
    if (!resumeRef.current || !result) return
    setDownloadingPDF(true)
    try {
      const { default: jsPDF } = await import("jspdf")
      const { default: html2canvas } = await import("html2canvas")
      const canvas = await html2canvas(resumeRef.current, { scale: 2, backgroundColor: "#ffffff" })
      const imgData = canvas.toDataURL("image/png")
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" })
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      let heightLeft = pdfHeight
      let position = 0
      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight)
      heightLeft -= pdf.internal.pageSize.getHeight()
      while (heightLeft >= 0) {
        position = heightLeft - pdfHeight
        pdf.addPage()
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight)
        heightLeft -= pdf.internal.pageSize.getHeight()
      }
      const name = result.full_resume?.name?.replace(/\s+/g, "_") || "resume"
      pdf.save(`${name}_${company || "tailored"}_resume.pdf`)
    } catch (err) { alert("PDF download failed.") }
    setDownloadingPDF(false)
  }

  async function downloadWord() {
    if (!result) return
    setDownloadingWord(true)
    try {
      const { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Packer, BorderStyle } = await import("docx")
      const { saveAs } = await import("file-saver")
      const r = result.full_resume
      const sectionHeading = (text: string) => new Paragraph({
        text, heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000", space: 4 } }
      })
      const children: any[] = [
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: r.name, bold: true, size: 48, font: "Arial" })]
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 240 },
          children: [new TextRun({ text: [r.email, r.phone, r.location, r.linkedin].filter(Boolean).join("  ·  "), size: 18, color: "555555", font: "Arial" })]
        }),
      ]
      if (includeSections.summary && r.summary) {
        children.push(sectionHeading("PROFESSIONAL SUMMARY"))
        children.push(new Paragraph({ children: [new TextRun({ text: r.summary, size: 20, font: "Arial" })], spacing: { after: 120 } }))
      }
      if (includeSections.experience && r.experience) {
        children.push(sectionHeading("EXPERIENCE"))
        r.experience.forEach((exp: any) => {
          children.push(new Paragraph({
            spacing: { before: 160, after: 60 },
            children: [
              new TextRun({ text: `${exp.title}  —  ${exp.company}`, bold: true, size: 22, font: "Arial" }),
              new TextRun({ text: `\t${exp.duration}`, size: 18, color: "666666", font: "Arial" })
            ]
          }))
          exp.bullets?.forEach((b: string) => {
            children.push(new Paragraph({
              bullet: { level: 0 },
              children: [new TextRun({ text: b, size: 20, font: "Arial" })],
              spacing: { after: 60 }
            }))
          })
        })
      }
      if (includeSections.education && r.education) {
        children.push(sectionHeading("EDUCATION"))
        r.education?.forEach((edu: any) => {
          children.push(new Paragraph({
            spacing: { after: 80 },
            children: [
              new TextRun({ text: edu.degree, bold: true, size: 20, font: "Arial" }),
              new TextRun({ text: `  —  ${edu.school}, ${edu.year}`, size: 20, color: "555555", font: "Arial" })
            ]
          }))
        })
      }
      if (includeSections.skills && r.skills) {
        children.push(sectionHeading("SKILLS"))
        children.push(new Paragraph({ children: [new TextRun({ text: r.skills?.join("  ·  "), size: 20, font: "Arial" })], spacing: { after: 120 } }))
      }
      if (includeSections.certifications && r.certifications?.length) {
        children.push(sectionHeading("CERTIFICATIONS"))
        r.certifications.forEach((c: any) => {
          const certText = typeof c === "string" ? c : `${c.name}${c.issuer ? " — " + c.issuer : ""}${c.year ? " (" + c.year + ")" : ""}`
          children.push(new Paragraph({ bullet: { level: 0 }, children: [new TextRun({ text: certText, size: 20, font: "Arial" })], spacing: { after: 60 } }))
        })
      }
      if (includeSections.projects && r.projects?.length) {
        children.push(sectionHeading("PROJECTS"))
        r.projects.forEach((p: any) => {
          children.push(new Paragraph({ spacing: { before: 120, after: 40 }, children: [new TextRun({ text: p.name, bold: true, size: 20, font: "Arial" })] }))
          children.push(new Paragraph({ children: [new TextRun({ text: p.description, size: 20, font: "Arial" })], spacing: { after: 80 } }))
        })
      }
      const doc = new Document({
        sections: [{ properties: { page: { margin: { top: 720, right: 720, bottom: 720, left: 720 } } }, children }]
      })
      const blob = await Packer.toBlob(doc)
      const name = r.name?.replace(/\s+/g, "_") || "resume"
      saveAs(blob, `${name}_${company || "tailored"}_resume.docx`)
    } catch (err: any) { alert("Word download failed: " + err.message) }
    setDownloadingWord(false)
  }

  const inp = { width:"100%", background:"hsl(224 71% 8%)", border:"1px solid hsl(216 34% 17%)", borderRadius:"10px", padding:"11px 14px", color:"hsl(213 31% 91%)", fontSize:"14px", outline:"none", boxSizing:"border-box" as const, marginBottom:"16px" }
  const sel = { ...inp, cursor:"pointer" }
  const lbl = { display:"block" as const, fontSize:"13px", color:"hsl(215 20% 65%)", marginBottom:"6px", fontWeight:"500" as const }
  const card = { background:"hsl(224 71% 6%)", border:"1px solid hsl(216 34% 17%)", borderRadius:"12px", padding:"20px", marginBottom:"16px" }
  const secBtn = (active: boolean) => ({
    padding:"6px 14px", borderRadius:"20px", fontSize:"12px", fontWeight:"600" as const,
    border: active ? "none" : "1px solid hsl(216 34% 25%)",
    background: active ? "#7c3aed" : "transparent",
    color: active ? "white" : "hsl(215 20% 65%)",
    cursor:"pointer"
  })

  return (
    <div style={{minHeight:"100vh", background:"hsl(224 71% 4%)", padding:"32px"}}>
      <h1 style={{fontSize:"28px", fontWeight:"700", color:"hsl(213 31% 91%)", marginBottom:"6px"}}>AI Resume Builder</h1>
      <p style={{fontSize:"14px", color:"hsl(215 20% 65%)", marginBottom:"28px"}}>Upload Word resume · Set specifications · Claude rewrites everything · Download PDF or Word</p>

      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:"24px", marginBottom:"20px"}}>
        <div>
          <div style={card}>
            <div style={{fontSize:"14px", fontWeight:"600", color:"hsl(213 31% 91%)", marginBottom:"14px"}}>Target Job</div>
            <label style={lbl}>Job Title</label>
            <input style={inp} value={jobTitle} onChange={e=>setJobTitle(e.target.value)} placeholder="e.g. Senior Data Engineer"/>
            <label style={lbl}>Company</label>
            <input style={{...inp, marginBottom:"0"}} value={company} onChange={e=>setCompany(e.target.value)} placeholder="e.g. Google"/>
          </div>

          <div style={card}>
            <div style={{fontSize:"14px", fontWeight:"600", color:"hsl(213 31% 91%)", marginBottom:"14px"}}>Resume Specifications</div>
            <label style={lbl}>Number of Pages</label>
            <select style={sel} value={pages} onChange={e=>setPages(e.target.value)}>
              <option value="1">1 Page — Entry level / concise</option>
              <option value="2">2 Pages — Mid to senior (recommended)</option>
              <option value="3">3 Pages — Executive / academic</option>
              <option value="4">4 Pages — Detailed executive / federal resume</option>
              <option value="5">5 Pages — Academic CV / research portfolio</option>
              <option value="6">6 Pages — Comprehensive CV / senior academic</option>
            </select>
            <label style={lbl}>Resume Style</label>
            <select style={sel} value={style} onChange={e=>setStyle(e.target.value)}>
              <option value="professional">Professional — Traditional corporate</option>
              <option value="modern">Modern — Clean strong action verbs</option>
              <option value="technical">Technical — Tools and skills focused</option>
              <option value="executive">Executive — Leadership and impact</option>
              <option value="creative">Creative — Dynamic storytelling</option>
            </select>
            <label style={lbl}>Experience Level</label>
            <select style={sel} value={experienceLevel} onChange={e=>setExperienceLevel(e.target.value)}>
              <option value="entry">Entry Level (0-2 years)</option>
              <option value="mid">Mid Level (3-5 years)</option>
              <option value="senior">Senior Level (6-10 years)</option>
              <option value="executive">Executive (10+ years)</option>
            </select>

            {/* BULLETS SLIDER */}
            <label style={lbl}>
              Bullet Points Per Job
              <span style={{color:"#a78bfa", fontWeight:"700", marginLeft:"8px", fontSize:"15px"}}>{bulletsPerJob}</span>
            </label>
            <div style={{display:"flex", alignItems:"center", gap:"12px", marginBottom:"8px"}}>
              <span style={{fontSize:"12px", color:"hsl(215 20% 45%)"}}>2</span>
              <input
                type="range" min="2" max="8" value={bulletsPerJob}
                onChange={e => setBulletsPerJob(Number(e.target.value))}
                style={{flex:1, accentColor:"#7c3aed", cursor:"pointer", height:"4px"}}
              />
              <span style={{fontSize:"12px", color:"hsl(215 20% 45%)"}}>8</span>
            </div>
            <div style={{display:"flex", justifyContent:"space-between", marginBottom:"0"}}>
              {[2,3,4,5,6,7,8].map(n => (
                <button key={n} onClick={()=>setBulletsPerJob(n)}
                  style={{width:"32px", height:"32px", borderRadius:"8px", border:"none", fontSize:"13px", fontWeight:"600", cursor:"pointer",
                    background: bulletsPerJob===n ? "#7c3aed" : "hsl(224 71% 8%)",
                    color: bulletsPerJob===n ? "white" : "hsl(215 20% 65%)"}}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          <div style={card}>
            <div style={{fontSize:"14px", fontWeight:"600", color:"hsl(213 31% 91%)", marginBottom:"12px"}}>Sections to Include</div>
            <div style={{display:"flex", flexWrap:"wrap" as const, gap:"8px"}}>
              {Object.entries(includeSections).map(([key, val]) => (
                <button key={key} style={secBtn(val)} onClick={()=>toggleSection(key)}>
                  {val ? "✓" : "+"} {key.charAt(0).toUpperCase() + key.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div style={card}>
            <div style={{fontSize:"14px", fontWeight:"600", color:"hsl(213 31% 91%)", marginBottom:"14px"}}>Your Resume</div>
            <div style={{border:"2px dashed hsl(216 34% 25%)", borderRadius:"12px", padding:"20px", textAlign:"center" as const, background:"hsl(224 71% 4%)", cursor:"pointer", marginBottom:"12px", position:"relative" as const}}>
              <input type="file" accept=".docx,.txt" onChange={handleFileUpload}
                style={{position:"absolute" as const, inset:"0", opacity:0, cursor:"pointer", width:"100%", height:"100%"}}/>
              <div style={{fontSize:"24px", marginBottom:"6px"}}>📄</div>
              <div style={{fontSize:"14px", fontWeight:"600", color:"hsl(213 31% 91%)", marginBottom:"3px"}}>
                {fileName || "Upload .docx Word file or .txt"}
              </div>
              <div style={{fontSize:"12px", color:"hsl(215 20% 45%)"}}>Click to browse</div>
              {fileName && <div style={{marginTop:"8px", fontSize:"12px", color:"#4ade80", fontWeight:"600"}}>✓ {fileName} — {resumeText.length} characters</div>}
            </div>
            <textarea style={{...inp, resize:"vertical" as const, minHeight:"100px", marginBottom:"0"}}
              value={resumeText} onChange={e=>setResumeText(e.target.value)}
              placeholder="Or paste resume text here..."/>
          </div>
        </div>

        <div>
          <div style={card}>
            <label style={lbl}>Job Description</label>
            <textarea style={{...inp, resize:"vertical" as const, minHeight:"640px", marginBottom:"0"}}
              value={jobDescription} onChange={e=>setJobDescription(e.target.value)}
              placeholder="Paste the full job description here..."/>
          </div>
        </div>
      </div>

      <div style={{background:"rgba(124,110,245,0.08)", border:"1px solid rgba(124,110,245,0.2)", borderRadius:"10px", padding:"12px 16px", marginBottom:"16px", fontSize:"13px", color:"hsl(215 20% 65%)"}}>
        <strong style={{color:"#a78bfa"}}>Spec:</strong> {pages} page{pages!=="1"?"s":""} · {style} · {experienceLevel} · <strong style={{color:"#a78bfa"}}>{bulletsPerJob} bullets/job</strong> · Sections: {Object.entries(includeSections).filter(([,v])=>v).map(([k])=>k).join(", ")}
      </div>

      {error && <div style={{padding:"12px 16px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:"8px", color:"#f87171", fontSize:"13px", marginBottom:"16px"}}>{error}</div>}

      <button onClick={handleGenerate} disabled={loading}
        style={{width:"100%", background:"linear-gradient(135deg, #7c3aed, #a855f7)", color:"white", padding:"14px", borderRadius:"10px", fontSize:"15px", fontWeight:"600", border:"none", cursor:loading?"not-allowed":"pointer", opacity:loading?0.7:1}}>
        {loading ? `Claude is writing your ${bulletsPerJob}-bullet resume... (20-30 seconds)` : `Generate Full Tailored Resume (${bulletsPerJob} bullets per job)`}
      </button>

      {result && (
        <div style={{marginTop:"32px"}}>
          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"20px", flexWrap:"wrap" as const, gap:"12px"}}>
            <div>
              <h2 style={{fontSize:"22px", fontWeight:"700", color:"hsl(213 31% 91%)", margin:"0 0 4px"}}>Your Tailored Resume</h2>
              <p style={{fontSize:"13px", color:"hsl(215 20% 65%)", margin:"0"}}>{pages} page · {style} · {experienceLevel} · {bulletsPerJob} bullets/job</p>
            </div>
            <div style={{display:"flex", gap:"10px"}}>
              <button onClick={downloadWord} disabled={downloadingWord}
                style={{background:"#1d4ed8", color:"white", padding:"12px 24px", borderRadius:"10px", fontSize:"14px", fontWeight:"600", border:"none", cursor:"pointer", opacity:downloadingWord?0.7:1}}>
                {downloadingWord ? "Generating..." : "📝 Download Word"}
              </button>
              <button onClick={downloadPDF} disabled={downloadingPDF}
                style={{background:"#059669", color:"white", padding:"12px 24px", borderRadius:"10px", fontSize:"14px", fontWeight:"600", border:"none", cursor:"pointer", opacity:downloadingPDF?0.7:1}}>
                {downloadingPDF ? "Generating..." : "📄 Download PDF"}
              </button>
            </div>
          </div>

          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:"16px", marginBottom:"20px"}}>
            <div style={{...card, textAlign:"center" as const}}>
              <div style={{fontSize:"13px", color:"hsl(215 20% 65%)", marginBottom:"6px"}}>ATS Before</div>
              <div style={{fontSize:"40px", fontWeight:"700", color:"#f87171"}}>{result.ats_score_before}</div>
            </div>
            <div style={{...card, textAlign:"center" as const}}>
              <div style={{fontSize:"13px", color:"hsl(215 20% 65%)", marginBottom:"6px"}}>ATS After</div>
              <div style={{fontSize:"40px", fontWeight:"700", color:"#4ade80"}}>{result.ats_score_after}</div>
            </div>
            <div style={card}>
              <div style={{fontSize:"13px", color:"hsl(215 20% 65%)", marginBottom:"8px"}}>Keywords Added</div>
              <div>{result.keywords_added?.map((k:string) => (
                <span key={k} style={{display:"inline-block", fontSize:"11px", padding:"3px 10px", borderRadius:"20px", background:"rgba(124,110,245,0.15)", color:"#a78bfa", marginRight:"6px", marginBottom:"6px"}}>{k}</span>
              ))}</div>
            </div>
          </div>

          <div ref={resumeRef} style={{background:"white", color:"#1a1a1a", padding:"48px", borderRadius:"12px", fontFamily:"Arial, sans-serif", lineHeight:"1.6", maxWidth:"800px", margin:"0 auto 20px"}}>
            <div style={{textAlign:"center" as const, marginBottom:"20px", borderBottom:"2px solid #1a1a1a", paddingBottom:"16px"}}>
              <h1 style={{fontSize:"26px", fontWeight:"700", margin:"0 0 6px"}}>{result.full_resume?.name}</h1>
              <p style={{fontSize:"12px", color:"#555", margin:"0"}}>
                {[result.full_resume?.email, result.full_resume?.phone, result.full_resume?.location, result.full_resume?.linkedin].filter(Boolean).join(" · ")}
              </p>
            </div>
            {includeSections.summary && result.full_resume?.summary && (
              <div style={{marginBottom:"18px"}}>
                <h2 style={{fontSize:"13px", fontWeight:"700", textTransform:"uppercase" as const, letterSpacing:"2px", borderBottom:"1px solid #ccc", paddingBottom:"4px", marginBottom:"8px"}}>Professional Summary</h2>
                <p style={{fontSize:"13px", margin:"0"}}>{result.full_resume.summary}</p>
              </div>
            )}
            {includeSections.experience && result.full_resume?.experience && (
              <div style={{marginBottom:"18px"}}>
                <h2 style={{fontSize:"13px", fontWeight:"700", textTransform:"uppercase" as const, letterSpacing:"2px", borderBottom:"1px solid #ccc", paddingBottom:"4px", marginBottom:"10px"}}>Experience</h2>
                {result.full_resume.experience.map((exp:any, i:number) => (
                  <div key={i} style={{marginBottom:"14px"}}>
                    <div style={{display:"flex", justifyContent:"space-between", marginBottom:"2px"}}>
                      <strong style={{fontSize:"13px"}}>{exp.title} — {exp.company}</strong>
                      <span style={{fontSize:"12px", color:"#666"}}>{exp.duration}</span>
                    </div>
                    <ul style={{margin:"4px 0 0 16px", padding:"0"}}>
                      {exp.bullets?.map((b:string, j:number) => <li key={j} style={{fontSize:"12px", marginBottom:"3px"}}>{b}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            )}
            {includeSections.education && result.full_resume?.education && (
              <div style={{marginBottom:"18px"}}>
                <h2 style={{fontSize:"13px", fontWeight:"700", textTransform:"uppercase" as const, letterSpacing:"2px", borderBottom:"1px solid #ccc", paddingBottom:"4px", marginBottom:"8px"}}>Education</h2>
                {result.full_resume.education.map((edu:any, i:number) => (
                  <div key={i} style={{marginBottom:"6px"}}>
                    <strong style={{fontSize:"13px"}}>{edu.degree}</strong>
                    <span style={{fontSize:"12px", color:"#666"}}> — {edu.school}, {edu.year}</span>
                  </div>
                ))}
              </div>
            )}
            {includeSections.skills && result.full_resume?.skills && (
              <div style={{marginBottom:"18px"}}>
                <h2 style={{fontSize:"13px", fontWeight:"700", textTransform:"uppercase" as const, letterSpacing:"2px", borderBottom:"1px solid #ccc", paddingBottom:"4px", marginBottom:"8px"}}>Skills</h2>
                <p style={{fontSize:"12px", margin:"0"}}>{result.full_resume.skills.join(" · ")}</p>
              </div>
            )}
            {includeSections.certifications && result.full_resume?.certifications?.length > 0 && (
              <div style={{marginBottom:"18px"}}>
                <h2 style={{fontSize:"13px", fontWeight:"700", textTransform:"uppercase" as const, letterSpacing:"2px", borderBottom:"1px solid #ccc", paddingBottom:"4px", marginBottom:"8px"}}>Certifications</h2>
                {result.full_resume.certifications.map((c:any, i:number) => <div key={i} style={{fontSize:"12px", marginBottom:"4px"}}>• {typeof c === "string" ? c : `${c.name}${c.issuer ? " — " + c.issuer : ""}${c.year ? " (" + c.year + ")" : ""}`}</div>)}
              </div>
            )}
            {includeSections.projects && result.full_resume?.projects?.length > 0 && (
              <div style={{marginBottom:"18px"}}>
                <h2 style={{fontSize:"13px", fontWeight:"700", textTransform:"uppercase" as const, letterSpacing:"2px", borderBottom:"1px solid #ccc", paddingBottom:"4px", marginBottom:"8px"}}>Projects</h2>
                {result.full_resume.projects.map((p:any, i:number) => (
                  <div key={i} style={{marginBottom:"8px"}}>
                    <strong style={{fontSize:"13px"}}>{p.name}</strong>
                    <p style={{fontSize:"12px", margin:"2px 0 0", color:"#444"}}>{p.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={card}>
            <div style={{fontSize:"15px", fontWeight:"600", color:"hsl(213 31% 91%)", marginBottom:"12px"}}>Cover Letter</div>
            <p style={{fontSize:"14px", color:"hsl(215 20% 65%)", lineHeight:"1.8", margin:"0"}}>{result.cover_letter}</p>
          </div>
        </div>
      )}
    </div>
  )
}