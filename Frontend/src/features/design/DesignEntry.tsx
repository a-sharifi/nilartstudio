"use client";

import dynamic from "next/dynamic";

// Original Figma export uses browser APIs during initialization. Keep it behind
// an explicit client-only boundary until each imported route is SSR-adapted.
const DesignRuntime = dynamic(() => import("./DesignRuntime"), { ssr: false });

export default function DesignEntry() {
  return <DesignRuntime />;
}
