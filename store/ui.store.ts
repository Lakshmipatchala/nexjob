import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { AutofillEngine } from "@/types"

interface PrefilledJob {
  jobTitle: string
  company: string
  jobDescription: string
}

interface UIState {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  autofillEngine: AutofillEngine
  setAutofillEngine: (engine: AutofillEngine) => void
  selectedSources: string[]
  toggleSource: (source: string) => void
  prefilledJob: PrefilledJob | null
  setPrefilledJob: (job: PrefilledJob | null) => void
  clearPrefilledJob: () => void
}

const ALL_SOURCES = ["linkedin", "indeed", "glassdoor", "wellfound", "google_jobs"]

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      autofillEngine: "backend",
      setAutofillEngine: (engine) => set({ autofillEngine: engine }),
      selectedSources: ALL_SOURCES,
      toggleSource: (source) =>
        set((s) => ({
          selectedSources: s.selectedSources.includes(source)
            ? s.selectedSources.filter((x) => x !== source)
            : [...s.selectedSources, source],
        })),
      prefilledJob: null,
      setPrefilledJob: (job) => set({ prefilledJob: job }),
      clearPrefilledJob: () => set({ prefilledJob: null }),
    }),
    {
      name: "nexjob-ui",
      partialize: (s) => ({
        autofillEngine: s.autofillEngine,
        selectedSources: s.selectedSources,
        prefilledJob: s.prefilledJob,
      }),
    }
  )
)