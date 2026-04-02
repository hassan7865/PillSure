"use client";

import { PublicPageShell } from "@/layout/PublicLayout";

export default function TermsPage() {
  return (
    <PublicPageShell>
      <div className="container mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <h1 className="text-3xl font-bold text-primary mb-6">Terms of Service</h1>
        <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground space-y-4 text-sm sm:text-base">
          <p>
            By using PillSure, you agree to use the platform lawfully and to provide accurate information when
            ordering medicines, booking appointments, or creating an account.
          </p>
          <p>
            Medicines may require a valid prescription where applicable. Consult a licensed professional for medical
            advice.
          </p>
          <p>
            For questions about these terms, contact{" "}
            <a className="text-primary underline" href="mailto:support@pillsure.com">
              support@pillsure.com
            </a>
            .
          </p>
          <p className="text-xs text-muted-foreground/80 pt-4">
            This is a summary placeholder. Replace with your full legal terms before production use.
          </p>
        </div>
      </div>
    </PublicPageShell>
  );
}
