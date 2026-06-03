// ─────────────────────────────────────────────────────────
// NexJob Background Service Worker
// Proxies API calls to avoid CORS issues on ATS domains
// ─────────────────────────────────────────────────────────

const API_BASE = "https://nexjob-sigma.vercel.app"

// Fetch user profile from NexJob backend
async function fetchProfile() {
  const { auth_token } = await chrome.storage.local.get("auth_token")
  if (!auth_token) throw new Error("Not logged in — please login via the NexJob extension popup")

  const res = await fetch(`${API_BASE}/api/profile`, {
    headers: {
      "Authorization": `Bearer ${auth_token}`,
      "Content-Type": "application/json"
    }
  })
  if (!res.ok) throw new Error(`Profile fetch failed: ${res.status}`)
  return res.json()
}

// Get Claude AI answer for free-text fields
async function fetchClaudeAnswer(fieldLabel, jobContext) {
  const { auth_token } = await chrome.storage.local.get("auth_token")
  if (!auth_token) throw new Error("Not logged in")

  const res = await fetch(`${API_BASE}/api/autofill/claude`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${auth_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ fieldLabel, jobContext })
  })
  if (!res.ok) throw new Error(`Claude API failed: ${res.status}`)
  const data = await res.json()
  return data.answer
}

// Message router
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {

  if (message.type === "FETCH_PROFILE") {
    fetchProfile()
      .then(profile => sendResponse({ profile }))
      .catch(err => sendResponse({ error: err.message }))
    return true
  }

  if (message.type === "FETCH_CLAUDE_ANSWER") {
    fetchClaudeAnswer(message.fieldLabel, message.jobContext)
      .then(answer => sendResponse({ answer }))
      .catch(err => sendResponse({ error: err.message }))
    return true
  }

  if (message.type === "INJECT_CLAUDE_SCRIPT") {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["claude_fill.js"]
      })
    })
    sendResponse({ ok: true })
  }

  if (message.type === "AUTOFILL_STATUS") {
    chrome.runtime.sendMessage(message).catch(() => {})
    sendResponse({ ok: true })
  }
})