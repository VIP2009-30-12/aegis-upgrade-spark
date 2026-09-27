import { Switch } from "@/components/ui/switch";
import { useId, type ReactNode } from "react";

export function Toggle({ label, hint, checked, onChange }: { label: string; hint?: ReactNode; checked: boolean; onChange: (v: boolean) => void }) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <label htmlFor={id} className="flex-1 cursor-pointer">
        <span className="font-semibold">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-muted-foreground">{hint}</span>}
      </label>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function Choice<T extends string | number | null>({ options, value, onChange, label }: {
  options: { v: T; label: string }[]; value: T; onChange: (v: T) => void; label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={String(o.v)} type="button" role="radio" aria-checked={value === o.v}
          onClick={() => onChange(o.v)}
          className={`btn min-h-11 ${value === o.v ? "btn-safe" : "btn-outline"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
