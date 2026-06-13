export default function AppShell({ children }) {
  return (
    <div className="relative z-10 max-w-4xl mx-auto px-[var(--page-x)] pb-20">
      {children}
    </div>
  );
}
