let currentEngine = "backend"
let currentProfile = null

// ── ON LOAD ───────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  await loadProfile()
  detectCurrentPage()
  loadSavedEngine()
})

// ── LOAD ENGINE PREFERENCE ────────────────────────────────
async function loadSavedEngine() {
  const { preferred_engine } = await chrome.storage.local.get("preferred_engine")
  if (preferred_engine) selectEngine(preferred_engine)
}

// ── DETECT ATS ON CURRENT TAB ─────────────────────────────
async function detectCurrentPage() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab?.url) return

  const host = new URL(tab.url).hostname
  let ats = "Unknown page"

  if (host.includes("greenhouse.io")) ats = "Greenhouse ✓"
  else if (host.includes("lever.co")) ats = "Lever ✓"
  else if (host.includes("workday") || host.includes("myworkdayjobs")) ats = "Workday ✓"
  else if (host.includes("icims")) ats = "iCIMS ✓"
  else if (host.includes("ashbyhq")) ats = "Ashby ✓"
  else if (host.includes("linkedin.com")) ats = "LinkedIn ✓"
  else if (host.includes("indeed.com")) ats = "Indeed ✓"
  else ats = "Unsupported page"

  document.getElementById("ats-detected").textContent = ats
}

// ── LOAD USER PROFILE ─────────────────────────────────────
async function loadProfile() {
  const { auth_token } = await chrome.storage.local.get("auth_token")

  if (!auth_token) {
    document.getElementById("main-content").style.display = "none"
    document.getElementById("login-content").style.display = "block"
    return
  }

  // Show main content
  document.getElementById("main-content").style.display = "block"
  document.getElementById("login-content").style.display = "none"
  document.getElementById("status-dot").className = "status-dot connected"

  // Try to load profile from storage cache
  const { cached_profile } = await chrome.storage.local.get("cached_profile")
  if (cached_profile) {
    showProfile(cached_profile)
    currentProfile = cached_profile
  }
}

// ── SHOW PROFILE IN POPUP ─────────────────────────────────
function showProfile(profile) {
  const section = document.getElementById("profile-section")
  const rows = document.getElementById("profile-rows")
  section.style.display = "block"

  const fields = [
    ["Name", `${profile.first_name || ""} ${profile.last_name || ""}`.trim()],
    ["Email", profile.email],
    ["Phone", profile.phone],
    ["LinkedIn", profile.linkedin_url],
  ]

  rows.innerHTML = fields
    .filter(([, val]) => val)
    .map(([key, val]) => `
      <div class="profile-row">
        <span class="profile-key">${key}</span>
        <span class="profile-val">${val}</span>
      </div>
    `).join("")
}

// ── SELECT ENGINE ─────────────────────────────────────────
function selectEngine(engine) {
  currentEngine = engine
  chrome.storage.local.set({ preferred_engine: engine })

  document.getElementById("btn-backend").classList.toggle("active", engine === "backend")
  document.getElementById("btn-claude").classList.toggle("active", engine === "claude")

  const btn = document.getElementById("fill-btn")
  if (engine === "backend") {
    btn.className = "fill-btn backend"
    btn.textContent = "⚡ Autofill This Page"
  } else {
    btn.className = "fill-btn claude"
    btn.textContent = "🤖 AI Autofill This Page"
  }
}

// ── RUN AUTOFILL ──────────────────────────────────────────
async function runFill() {
  const btn = document.getElementById("fill-btn")
  btn.disabled = true
  showStatus("loading", "Filling form fields...")

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  const messageType = currentEngine === "claude" ? "RUN_AUTOFILL_CLAUDE" : "RUN_AUTOFILL_BACKEND"

  chrome.tabs.sendMessage(tab.id, { type: messageType }, response => {
    if (chrome.runtime.lastError) {
      showStatus("error", "Cannot access this page. Make sure you are on a job application form.")
    }
    btn.disabled = false
  })
}

// ── SHOW STATUS MESSAGE ───────────────────────────────────
function showStatus(type, message) {
  const el = document.getElementById("status-msg")
  el.className = `status-msg show ${type}`
  el.textContent = message
}

// ── LISTEN FOR STATUS UPDATES FROM CONTENT SCRIPT ─────────
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "AUTOFILL_STATUS") {
    const { status, message: msg } = message.payload
    showStatus(status, msg)
  }
})