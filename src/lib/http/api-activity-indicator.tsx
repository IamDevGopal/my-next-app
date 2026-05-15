"use client";

import { useEffect, useState } from "react";
import {
  getActiveApiRequestCount,
  subscribeToApiActivity,
} from "./api-client";

export function ApiActivityIndicator() {
  const [activeRequests, setActiveRequests] = useState(getActiveApiRequestCount);

  useEffect(() => {
    return subscribeToApiActivity(setActiveRequests);
  }, []);

  return (
    <div
      aria-hidden={activeRequests === 0}
      className={`pointer-events-none fixed inset-x-0 top-0 z-[100] h-1 transition-opacity duration-200 ${
        activeRequests > 0 ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="h-full w-full origin-left animate-pulse bg-gradient-to-r from-emerald-500 via-sky-500 to-emerald-500" />
    </div>
  );
}
