/**
 * Legacy route /admin/generator — redirects to the unified AI Listing Import page.
 * Keep this file so any bookmarked or hard-coded links still resolve.
 */
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function AIGenerator() {
  const [, navigate] = useLocation();
  useEffect(() => {
    navigate("/import-listing", { replace: true });
  }, [navigate]);
  return null;
}
