export function ToothLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" aria-hidden="true">
      <path
        d="M9.2 4.6C6.3 4.6 4 7.1 4 10.6c0 3 .8 5 1.7 7.4.7 1.8 1 3.4 1.3 5.5.2 1.7.5 3.3 1 4.2.4.8 1.1 1.3 1.9 1.3 1.3 0 1.9-1 2.3-2.6.3-1.3.5-2.9.9-4.3.4-1.4 1.2-2.4 2.9-2.4s2.5 1 2.9 2.4c.4 1.4.6 3 .9 4.3.4 1.6 1 2.6 2.3 2.6.8 0 1.5-.5 1.9-1.3.5-.9.8-2.5 1-4.2.3-2.1.6-3.7 1.3-5.5.9-2.4 1.7-4.4 1.7-7.4 0-3.5-2.3-6-5.2-6-2.2 0-3.6.8-4.8 1.4-.8.4-1.4.7-2 .7s-1.2-.3-2-.7c-1.2-.6-2.6-1.4-4.8-1.4Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function BrandMark({
  subtitle = "Administración",
  compact = false,
}: {
  subtitle?: string;
  compact?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-primary-foreground"
        style={{ background: "var(--gradient-primary)" }}
      >
        <ToothLogo className="h-6 w-6" />
      </div>
      {!compact && (
        <div className="leading-tight">
          <p className="text-sm font-extrabold tracking-tight">Cloud Esther</p>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] opacity-70">
            {subtitle}
          </p>
        </div>
      )}
    </div>
  );
}
