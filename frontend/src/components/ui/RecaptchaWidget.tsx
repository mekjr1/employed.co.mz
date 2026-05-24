"use client";

import { useEffect } from "react";
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from "react-google-recaptcha-v3";

function TokenRunner({ action, refreshKey, onVerify }: { action: string; refreshKey: number; onVerify: (token: string) => void }) {
  const { executeRecaptcha } = useGoogleReCaptcha();

  useEffect(() => {
    let active = true;

    async function run() {
      if (!executeRecaptcha || refreshKey === 0) return;
      try {
        const token = await executeRecaptcha(action);
        if (active) onVerify(token);
      } catch {
        if (active) onVerify("");
      }
    }

    void run();

    return () => {
      active = false;
    };
  }, [action, executeRecaptcha, onVerify, refreshKey]);

  return null;
}

export function RecaptchaWidget({ action, refreshKey, onVerify }: { action: string; refreshKey: number; onVerify: (token: string) => void }) {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;

  if (!siteKey) {
    return null;
  }

  return (
    <GoogleReCaptchaProvider reCaptchaKey={siteKey} scriptProps={{ async: true, appendTo: "head" }}>
      <TokenRunner action={action} refreshKey={refreshKey} onVerify={onVerify} />
    </GoogleReCaptchaProvider>
  );
}
