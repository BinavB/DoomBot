export function Icon({ name, className = "", size }: { name: string; className?: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-sharp shrink-0 select-none ${className}`}
      style={size ? { fontSize: size } : undefined}
    >
      {name}
    </span>
  );
}
