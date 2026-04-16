"use client";

import { useState, useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import Navbar from "./_components/navbar";
import Sidebar from "./_components/sidebar";
import { cn } from "@/lib/utils";

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [isTopHeaderLoading, setIsTopHeaderLoading] = useState(false);
  const [mainContentReloadKey, setMainContentReloadKey] = useState(0);
  const isRedirectingRef = useRef(false);

  useEffect(() => {
    let isMounted = true;
    const originalFetch = window.fetch.bind(window);

    const clearLocalAuthState = () => {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("auth_role");
      localStorage.removeItem("auth_username");
    };

    const redirectToLogin = async () => {
      if (isRedirectingRef.current) {
        return;
      }

      isRedirectingRef.current = true;
      clearLocalAuthState();

      try {
        await originalFetch("/api/auth/logout", {
          method: "POST",
          cache: "no-store",
        });
      } catch {
        // Ignore logout errors and proceed with client redirect.
      }

      router.replace("/login");
      router.refresh();
    };

    const patchedFetch: typeof window.fetch = async (input, init) => {
      const response = await originalFetch(input, init);

      if (response.status === 401) {
        const requestUrl =
          typeof input === "string"
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url;

        const isAuthEndpoint =
          requestUrl.includes("/api/auth/login") || requestUrl.includes("/api/auth/logout");

        if (!isAuthEndpoint) {
          void redirectToLogin();
        }
      }

      return response;
    };

    window.fetch = patchedFetch;

    const verifySession = async () => {
      try {
        const response = await originalFetch("/api/profile", {
          method: "GET",
          cache: "no-store",
        });

        if (response.status === 401) {
          await redirectToLogin();
          return;
        }
      } catch {
        // Ignore transient network failures and keep current screen.
      } finally {
        if (isMounted && !isRedirectingRef.current) {
          setTimeout(() => setIsCheckingAuth(false), 0);
        }
      }
    };

    void verifySession();

    return () => {
      isMounted = false;
      window.fetch = originalFetch;
    };
  }, [router]);

  useEffect(() => {
    const handleNavigationStart = () => {
      setIsTopHeaderLoading(true);
    };

    window.addEventListener("app:top-header-loading-start", handleNavigationStart);

    return () => {
      window.removeEventListener("app:top-header-loading-start", handleNavigationStart);
    };
  }, []);

  useEffect(() => {
    const handleMainContentReload = () => {
      setMainContentReloadKey((prev) => prev + 1);
    };

    window.addEventListener("app:main-content-reload", handleMainContentReload);

    return () => {
      window.removeEventListener("app:main-content-reload", handleMainContentReload);
    };
  }, []);

  useEffect(() => {
    if (!isTopHeaderLoading) {
      return;
    }

    const completeTimeout = window.setTimeout(() => {
      setIsTopHeaderLoading(false);
    }, 300);

    return () => {
      window.clearTimeout(completeTimeout);
    };
  }, [pathname, isTopHeaderLoading]);

  useEffect(() => {
    if (!isTopHeaderLoading) {
      return;
    }

    const fallbackTimeout = window.setTimeout(() => {
      setIsTopHeaderLoading(false);
    }, 8000);

    return () => {
      window.clearTimeout(fallbackTimeout);
    };
  }, [isTopHeaderLoading]);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

  const closeSidebar = () => {
    setIsSidebarOpen(false);
  };

  if (isCheckingAuth) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background text-foreground">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-background text-foreground">
      {isTopHeaderLoading ? (
        <div
          aria-hidden="true"
          className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-1 overflow-hidden"
        >
          <div className="absolute inset-0 bg-sky-200/85 dark:bg-slate-700/70" />
          <div className="absolute inset-y-0 left-0 w-2/5 animate-[top-loader-slide_1.8s_ease-in-out_infinite] bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 shadow-[0_0_14px_rgba(59,130,246,0.85)] dark:from-cyan-300 dark:via-blue-300 dark:to-indigo-300 dark:shadow-[0_0_14px_rgba(125,211,252,0.7)]" />
        </div>
      ) : null}

      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />

      {isSidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-[35] bg-black/50 md:hidden"
          aria-label="Đóng thanh bên"
          onClick={closeSidebar}
        />
      ) : null}

      <div
        className={cn(
          "transition-[padding] duration-300",
          isSidebarOpen ? "md:pl-72" : "md:pl-0"
        )}
      >
        <Navbar
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={toggleSidebar}
        />
        <main key={mainContentReloadKey} className="px-4 pb-8 pt-20 md:px-6 md:pt-24 lg:px-8">{children}</main>
      </div>
    </div>
  );
};

export default MainLayout;
