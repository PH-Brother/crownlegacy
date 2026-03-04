import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

type ThemeName = "obsidian" | "ivory";

interface ThemeContextType {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const STORAGE_KEY = "legacykingdom_theme";

function applyThemeClass(theme: ThemeName) {
  document.documentElement.classList.remove("theme-obsidian", "theme-ivory");
  document.documentElement.classList.add(`theme-${theme}`);
}

// Apply saved theme immediately to avoid flash
const savedTheme = (localStorage.getItem(STORAGE_KEY) as ThemeName) || "obsidian";
applyThemeClass(savedTheme);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(savedTheme);

  // On mount, check Supabase if no localStorage value
  useEffect(() => {
    if (localStorage.getItem(STORAGE_KEY)) return;
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      supabase
        .from("profiles")
        .select("tema_preferido")
        .eq("id", data.user.id)
        .maybeSingle()
        .then(({ data: profile }) => {
          const t = (profile?.tema_preferido as ThemeName) || "obsidian";
          setThemeState(t);
          localStorage.setItem(STORAGE_KEY, t);
          applyThemeClass(t);
        });
    });
  }, []);

  const setTheme = useCallback((newTheme: ThemeName) => {
    setThemeState(newTheme);
    localStorage.setItem(STORAGE_KEY, newTheme);
    applyThemeClass(newTheme);

    // Persist to Supabase (fire-and-forget)
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      supabase
        .from("profiles")
        .update({ tema_preferido: newTheme } as Record<string, unknown>)
        .eq("id", data.user.id)
        .then(() => {});
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "obsidian" ? "ivory" : "obsidian");
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
