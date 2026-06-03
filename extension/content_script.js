// ─────────────────────────────────────────────────────────
// NexJob Content Script
// Runs inside job application pages and fills forms
// ─────────────────────────────────────────────────────────

"use strict"

// ── ATS SELECTOR MAP ──────────────────────────────────────
const ATS_SELECTORS = {
  greenhouse: {
    first_name:   ["#first_name", "input[name='first_name']"],
    last_name:    ["#last_name", "input[name='last_name']"],
    email:        ["#email", "input[name='email']", "input[type='email']"],
    phone:        ["#phone", "input[name='phone']", "input[type='tel']"],
    linkedin:     ["#job_application_answers_linkedin_profile", "input[placeholder*='linkedin' i]"],
    cover_letter: ["#cover_letter", "textarea[name='cover_letter']"],
    location:     ["input[placeholder*='location' i]", "input[placeholder*='city' i]"],
  },
  lever: {
    first_name:   ["input[name='name']"],
    last_name:    ["input[name='name']"],
    email:        ["input[name='email']", "input[type='email']"],
    phone:        ["input[name='phone']", "input[type='tel']"],
    linkedin:     ["input[name='urls[LinkedIn]']", "input[placeholder*='linkedin' i]"],
    cover_letter: ["textarea[name='comments']", "textarea[placeholder*='cover' i]"],
  },
  workday: {
    first_name:   ["input[data-automation-id='legalNameSection_firstName']"],
    last_name:    ["input[data-automation-id='legalNameSection_lastName']"],
    email:        ["input[data-automation-id='email']", "input[type='email']"],
    phone:        ["input[data-automation-id='phone-number']", "input[type='tel']"],
    linkedin:     ["input[data-automation-id='linkedIn']"],
    city:         ["input[data-automation-id='city']"],
  },
  icims: {
    first_name:   ["input[id*='firstname' i]", "input[name*='firstname' i]"],
    last_name:    ["input[id*='lastname' i]", "input[name*='lastname' i]"],
    email:        ["input[id*='email' i]", "input[type='email']"],
    phone:        ["input[id*='phone' i]", "input[type='tel']"],
    linkedin:     ["input[id*='linkedin' i]"],
  },
  ashby: {
    first_name:   ["input[name='name']"],
    last_name:    ["input[name='name']"],
    email:        ["input[name='email']", "input[type='email']"],
    phone:        ["input[name='phone']", "input[type='tel']"],
    linkedin:     ["input[name='linkedin']"],
  },
  linkedin: {
    first_name:   ["input[id*='firstName' i]", "input[aria-label*='First name' i]"],
    last_name:    ["input[id*='lastName' i]", "input[aria-label*='Last name' i]"],
    email:        ["input[id*='email' i]", "input[type='email']"],
    phone:        ["input[id*='phone' i]", "input[type='tel']"],
  },
  indeed: {
    first_name:   ["input[id*='firstName' i]", "input[name*='firstName' i]"],
    last_name:    ["input[id*='lastName' i]", "input[name*='lastName' i]"],
    email:        ["input[type='email']", "input[id*='email' i]"],
    phone:        ["input[type='tel']", "input[id*='phone' i]"],
  }
}

// ── DETECT WHICH ATS IS RUNNING ───────────────────────────
function detectATS() {
  const host = window.location.hostname
  const html = document.documentElement.innerHTML

  if (host.includes("greenhouse.io") || html.includes("greenhouse-job-board")) return "greenhouse"
  if (host.includes("lever.co")) return "lever"
  if (host.includes("myworkdayjobs.com") || host.includes("workday.com")) return "workday"
  if (host.includes("icims.com")) return "icims"
  if (host.includes("ashbyhq.com")) return "ashby"
  if (host.includes("linkedin.com")) return "linkedin"
  if (host.includes("indeed.com")) return "indeed"
  return null
}

// ── SET VALUE (works with React/Vue/Angular) ──────────────
function setNativeValue(el, value) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set
  const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set

  if (el.tagName === "TEXTAREA" && nativeTextAreaValueSetter) {
    nativeTextAreaValueSetter.call(el, value)
  } else if (nativeInputValueSetter) {
    nativeInputValueSetter.call(el, value)
  } else {
    el.value = value
  }

  ["input", "change", "blur", "keyup"].forEach(evt => {
    el.dispatchEvent(new Event(evt, { bubbles: true }))
  })
}

// ── FIND FIRST MATCHING ELEMENT ───────────────────────────
function findField(selectors) {
  for (const sel of selectors) {
    try {
      const el = document.querySelector(sel)
      if (el) return el
    } catch (_) {}
  }
  return null
}

// ── VISUAL HIGHLIGHT ──────────────────────────────────────
function highlightField(el, engine) {
  const colors = {
    backend: { border: "#22c55e", bg: "rgba(34,197,94,0.06)" },
    claude:  { border: "#a855f7", bg: "rgba(168,85,247,0.06)" }
  }
  const { border, bg } = colors[engine] || colors.backend
  el.style.transition = "border-color 0.2s, background-color 0.2s"
  el.style.borderColor = border
  el.style.backgroundColor = bg
  setTimeout(() => {
    el.style.borderColor = ""
    el.style.backgroundColor = ""
  }, 3000)
}

// ── DELAY HELPER ──────────────────────────────────────────
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// ── MERGE FULL NAME (Lever/Ashby use one name field) ──────
function mergeFullName(profile, ats) {
  if (ats === "lever" || ats === "ashby") {
    return { ...profile, first_name: `${profile.first_name} ${profile.last_name}` }
  }
  return profile
}

// ── FILL FORM WITH BACKEND PROFILE ───────────────────────
async function fillFormBackend(profile, ats) {
  const selectorMap = ATS_SELECTORS[ats]
  if (!selectorMap) return { filled: 0, skipped: 0 }

  const mergedProfile = mergeFullName(profile, ats)
  const results = { filled: 0, skipped: 0 }

  for (const [fieldName, selectors] of Object.entries(selectorMap)) {
    const value = mergedProfile[fieldName]
    if (!value) { results.skipped++; continue }

    const el = findField(selectors)
    if (!el) { results.skipped++; continue }

    await delay(80)
    setNativeValue(el, value)
    highlightField(el, "backend")
    results.filled++
  }

  return results
}

// ── FILL FREE-TEXT WITH CLAUDE ────────────────────────────
async function fillFreeTextWithClaude(jobContext) {
  const textareas = document.querySelectorAll("textarea")
  let filled = 0

  for (const textarea of textareas) {
    if (textarea.value) continue // skip already filled

    const label = textarea.closest("label")?.textContent ||
                  document.querySelector(`label[for="${textarea.id}"]`)?.textContent ||
                  textarea.placeholder ||
                  "cover letter"

    // Ask Claude for an answer
    const response = await new Promise(resolve => {
      chrome.runtime.sendMessage(
        { type: "FETCH_CLAUDE_ANSWER", fieldLabel: label, jobContext },
        resolve
      )
    })

    if (response?.answer) {
      await delay(200)
      setNativeValue(textarea, response.answer)
      highlightField(textarea, "claude")
      filled++
    }
  }

  return filled
}

// ── FETCH PROFILE FROM BACKGROUND ─────────────────────────
function fetchProfile() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "FETCH_PROFILE" }, response => {
      if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message))
      else if (response?.error) reject(new Error(response.error))
      else resolve(response.profile)
    })
  })
}

// ── MAIN AUTOFILL ORCHESTRATOR ────────────────────────────
async function runAutofill(engine) {
  const ats = detectATS()

  if (!ats) {
    notifyPopup({ status: "unsupported", message: "Page not recognised as a supported ATS" })
    return
  }

  notifyPopup({ status: "loading", message: `Detected: ${ats}. Fetching profile...` })

  let profile
  try {
    profile = await fetchProfile()
  } catch (err) {
    notifyPopup({ status: "error", message: err.message })
    return
  }

  const backendResults = await fillFormBackend(profile, ats)

  let claudeFilled = 0
  if (engine === "claude") {
    notifyPopup({ status: "loading", message: "Claude is writing answers for open questions..." })
    const jobTitle = document.title || "this role"
    claudeFilled = await fillFreeTextWithClaude(jobTitle)
  }

  notifyPopup({
    status: "done",
    ats,
    filled: backendResults.filled + claudeFilled,
    skipped: backendResults.skipped,
    engine,
    message: `Filled ${backendResults.filled + claudeFilled} fields on ${ats}`
  })
}

// ── SEND STATUS TO POPUP ──────────────────────────────────
function notifyPopup(payload) {
  chrome.runtime.sendMessage({ type: "AUTOFILL_STATUS", payload })
}

// ── LISTEN FOR MESSAGES FROM POPUP ────────────────────────
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "RUN_AUTOFILL_BACKEND") {
    runAutofill("backend").then(() => sendResponse({ ok: true }))
    return true
  }
  if (message.type === "RUN_AUTOFILL_CLAUDE") {
    runAutofill("claude").then(() => sendResponse({ ok: true }))
    return true
  }
})