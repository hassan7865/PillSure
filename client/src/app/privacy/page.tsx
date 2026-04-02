"use client";

import { PublicPageShell } from "@/layout/PublicLayout";

export default function PrivacyPage() {
  return (
    <PublicPageShell>
      <div className="container mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <h1 className="text-3xl font-bold text-primary mb-6">Privacy Policy</h1>
        <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground space-y-4 text-sm sm:text-base">
          <p>
            PillSure respects your privacy. This page describes how we handle personal information when you use our
            website and services (including medicine ordering, appointments, and accounts).
          </p>
          <p>
            For questions about privacy or data requests, contact{" "}
            <a className="text-primary underline" href="mailto:support@pillsure.com">
              support@pillsure.com
            </a>
            .
          </p>
          <p className="text-xs text-muted-foreground/80 pt-4">
            This is a summary placeholder. Replace with your full legal policy before production use.
          </p>
        </div>
      </div>
    </PublicPageShell>
  );
}
