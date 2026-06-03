import Navbar from "@/components/Navbar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div style={{minHeight:"100vh", background:"hsl(224 71% 4%)"}}>
      <Navbar />
      {children}
    </div>
  )
}