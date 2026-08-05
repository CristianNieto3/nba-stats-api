import type { Metadata } from "next";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/states";
import { LeadersClient } from "./leaders-client";

export const metadata: Metadata = {
  title: "Leaders",
  description: "Ranked league leaders for each supported statistic.",
};

export default function LeadersPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={10} />}>
      <LeadersClient />
    </Suspense>
  );
}
