import { CheckCircle2, XCircle } from "lucide-react";
import { usePasswordStrength } from "../hooks/usePasswordStrength";

export function PasswordStrengthMeter({ password }: { password: string }) {
  const strength = usePasswordStrength(password);
  const width = `${Math.max(1, strength.score) * 20}%`;

  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between text-xs font-extrabold">
        <span className="text-quiet">Password strength</span>
        <span className={strength.score >= 4 ? "text-good" : strength.score === 3 ? "text-warning" : "text-risk"}>{strength.label}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-panel-muted">
        <div className={`h-full rounded-full transition-all ${strength.color}`} style={{ width }} />
      </div>
      <div className="grid gap-1.5">
        {strength.rules.map((rule) => (
          <div className={`flex items-center gap-2 text-xs font-bold ${rule.met ? "text-good" : "text-quiet"}`} key={rule.label}>
            {rule.met ? <CheckCircle2 aria-hidden="true" size={15} /> : <XCircle aria-hidden="true" size={15} />}
            <span>{rule.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
