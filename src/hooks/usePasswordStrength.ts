import { useMemo } from "react";

export type PasswordRule = {
  label: string;
  met: boolean;
};

export function usePasswordStrength(password: string) {
  return useMemo(() => {
    const rules: PasswordRule[] = [
      { label: "At least 8 characters", met: password.length >= 8 },
      { label: "One uppercase letter", met: /[A-Z]/.test(password) },
      { label: "One lowercase letter", met: /[a-z]/.test(password) },
      { label: "One number", met: /\d/.test(password) },
      { label: "One special character", met: /[^A-Za-z0-9]/.test(password) },
    ];

    const score = rules.filter((rule) => rule.met).length;
    const label = score <= 2 ? "Weak" : score === 3 ? "Fair" : score === 4 ? "Strong" : "Very Strong";
    const color = score <= 2 ? "bg-risk" : score === 3 ? "bg-warning" : score === 4 ? "bg-yellow-400" : "bg-good";

    return { score, label, color, rules };
  }, [password]);
}
