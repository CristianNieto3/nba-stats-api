import type { Metadata } from "next";
import { Suspense } from "react";
import { TableSkeleton } from "@/components/states";
import { ManageClient } from "./manage-client";

export const metadata: Metadata = {
  title: "Data management",
  description: "Unprotected local/demo write access to the player table.",
};

export default function ManagePage() {
  return (
    <Suspense fallback={<TableSkeleton rows={8} />}>
      <ManageClient />
    </Suspense>
  );
}
