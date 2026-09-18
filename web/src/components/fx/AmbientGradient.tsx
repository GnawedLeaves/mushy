// Pure-CSS animated gradient wash -- same pastel palette as the auth pages'
// ShaderGradient (see GradientBackground.tsx), but without a second WebGL
// canvas. That heavier dependency is deliberately kept to a single instance
// (the auth pages' first-impression moment); every other page reuses this
// cheap version to stay visually consistent without repeating the cost.
export function AmbientGradient({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-0 -z-10 overflow-hidden ${className}`}
    >
      <div className="ambient-gradient-blob absolute -left-1/4 -top-1/4 h-[70vh] w-[70vh] rounded-full bg-[#f5d0e8] opacity-40 blur-3xl" />
      <div className="ambient-gradient-blob-2 absolute -right-1/4 top-1/3 h-[60vh] w-[60vh] rounded-full bg-[#a9d8f7] opacity-40 blur-3xl" />
      <div className="ambient-gradient-blob-3 absolute bottom-[-20%] left-1/3 h-[55vh] w-[55vh] rounded-full bg-[#c7bff0] opacity-35 blur-3xl" />
      <style>{`
        @keyframes ambient-drift-1 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(6%,4%) scale(1.08); } }
        @keyframes ambient-drift-2 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-5%,6%) scale(1.05); } }
        @keyframes ambient-drift-3 { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(4%,-5%) scale(1.1); } }
        .ambient-gradient-blob { animation: ambient-drift-1 22s ease-in-out infinite; }
        .ambient-gradient-blob-2 { animation: ambient-drift-2 26s ease-in-out infinite; }
        .ambient-gradient-blob-3 { animation: ambient-drift-3 19s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .ambient-gradient-blob, .ambient-gradient-blob-2, .ambient-gradient-blob-3 { animation: none; }
        }
      `}</style>
    </div>
  );
}
