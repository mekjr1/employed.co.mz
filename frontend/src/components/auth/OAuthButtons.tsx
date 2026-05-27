"use client";

const PROVIDERS = [
  { key: "google", label: "Continue with Google", color: "#4285F4" },
] as const;

interface OAuthButtonsProps {
  onProviderClick: (provider: string) => void;
  disabled?: boolean;
}

export function OAuthButtons({ onProviderClick, disabled = false }: OAuthButtonsProps) {
  return (
    <div className="space-y-3">
      {PROVIDERS.map((provider) => (
        <button
          key={provider.key}
          type="button"
          disabled={disabled}
          onClick={() => onProviderClick(provider.key)}
          className="flex w-full items-center justify-center rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          style={{ backgroundColor: provider.color }}
        >
          {provider.label}
        </button>
      ))}
    </div>
  );
}
