"use client";

import dynamic from "next/dynamic";
import React from "react";

const GenerateClient = dynamic(() => import("./GenerateClient"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="h-8 w-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export default function GeneratePage() {
  return <GenerateClient />;
}
