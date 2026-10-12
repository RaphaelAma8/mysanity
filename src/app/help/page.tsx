import type { Metadata } from "next";
import Link from "next/link";
import { ResourceList } from "@/components/Resources";

export const metadata: Metadata = { title: "Get help now" };

/** A plain page: works without JavaScript, and can be bookmarked. */
export default function HelpPage() {
  return (
    <div>
      <h1 className="font-display text-3xl font-semibold">You are not alone</h1>
      <p className="mb-5 mt-2 text-muted">Support is a call or a text away. You don&apos;t have to be sure you&apos;re in crisis to reach out.</p>
      <ResourceList headingLevel="h2" />
      <p className="mt-6"><Link className="btn ghost" href="/">Back to mysanity</Link></p>
    </div>
  );
}
