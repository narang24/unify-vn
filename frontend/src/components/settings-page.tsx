"use client";

import * as React from "react";
import { Settings, Palette, Bell, ShieldCheck, Mail, KeyRound } from "lucide-react";
import { PanelShell } from "@/components/nav-panels";
import { Avatar } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ThemeToggle } from "@/components/theme-toggle";
import { toast } from "@/lib/use-toast";

interface SettingsPageProps {
  user: { fullName?: string | null; email: string; avatarUrl?: string | null; authProvider?: string | null } | null;
}

// A single labelled row: title + description on the left, a control on the
// right. Stacks on mobile so nothing gets cramped on small screens.
function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.5 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0">
        <p className="text-[12.5px] font-semibold text-foreground">{title}</p>
        {description && <p className="mt-0.5 text-[11.5px] font-medium text-muted">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border-subtle bg-panel">
      <div className="flex items-center gap-2 border-b border-border-subtle px-4 py-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/10">
          <Icon className="h-3.5 w-3.5 text-accent" />
        </div>
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
          {description && <p className="text-[11px] font-medium text-muted">{description}</p>}
        </div>
      </div>
      <div className="divide-y divide-border-subtle px-4">{children}</div>
    </div>
  );
}

function comingSoon(feature: string) {
  toast({ title: "Coming soon", description: `${feature} isn't available yet.` });
}

const AUTH_PROVIDER_LABEL: Record<string, string> = {
  local: "Email & password",
  google: "Google",
  github: "GitHub",
  gitlab: "GitLab",
};

export function SettingsPage({ user }: SettingsPageProps) {
  const [emailOnRequest, setEmailOnRequest] = React.useState(true);
  const [notificationSound, setNotificationSound] = React.useState(true);
  const [weeklyDigest, setWeeklyDigest] = React.useState(false);

  const name = user?.fullName ?? user?.email?.split("@")[0] ?? "Account";
  const providerLabel = user?.authProvider ? AUTH_PROVIDER_LABEL[user.authProvider] ?? user.authProvider : "Email & password";

  return (
    <PanelShell icon={Settings} title="Settings" subtitle="Manage your account, appearance, and notification preferences">
      <div className="mx-auto max-w-2xl space-y-4">
        {/* Profile */}
        <SectionCard icon={Mail} title="Profile" description="Your account details">
          <div className="flex items-center gap-3 py-3">
            <Avatar name={name} src={user?.avatarUrl} size={44} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-foreground">{name}</p>
              <p className="truncate text-[11.5px] font-medium text-muted">{user?.email}</p>
            </div>
          </div>
          <SettingRow title="Signed in with" description="How you access your account">
            <span className="text-[12px] font-semibold text-muted">{providerLabel}</span>
          </SettingRow>
        </SectionCard>

        {/* Appearance */}
        <SectionCard icon={Palette} title="Appearance">
          <SettingRow title="Theme" description="Switch between light and dark mode">
            <ThemeToggle />
          </SettingRow>
        </SectionCard>

        {/* Notifications */}
        <SectionCard
          icon={Bell}
          title="Notifications"
          description="Applies to this device for now — cross-device sync is coming soon"
        >
          <SettingRow title="Friend request emails" description="Get an email when someone sends you a request">
            <Checkbox checked={emailOnRequest} onCheckedChange={setEmailOnRequest} />
          </SettingRow>
          <SettingRow title="Notification sound" description="Play a sound for new in-app notifications">
            <Checkbox checked={notificationSound} onCheckedChange={setNotificationSound} />
          </SettingRow>
          <SettingRow title="Weekly digest" description="A weekly summary of activity across your workspaces">
            <Checkbox checked={weeklyDigest} onCheckedChange={setWeeklyDigest} />
          </SettingRow>
        </SectionCard>

        {/* Security */}
        <SectionCard icon={ShieldCheck} title="Security">
          <SettingRow title="Password" description="Change your account password">
            <button
              onClick={() => comingSoon("Changing your password")}
              className="flex h-7 items-center gap-1.5 rounded-md border border-border-subtle px-2.5 text-[11.5px] font-semibold text-foreground hover:bg-foreground/[0.06]"
            >
              <KeyRound className="h-3 w-3" /> Change
            </button>
          </SettingRow>
          <SettingRow title="Two-factor authentication" description="Add an extra layer of security to your account">
            <button
              onClick={() => comingSoon("Two-factor authentication")}
              className="rounded-full bg-foreground/[0.08] px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-muted"
            >
              Coming soon
            </button>
          </SettingRow>
          <SettingRow title="Active sessions" description="Where you're currently signed in">
            <span className="text-[12px] font-semibold text-muted">This device only</span>
          </SettingRow>
        </SectionCard>
      </div>
    </PanelShell>
  );
}
