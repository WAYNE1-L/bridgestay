/**
 * Legacy route /admin/generator — redirects to the unified AI Listing Import page.
 * Keep this file so any bookmarked or hard-coded links still resolve.
 */
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function AIGenerator() {
  const [, navigate] = useLocation();
  useEffect(() => {
    const devAuth = new URLSearchParams(window.location.search).get("devAuth");
    const devAuthQuery =
      devAuth === "guest" || devAuth === "demoAdmin" ? `?devAuth=${devAuth}` : "";
    navigate(`/admin/import${devAuthQuery}`, { replace: true });
  }, [navigate]);
  return null;
}
