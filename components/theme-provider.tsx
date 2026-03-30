"use client";

import * as React from "react";

type Theme = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

export type ThemeProviderProps = {
  children: React.ReactNode;
  attribute?: "class" | string;
  defaultTheme?: Theme;
  enableSystem?: boolean;
  disableTransitionOnChange?: boolean;
  storageKey?: string;
};

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: ResolvedTheme;
  systemTheme: ResolvedTheme;
  themes: Theme[];
};

const STORAGE_FALLBACK_KEY = "theme";
const SYSTEM_QUERY = "(prefers-color-scheme: dark)";
const themeSet = new Set<Theme>(["light", "dark", "system"]);
const resolvedThemeSet = new Set<ResolvedTheme>(["light", "dark"]);

const ThemeContext = React.createContext<ThemeContextValue | undefined>(undefined);

const isTheme = (value: string | null | undefined): value is Theme =>
  !!value && themeSet.has(value as Theme);

const getSystemTheme = (): ResolvedTheme => {
  if (typeof window === "undefined") {
    return "light";
  }

  return window.matchMedia(SYSTEM_QUERY).matches ? "dark" : "light";
};

const disableTransitionsTemporarily = () => {
  const style = document.createElement("style");
  style.appendChild(
    document.createTextNode(
      "*,*::before,*::after{transition:none!important;-webkit-transition:none!important}"
    )
  );
  document.head.appendChild(style);

  return () => {
    window.getComputedStyle(document.body);
    setTimeout(() => {
      document.head.removeChild(style);
    }, 1);
  };
};

const applyThemeToDocument = (attribute: string, resolvedTheme: ResolvedTheme) => {
  const root = document.documentElement;

  if (attribute === "class") {
    root.classList.remove("light", "dark");
    root.classList.add(resolvedTheme);
  } else {
    root.setAttribute(attribute, resolvedTheme);
  }

  root.style.colorScheme = resolvedTheme;
};

export function ThemeProvider({
  children,
  attribute = "class",
  defaultTheme = "system",
  enableSystem = true,
  disableTransitionOnChange = false,
  storageKey = STORAGE_FALLBACK_KEY,
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(defaultTheme);
  const [systemTheme, setSystemTheme] = React.useState<ResolvedTheme>("light");
  const [isMounted, setIsMounted] = React.useState(false);

  const resolvedTheme: ResolvedTheme =
    theme === "system" ? (enableSystem ? systemTheme : "light") : theme;

  React.useEffect(() => {
    setIsMounted(true);

    const storedTheme = window.localStorage.getItem(storageKey);
    if (isTheme(storedTheme)) {
      setThemeState(storedTheme);
    } else {
      setThemeState(defaultTheme);
    }

    setSystemTheme(getSystemTheme());
  }, [defaultTheme, storageKey]);

  React.useEffect(() => {
    if (!enableSystem) {
      return;
    }

    const mediaQuery = window.matchMedia(SYSTEM_QUERY);
    const legacyMediaQuery = mediaQuery as MediaQueryList & {
      addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
      removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
    };
    const handleChange = (event: MediaQueryListEvent) => {
      const nextSystemTheme: ResolvedTheme = event.matches ? "dark" : "light";
      if (resolvedThemeSet.has(nextSystemTheme)) {
        setSystemTheme(nextSystemTheme);
      }
    };

    setSystemTheme(mediaQuery.matches ? "dark" : "light");

    if ("addEventListener" in mediaQuery) {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }

    if (legacyMediaQuery.addListener && legacyMediaQuery.removeListener) {
      legacyMediaQuery.addListener(handleChange);
      return () => legacyMediaQuery.removeListener?.(handleChange);
    }

    return undefined;
  }, [enableSystem]);

  React.useEffect(() => {
    if (!isMounted) {
      return;
    }

    const restoreTransitions = disableTransitionOnChange
      ? disableTransitionsTemporarily()
      : null;

    applyThemeToDocument(attribute, resolvedTheme);
    restoreTransitions?.();
  }, [attribute, disableTransitionOnChange, isMounted, resolvedTheme]);

  React.useEffect(() => {
    if (!isMounted) {
      return;
    }

    window.localStorage.setItem(storageKey, theme);
  }, [isMounted, storageKey, theme]);

  React.useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== storageKey) {
        return;
      }

      if (isTheme(event.newValue)) {
        setThemeState(event.newValue);
        return;
      }

      setThemeState(defaultTheme);
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [defaultTheme, storageKey]);

  const setTheme = React.useCallback((nextTheme: Theme) => {
    if (!isTheme(nextTheme)) {
      return;
    }

    setThemeState(nextTheme);
  }, []);

  const value = React.useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
      systemTheme,
      themes: enableSystem ? ["light", "dark", "system"] : ["light", "dark"],
    }),
    [enableSystem, resolvedTheme, setTheme, systemTheme, theme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = React.useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider.");
  }

  return context;
}
