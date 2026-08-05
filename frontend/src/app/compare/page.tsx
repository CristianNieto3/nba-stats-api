import type { Metadata } from "next";
import { Suspense } from "react";
import { SkeletonBlock } from "@/components/states";
import { CompareClient } from "./compare-client";

export const metadata: Metadata = {
  title: "Compare",
  description: "Two players, side by side, one stat per row.",
};

export default function ComparePage() {
  return (
    <Suspense fallback={<SkeletonBlock className="h-64 w-full max-w-4xl" />}>
      <CompareClient />
    </Suspense>
  );
}
