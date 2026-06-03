import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { AutofillEngine } from "@/types"

interface UIState {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  autofillEngine: AutofillEngine
  setAutofillEngine: (engine: AutofillEngine) => void
  selectedSources: string[]
  toggleSource: (source: string) => void
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
    }),
    { name: "nexjob-ui", partialize: (s) => ({ autofillEngine: s.autofillEngine, selectedSources: s.selectedSources }) }
  )
)