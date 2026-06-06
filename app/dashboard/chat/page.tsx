"use client"
import { useEffect, useState, useRef } from "react"
import { createClient } from "@/lib/supabase"

interface Message {
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

const SUGGESTED_QUESTIONS = [
  "How do I improve my resume for data engineering roles?",
  "What skills are most in demand for AI/ML jobs?",
  "How should I prepare for a system design interview?",
  "What salary should I ask for as a senior software engineer?",
  "How do I negotiate a job offer?",
  "Write me a cold outreach message for a hiring manager",
  "What are the best certifications for cloud engineering?",
  "How do I explain a gap in my employment history?",
]

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [userId, setUserId] = useState("")
  const [userName, setUserName] = useState("")
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { initUser() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }) }, [messages])

  async function initUser() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUserId(user.id)
      const { data: profile } = await supabase.from("profiles").select("first_name").eq("id", user.id).single()
      if (profile?.first_name) setUserName(profile.first_name)
    }
    // Add welcome message
    setMessages([{
      role: "assistant",
      content: `Hi${userName ? " " + userName : ""}! 👋 I'm your AI career coach powered by Claude. I can help you with:\n\n• **Resume & Cover Letter** advice\n• **Interview preparation** and practice\n• **Salary negotiation** tactics\n• **Job search strategy**\n• **Career growth** guidance\n• **Skills gap** analysis\n\nWhat would you like to work on today?`,
      timestamp: new Date()
    }])
  }

  async function sendMessage(content?: string) {
    const text = content || input.trim()
    if (!text || loading) return
    setInput("")

    const userMsg: Message = { role: "user", content: text, timestamp: new Date() }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setLoading(true)

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          messages: newMessages.map(m => ({ role: m.role, content: m.content }))
        })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setMessages(prev => [...prev, {
        role: "assistant",
        content: data.message,
        timestamp: new Date()
      }])
    } catch (e: any) {
      setMessages(prev => [...prev, {
        role: "assistant",
        content: `Sorry, I encountered an error: ${e.message}. Please try again.`,
        timestamp: new Date()
      }])
    }
    setLoading(false)
  }

  function formatMessage(text: string) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br/>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>')
      .replace(/• /g, '• ')
  }

  function clearChat() {
    setMessages([{
      role: "assistant",
      content: "Chat cleared! How can I help you with your job search today?",
      timestamp: new Date()
    }])
  }

  return (
    <div style={{ height: "calc(100vh - 60px)", background: "hsl(224 71% 4%)", display: "flex", flexDirection: "column" as const }}>
      {/* Header */}
      <div style={{ padding: "20px 32px", borderBottom: "1px solid hsl(216 34% 17%)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "hsl(224 71% 6%)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #a855f7)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>
            🤖
          </div>
          <div>
            <div style={{ fontSize: "16px", fontWeight: "700", color: "hsl(213 31% 91%)" }}>Claude Career Coach</div>
            <div style={{ fontSize: "12px", color: "#4ade80", display: "flex", alignItems: "center", gap: "4px" }}>
              <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4ade80" }} />
              Always online · Powered by Claude AI
            </div>
          </div>
        </div>
        <button onClick={clearChat}
          style={{ background: "hsl(224 71% 8%)", color: "hsl(215 20% 65%)", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", border: "1px solid hsl(216 34% 17%)", cursor: "pointer" }}>
          Clear Chat
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto" as const, padding: "24px 32px", display: "flex", flexDirection: "column" as const, gap: "16px" }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start", flexDirection: msg.role === "user" ? "row-reverse" as const : "row" as const }}>
            {/* Avatar */}
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: msg.role === "user" ? "linear-gradient(135deg, #7c3aed, #a855f7)" : "hsl(224 71% 10%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", flexShrink: 0, border: "1px solid hsl(216 34% 17%)" }}>
              {msg.role === "user" ? (userName?.[0]?.toUpperCase() || "U") : "🤖"}
            </div>
            {/* Bubble */}
            <div style={{ maxWidth: "70%", background: msg.role === "user" ? "linear-gradient(135deg, #7c3aed, #a855f7)" : "hsl(224 71% 8%)", borderRadius: msg.role === "user" ? "16px 4px 16px 16px" : "4px 16px 16px 16px", padding: "12px 16px", border: msg.role === "assistant" ? "1px solid hsl(216 34% 17%)" : "none" }}>
              <div style={{ fontSize: "14px", color: "hsl(213 31% 91%)", lineHeight: "1.6" }}
                dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }} />
              <div style={{ fontSize: "11px", color: msg.role === "user" ? "rgba(255,255,255,0.6)" : "hsl(215 20% 45%)", marginTop: "4px", textAlign: msg.role === "user" ? "right" as const : "left" as const }}>
                {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "hsl(224 71% 10%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px", border: "1px solid hsl(216 34% 17%)" }}>🤖</div>
            <div style={{ background: "hsl(224 71% 8%)", borderRadius: "4px 16px 16px 16px", padding: "12px 16px", border: "1px solid hsl(216 34% 17%)" }}>
              <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#a78bfa", animation: "pulse 1.4s ease-in-out infinite", animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggested questions - show only at start */}
      {messages.length <= 1 && (
        <div style={{ padding: "0 32px 16px", display: "flex", gap: "8px", flexWrap: "wrap" as const }}>
          {SUGGESTED_QUESTIONS.slice(0, 4).map((q, i) => (
            <button key={i} onClick={() => sendMessage(q)}
              style={{ background: "hsl(224 71% 8%)", border: "1px solid hsl(216 34% 17%)", borderRadius: "20px", padding: "6px 14px", fontSize: "12px", color: "hsl(215 20% 65%)", cursor: "pointer", textAlign: "left" as const }}>
              {q}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div style={{ padding: "16px 32px 24px", borderTop: "1px solid hsl(216 34% 17%)", background: "hsl(224 71% 6%)" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-end", background: "hsl(224 71% 8%)", borderRadius: "14px", border: "1px solid hsl(216 34% 17%)", padding: "8px 8px 8px 16px" }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            placeholder="Ask me anything about your job search... (Enter to send, Shift+Enter for new line)"
            rows={1}
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "hsl(213 31% 91%)", fontSize: "14px", resize: "none" as const, lineHeight: "1.5", minHeight: "24px", maxHeight: "120px", fontFamily: "inherit" }}
          />
          <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
            style={{ background: input.trim() && !loading ? "linear-gradient(135deg, #7c3aed, #a855f7)" : "hsl(224 71% 10%)", color: input.trim() && !loading ? "white" : "hsl(215 20% 45%)", border: "none", borderRadius: "10px", width: "40px", height: "40px", cursor: input.trim() && !loading ? "pointer" : "not-allowed", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0, transition: "all 0.15s" }}>
            {loading ? "⏳" : "➤"}
          </button>
        </div>
        <div style={{ fontSize: "11px", color: "hsl(215 20% 40%)", marginTop: "8px", textAlign: "center" as const }}>
          Claude AI · Your personal career coach · All conversations are private
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}