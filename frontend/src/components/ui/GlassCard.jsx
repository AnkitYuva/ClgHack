export default function GlassCard({ children, className = "", style = {}, onClick }) {
  return (
    <div
      className={`glass ${className}`}
      style={{ padding: "1.5rem", ...style }}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
