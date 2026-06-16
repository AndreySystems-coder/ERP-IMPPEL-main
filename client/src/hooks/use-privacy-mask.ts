import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "imppel_privacy_mask_enabled";

function readInitialState() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "true";
}

export function usePrivacyMask() {
  const [privacyMaskEnabled, setPrivacyMaskEnabled] = useState(readInitialState);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) setPrivacyMaskEnabled(event.newValue === "true");
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const togglePrivacyMask = useCallback(() => {
    setPrivacyMaskEnabled((current) => {
      const next = !current;
      window.localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  const maskText = useCallback((value: unknown, fallback = "••••••••") => {
    const text = String(value ?? "").trim();
    if (!privacyMaskEnabled) return text || "—";
    if (!text) return fallback;
    return fallback;
  }, [privacyMaskEnabled]);

  const maskMoney = useCallback((value: unknown) => {
    if (privacyMaskEnabled) return "R$ ••••";
    const amount = Number(value || 0);
    return amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }, [privacyMaskEnabled]);

  const maskNumber = useCallback((value: unknown, suffix = "") => {
    if (privacyMaskEnabled) return `••${suffix ? ` ${suffix}` : ""}`;
    return `${value ?? 0}${suffix ? ` ${suffix}` : ""}`;
  }, [privacyMaskEnabled]);

  return { privacyMaskEnabled, togglePrivacyMask, maskText, maskMoney, maskNumber };
}
