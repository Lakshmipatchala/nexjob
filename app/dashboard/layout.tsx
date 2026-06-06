import Sidebar from "@/components/Sidebar"

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "hsl(224 71% 4%)" }}>
      <Sidebar />
      <main style={{ flex: 1, overflowX: "hidden", minWidth: 0 }}>
        {children}
      </main>
    </div>
  )
}