import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ThemeSettings from "./_components/theme-settings";
import BranchesSettings from "./_components/branches-settings";
import SuppliersSettings from "./_components/suppliers-settings";

export default function SettingsPage() {
  return (
    <div className="space-y-4 md:space-y-5">
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Tùy chọn</p>
        <h1 className="text-2xl font-semibold tracking-tight">Cài đặt hệ thống</h1>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Quản lý các thông số, giao diện và cấu hình cho bảng điều khiển.
        </p>
      </div>

      <Tabs defaultValue="theme" className="w-full flex-col gap-4">
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-xl bg-muted/70 p-1">
          <TabsTrigger
            value="theme"
            className="h-auto min-h-10 w-full min-w-0 cursor-pointer px-2 py-2 text-center text-[15px] leading-tight whitespace-normal text-muted-foreground transition-colors sm:h-9 sm:whitespace-nowrap data-[state=active]:bg-background data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-sm data-active:bg-background data-active:font-semibold data-active:text-foreground data-active:shadow-sm"
          >
            Hiển thị
          </TabsTrigger>
          <TabsTrigger
            value="branches"
            className="h-auto min-h-10 w-full min-w-0 cursor-pointer px-2 py-2 text-center text-[15px] leading-tight whitespace-normal text-muted-foreground transition-colors sm:h-9 sm:whitespace-nowrap data-[state=active]:bg-background data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-sm data-active:bg-background data-active:font-semibold data-active:text-foreground data-active:shadow-sm"
          >
            Thêm chi nhánh
          </TabsTrigger>
          <TabsTrigger
            value="suppliers"
            className="h-auto min-h-10 w-full min-w-0 cursor-pointer px-2 py-2 text-center text-[15px] leading-tight whitespace-normal text-muted-foreground transition-colors sm:h-9 sm:whitespace-nowrap data-[state=active]:bg-background data-[state=active]:font-semibold data-[state=active]:text-foreground data-[state=active]:shadow-sm data-active:bg-background data-active:font-semibold data-active:text-foreground data-active:shadow-sm"
          >
            Thêm nhà cung cấp
          </TabsTrigger>
        </TabsList>
        <TabsContent value="theme" className="mt-0">
          <ThemeSettings />
        </TabsContent>
        <TabsContent value="branches" className="mt-0">
          <BranchesSettings />
        </TabsContent>
        <TabsContent value="suppliers" className="mt-0">
          <SuppliersSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
