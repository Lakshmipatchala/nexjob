"use client"
import { useState, useEffect } from "react"

export default function ThemeToggle() {
  const [dark, setDark] = useState(true)

  useEffect(() => {
    const saved = localStorage.getItem("theme")
    if (saved === "light") {
      setDark(false)
      document.documentElement.setAttribute("data-theme", "light")
    }
  }, [])

  function toggle() {
    const newDark = !dark
    setDark(newDark)
    document.documentElement.setAttribute("data-theme", newDark ? "dark" : "light")
    localStorage.setItem("theme", newDark ? "dark" : "light")
  }

  return (
    <button onClick={toggle}
      style={{background:"hsl(224 71% 8%)", border:"1px solid hsl(216 34% 17%)", borderRadius:"8px", padding:"6px 10px", cursor:"pointer", fontSize:"16px", color:"hsl(213 31% 91%)"}}>
      {dark ? "☀️" : "🌙"}
    </button>
  )
}