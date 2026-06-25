interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  ariaLabel?: string;
}

export function LoadingSpinner({ size = "md", className = "", ariaLabel = "Loading" }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
  };

  return (
    <div className="flex items-center justify-center" role="status" aria-live="polite" aria-label={ariaLabel}>
      <svg className={`${sizeClasses[size]} ${className}`} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle
          className="text-neutral-200"
          cx="12"
          cy="12"
          r="10"
          strokeWidth="3"
        />
        <circle
          className="text-primary-600"
          cx="12"
          cy="12"
          r="10"
          strokeWidth="3"
          strokeDasharray="31.4 31.4"
          strokeDashoffset="0"
          strokeLinecap="round"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 12 12"
            to="360 12 12"
            dur="1s"
            repeatCount="indefinite"
          />
        </circle>
      </svg>
      <span className="sr-only">{ariaLabel}</span>
    </div>
  );
}

export function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <LoadingSpinner size="lg" ariaLabel="Loading page" />
    </div>
  );
}

export function InlineLoader() {
  return <LoadingSpinner size="sm" ariaLabel="Loading" />;
}