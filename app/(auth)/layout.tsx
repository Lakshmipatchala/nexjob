export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"hsl(224 71% 4%)",padding:"24px"}}>
      {children}
    </div>
  )
}