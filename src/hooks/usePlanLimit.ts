import { useCallback, useEffect, useState } from "react";
import { getPlanLimitErrorPayload } from "../api/client";
import type { PlanLimitErrorPayload } from "../types/api";

export function usePlanLimit() {
  const [planLimitError, setPlanLimitError] = useState<PlanLimitErrorPayload | null>(null);

  useEffect(() => {
    const handlePlanLimit = (event: Event) => {
      const customEvent = event as CustomEvent<PlanLimitErrorPayload>;
      setPlanLimitError(customEvent.detail);
    };

    window.addEventListener("autoaudit:plan-limit", handlePlanLimit);
    return () => window.removeEventListener("autoaudit:plan-limit", handlePlanLimit);
  }, []);

  const handleApiError = useCallback((error: unknown) => {
    const payload = getPlanLimitErrorPayload(error);
    if (payload) {
      setPlanLimitError(payload);
      return true;
    }

    return false;
  }, []);

  const withPlanLimit = useCallback(async <T,>(operation: () => Promise<T>) => {
    try {
      return await operation();
    } catch (error) {
      handleApiError(error);
      throw error;
    }
  }, [handleApiError]);

  return {
    planLimitError,
    closePlanLimitModal: () => setPlanLimitError(null),
    handleApiError,
    withPlanLimit,
  };
}
