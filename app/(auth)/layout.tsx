export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      minHeight: "100vh",
      background: "hsl(228 30% 6%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "32px 16px",
      fontFamily: "inherit"
    }}>
      <div style={{ width: "100%", maxWidth: "440px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center" as const, marginBottom: "32px" }}>
          <span style={{ fontSize: "32px", fontWeight: "800", color: "white", letterSpacing: "-1px" }}>
            Nex<span style={{ color: "#9b8ff4" }}>Job</span>
          </span>
          <div style={{ fontSize: "13px", color: "hsl(220 15% 45%)", marginTop: "6px" }}>
            AI-Powered Job Search Platform
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}