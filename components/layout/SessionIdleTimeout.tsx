"use client";

import { signOut } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";

const IDLE_MS = 30 * 60 * 1000;
const WARN_LEAD_MS = 5 * 60 * 1000;
const WARN_AT_MS = IDLE_MS - WARN_LEAD_MS;

/**
 * Logs the user out after 30 minutes with no mouse/keyboard/touch/scroll activity.
 * Shows a banner ~5 minutes before logout.
 */
export default function SessionIdleTimeout() {
  const [showWarn, setShowWarn] = useState(false);
  const lastReset = useRef(0);
  const warnRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const arm = useCallback(() => {
    if (warnRef.current) clearTimeout(warnRef.current);
    if (idleRef.current) clearTimeout(idleRef.current);
    setShowWarn(false);
    warnRef.current = setTimeout(() => setShowWarn(true), WARN_AT_MS);
    idleRef.current = setTimeout(() => {
      void signOut({ callbackUrl: "/auth/login?reason=session_expired" });
    }, IDLE_MS);
  }, []);

  useEffect(() => {
    const bump = () => {
      const now = Date.now();
      if (now - lastReset.current < 2000) return;
      lastReset.current = now;
      arm();
    };

    const events = ["mousedown", "keydown", "scroll", "touchstart", "click"];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    lastReset.current = Date.now();
    arm();

    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      if (warnRef.current) clearTimeout(warnRef.current);
      if (idleRef.current) clearTimeout(idleRef.current);
    };
  }, [arm]);

  if (!showWarn) return null;

  return (
    <div
      role="status"
      className="fixed top-0 left-0 right-0 z-[100] bg-amber-600 text-white px-4 py-2.5 text-center text-sm shadow-md"
    >
      Your session will end in about 5 minutes due to inactivity. Click or press a key to stay
      signed in.
    </div>
  );
}
