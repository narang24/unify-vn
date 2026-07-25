"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Mail, Check, X, Crown, Shield, User, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Role = "viewer" | "editor" | "admin";

interface Member {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: "active" | "pending";
}

const ROLE_CONFIG: Record<Role, { label: string; icon: typeof Crown; color: string }> = {
  admin: { label: "Admin", icon: Crown, color: "text-amber-500" },
  editor: { label: "Editor", icon: Shield, color: "text-accent" },
  viewer: { label: "Viewer", icon: User, color: "text-muted" },
};

const SEED_MEMBERS: Member[] = [
  { id: "m1", name: "You", email: "you@unify.dev", role: "admin", status: "active" },
];

interface AddMembersDialogProps {
  open: boolean;
  onClose: () => void;
  spaceName: string;
}

export function AddMembersDialog({ open, onClose, spaceName }: AddMembersDialogProps) {
  const [members, setMembers] = useState<Member[]>(SEED_MEMBERS);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState("");

  function handleInvite() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setError("Enter a valid email address.");
      return;
    }
    if (!role) {
      setError("Please select a role.");
      return;
    }
    if (members.find((m) => m.email === trimmed)) {
      setError("This person is already a member.");
      return;
    }
    setInviting(true);
    setError("");
    // Simulate async invite
    setTimeout(() => {
      setMembers((prev) => [
        ...prev,
        {
          id: `m${Date.now()}`,
          name: trimmed.split("@")[0],
          email: trimmed,
          role,
          status: "pending",
        },
      ]);
      setEmail("");
      setInviting(false);
    }, 700);
  }

  function removeM(id: string) {
    setMembers((m) => m.filter((mem) => mem.id !== id));
  }

  function changeRole(id: string, newRole: Role) {
    setMembers((m) => m.map((mem) => (mem.id === id ? { ...mem, role: newRole } : mem)));
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/45"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2 }}
          className="relative z-10 w-full max-w-md rounded-2xl border border-border-subtle bg-panel p-6 shadow-2xl"
        >
          <div className="mb-5 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10">
                <UserPlus className="h-4 w-4 text-accent" />
              </div>
              <div>
                <h2 className="text-[14px] font-semibold text-foreground">Add Members</h2>
                <p className="text-[11.5px] font-semibold text-muted">{spaceName}</p>
              </div>
            </div>
            <button onClick={onClose} className="rounded-md p-1 text-muted hover:bg-foreground/[0.06]">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Invite row */}
          <div className="flex gap-2 mb-1">
            <div className="relative flex-1">
              <Mail className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
              <Input
                placeholder="Email address"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(""); }}
                onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                className="pl-8 h-9 text-[13px] font-semibold"
              />
            </div>

            {/* Role picker */}
            <DropdownMenu>
              <DropdownMenuTrigger>
                <button className="flex items-center gap-2 rounded-md border border-border-subtle px-2.5 py-1.5 text-[12.5px] font-semibold hover:bg-foreground/[0.06] h-9 shrink-0">
                  {role ? ROLE_CONFIG[role].label : "Role"}
                  <ChevronsUpDown className="h-3.5 w-3.5 text-muted" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {(Object.entries(ROLE_CONFIG) as [Role, typeof ROLE_CONFIG[Role]][]).map(([r, cfg]) => {
                  const isSelected = r === role;
                  return (
                    <DropdownMenuItem 
                      key={r} 
                      onClick={() => setRole(isSelected ? null : r)} 
                      className={cn("font-semibold", isSelected && "bg-accent/10 text-accent")}
                    >
                      {cfg.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button onClick={handleInvite} size="sm" className="h-9 px-3" disabled={inviting || !role}>
              {inviting ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                "Invite"
              )}
            </Button>
          </div>
          {error && <p className="mb-3 text-[11.5px] text-red-500">{error}</p>}

          {/* Member list */}
          <div className="mt-4 space-y-1.5">
            <p className="mb-2 text-[11.5px] font-semibold uppercase tracking-wide text-muted">
              {members.length} member{members.length !== 1 ? "s" : ""}
            </p>
            <AnimatePresence initial={false}>
              {members.map((m) => {
                const roleCfg = ROLE_CONFIG[m.role];
                const RoleIcon = roleCfg.icon;
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, x: -6 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 6 }}
                    transition={{ duration: 0.15 }}
                    className="flex items-center gap-3 rounded-xl p-2 hover:bg-foreground/[0.06]"
                  >
                    <Avatar name={m.name} size={32} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-foreground truncate">
                        {m.name === "You" ? "You" : m.name}
                      </p>
                      {m.email && (
                        <p className="text-[11.5px] font-semibold text-muted truncate">
                          {m.email}
                        </p>
                      )}
                    </div>
                    {m.status === "pending" && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10.5px] font-semibold text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                        Pending
                      </span>
                    )}
                    {m.status === "active" && (
                      <span className="flex items-center gap-1 text-[10.5px] font-semibold text-emerald-600">
                        <Check className="h-3 w-3" /> Active
                      </span>
                    )}

                    {/* Role selector */}
                    {m.id !== "m1" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <button className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] font-semibold hover:bg-foreground/[0.06]">
                            <RoleIcon className={`h-3 w-3 ${roleCfg.color}`} />
                            {roleCfg.label}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          {(Object.entries(ROLE_CONFIG) as [Role, typeof ROLE_CONFIG[Role]][]).map(([r, cfg]) => {
                            return (
                              <DropdownMenuItem key={r} onClick={() => changeRole(m.id, r)} className="font-semibold">
                                {cfg.label}
                              </DropdownMenuItem>
                            );
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}

                    {m.id !== "m1" && (
                      <button onClick={() => removeM(m.id)} className="rounded-md p-0.5 text-muted hover:text-red-500">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
