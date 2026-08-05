import type { Metadata } from "next";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/states";
import { PlayersClient } from "./players-client";

export const metadata: Metadata = {
  title: "Players",
  description: "Filter, sort, and page through the full player roster.",
};

export default function PlayersPage() {
  return (
    <Suspense fallback={<TableSkeleton rows={10} />}>
      <PlayersClient />
    </Suspense>
  );
}
