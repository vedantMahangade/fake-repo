export default function Input({ className = "", ...props }) {
  return (
    <input
      className={`w-full bg-bg border border-border rounded-md px-3 py-2.5 text-sm text-text placeholder:text-muted/60 focus:outline-none focus:border-accent/50 transition-colors ${className}`}
      {...props}
    />
  );
}
