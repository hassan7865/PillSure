"use client";

import Link from "next/link";
import { Building2, ChevronDown, Factory, Stethoscope, Store } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { normalizeRole } from "@/lib/role-routing";

type Props = {
  currentRole?: string;
  className?: string;
};

const professionalLinks = [
  { href: "/auth?role=doctor&mode=signup", label: "Doctor", Icon: Stethoscope },
  { href: "/auth?role=hospital&mode=signup", label: "Hospital", Icon: Building2 },
  { href: "/auth?role=medical_store&mode=signup", label: "Medical store", Icon: Store },
  { href: "/auth?role=manufacturer&mode=signup", label: "Manufacturer", Icon: Factory },
] as const;

/** Shown only on signup — collapsed by default so patient sign-up stays simple. */
export function SignupProfessionalRolesCollapsible({ currentRole, className }: Props) {
  const isProfessional = !["", "patient"].includes(normalizeRole(currentRole));

  return (
    <Collapsible defaultOpen={isProfessional} className={cn("w-full", className)}>
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors",
          "hover:bg-muted/40 hover:text-foreground data-[state=open]:border-border data-[state=open]:bg-muted/30",
          "[&[data-state=open]>svg]:rotate-180",
        )}
      >
        <span>Not registering as a patient? Professional &amp; business accounts</span>
        <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden">
        <ul className="mt-2 space-y-1 border-l-2 border-primary/20 pl-3">
          {professionalLinks.map(({ href, label, Icon }) => (
            <li key={href}>
              <Link
                href={href}
                className="flex items-center gap-2 rounded-md py-1.5 text-sm font-medium text-foreground/90 hover:text-primary"
              >
                <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                {label}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-2 pl-3 text-[11px] leading-snug text-muted-foreground">
          Opens the same sign-up form with the correct role for onboarding.
        </p>
      </CollapsibleContent>
    </Collapsible>
  );
}
