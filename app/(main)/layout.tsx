"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import Navbar from "./_components/navbar";
import Sidebar from "./_components/sidebar";
import { cn } from "@/lib/utils";

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      router.replace("/login");
    } else {
      setIsCheckingAuth(false);
    }
  }, [router]);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
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
      <Sidebar isOpen={isSidebarOpen} />

      <div
        className={cn(
          "transition-[padding] duration-300",
          isSidebarOpen ? "md:pl-72" : "md:pl-0"
        )}
      >
        <Navbar isSidebarOpen={isSidebarOpen} onToggleSidebar={toggleSidebar} />
        <main className="px-4 pb-8 pt-20 md:px-6 md:pt-24 lg:px-8">{children}</main>
      </div>
    </div>
  );
};

export default MainLayout;
