"use client";

import { HelpCircle, Mail, Rocket, Layers3, Users, Kanban, MessageCircle } from "lucide-react";
import { PanelShell } from "@/components/nav-panels";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

const SUPPORT_EMAIL = "support@unify.dev";

const STEPS = [
  { icon: Layers3, title: "Create a workspace", body: "Workspaces group related spaces together — start by making one from the sidebar." },
  { icon: Kanban, title: "Add a space", body: "Spaces hold your boards: Kanban, Scrum, bug tracking, or a custom flow." },
  { icon: Users, title: "Bring in your team", body: "Create teams and add members, or connect with friends to collaborate faster." },
  { icon: Rocket, title: "Track your work", body: "Drag work items across the board as they move from To Do to Done." },
];

const FAQS = [
  {
    q: "What's the difference between a workspace, a space, and a team?",
    a: "A workspace is the top-level container for your organization's work. A space is a single board inside a workspace — Kanban, Scrum, bug tracker, or custom. A team is a group of people that can span multiple spaces and has its own membership, separate from any one workspace.",
  },
  {
    q: "How do I add a friend or teammate?",
    a: "Open the Teams tab and click \"View Friends\" to send and manage friend requests, or use a team's \"Add Member\" action to invite someone directly into a team.",
  },
  {
    q: "Do friend requests and notifications update in real time?",
    a: "Yes — friend requests, accepts, declines, and removals sync instantly across your open sessions over a live connection, with no manual refresh needed.",
  },
  {
    q: "Can I connect a GitHub or GitLab repository?",
    a: "Yes. Use the Repositories section in the sidebar to connect a repo — once linked, you can view deployments, incidents, and tie work items back to commits.",
  },
  {
    q: "How do I switch between light and dark mode?",
    a: "Use the theme toggle in the top bar, or visit Settings → Appearance.",
  },
];

export function HelpPage() {
  return (
    <PanelShell icon={HelpCircle} title="Help & Support" subtitle="Guides, answers, and ways to reach us">
      <div className="mx-auto max-w-2xl space-y-4">
        {/* Getting started */}
        <div className="rounded-md border border-border-subtle bg-panel">
          <div className="border-b border-border-subtle px-4 py-3">
            <h3 className="text-[13px] font-semibold text-foreground">Getting started</h3>
            <p className="text-[11px] font-medium text-muted">A quick tour of the basics</p>
          </div>
          <div className="grid gap-1 p-2 sm:grid-cols-2">
            {STEPS.map((step, i) => (
              <div key={step.title} className="flex items-start gap-2.5 rounded-lg p-2.5">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-accent/10 text-[11px] font-bold text-accent">
                  {i + 1}
                </div>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-semibold text-foreground">{step.title}</p>
                  <p className="mt-0.5 text-[11.5px] font-medium text-muted">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div className="rounded-md border border-border-subtle bg-panel">
          <div className="border-b border-border-subtle px-4 py-3">
            <h3 className="text-[13px] font-semibold text-foreground">Frequently asked questions</h3>
          </div>
          <div className="p-3">
            <Accordion type="single" className="space-y-1.5">
              {FAQS.map((faq, i) => (
                <AccordionItem key={faq.q} value={`faq-${i}`} className="border-border-subtle">
                  <AccordionTrigger className="px-3 py-2.5 text-[12.5px] font-semibold text-foreground">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-3 text-[12px] font-medium text-muted">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>

        {/* Contact & support */}
        <div className="rounded-md border border-border-subtle bg-panel">
          <div className="border-b border-border-subtle px-4 py-3">
            <h3 className="text-[13px] font-semibold text-foreground">Contact & support</h3>
            <p className="text-[11px] font-medium text-muted">Didn&apos;t find what you needed?</p>
          </div>
          <div className="flex flex-col gap-2 p-4 sm:flex-row">
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="flex flex-1 items-center gap-2.5 rounded-lg border border-border-subtle px-3 py-2.5 hover:bg-foreground/[0.04]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-teal-700/10">
                <Mail className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" />
              </span>
              <span className="min-w-0">
                <span className="block text-[12.5px] font-semibold text-foreground">Email support</span>
                <span className="block truncate text-[11.5px] font-medium text-muted">{SUPPORT_EMAIL}</span>
              </span>
            </a>
            <a
              href="mailto:feedback@unify.dev"
              className="flex flex-1 items-center gap-2.5 rounded-lg border border-border-subtle px-3 py-2.5 hover:bg-foreground/[0.04]"
            >
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-teal-700/10">
                <MessageCircle className="h-3.5 w-3.5 text-teal-700 dark:text-teal-400" />
              </span>
              <span className="min-w-0">
                <span className="block text-[12.5px] font-semibold text-foreground">Send feedback</span>
                <span className="block truncate text-[11.5px] font-medium text-muted">Tell us what to improve</span>
              </span>
            </a>
          </div>
        </div>
      </div>
    </PanelShell>
  );
}
