"use client";

import { useState } from "react";

import Navbar from "./_components/navbar";
import Sidebar from "./_components/sidebar";
import { cn } from "@/lib/utils";

const MainLayout = ({ children }: { children: React.ReactNode }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen((prev) => !prev);
  };

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
