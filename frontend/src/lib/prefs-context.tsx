"use client";

import * as React from "react";
import { getPrefs, toggleStar as apiToggleStar, pushRecent as apiPushRecent } from "@/lib/api";

export interface RecentItem {
  type: "space" | "repo";
  id: string;
  at: number;
}

interface PrefsValue {
  starred: Set<string>;
  recents: RecentItem[];
  isStarred: (id: string) => boolean;
  toggleStar: (id: string) => void;
  pushRecent: (type: "space" | "repo", id: string) => void;
}

const PrefsContext = React.createContext<PrefsValue | null>(null);

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [starred, setStarred] = React.useState<Set<string>>(new Set());
  const [recents, setRecents] = React.useState<RecentItem[]>([]);

  React.useEffect(() => {
    getPrefs()
      .then((p) => {
        setStarred(new Set(p.starred));
        setRecents(p.recents ?? []);
      })
      .catch(() => {});
  }, []);

  const value: PrefsValue = {
    starred,
    recents,
    isStarred: (id) => starred.has(id),
    toggleStar: (id) => {
      setStarred((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      apiToggleStar(id)
        .then((p) => {
          setStarred(new Set(p.starred));
          setRecents(p.recents ?? []);
        })
        .catch(() => {});
    },
    pushRecent: (type, id) => {
      setRecents((prev) => [{ type, id, at: Date.now() }, ...prev.filter((r) => r.id !== id)].slice(0, 15));
      apiPushRecent(type, id).catch(() => {});
    },
  };

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs(): PrefsValue {
  const ctx = React.useContext(PrefsContext);
  if (!ctx) {
    return {
      starred: new Set(),
      recents: [],
      isStarred: () => false,
      toggleStar: () => {},
      pushRecent: () => {},
    };
  }
  return ctx;
}
