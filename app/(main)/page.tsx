import {
  ArrowUpRight,
  Boxes,
  CircleAlert,
  CreditCard,
  PackageCheck,
  Users,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const stats = [
  {
    title: "Tổng doanh thu",
    value: "$128,450",
    delta: "+12.8%",
    icon: CreditCard,
    hint: "So với tháng trước",
  },
  {
    title: "Đơn hàng đang xử lý",
    value: "1,248",
    delta: "+9.2%",
    icon: PackageCheck,
    hint: "54 đơn cần xử lý hôm nay",
  },
  {
    title: "Số lượng tồn kho",
    value: "24,980",
    delta: "-1.3%",
    icon: Boxes,
    hint: "3 danh mục dưới ngưỡng an toàn",
  },
  {
    title: "Nhân sự đang hoạt động",
    value: "72",
    delta: "+4",
    icon: Users,
    hint: "2 yêu cầu cấp quyền đang chờ",
  },
];

const activities = [
  {
    id: "PO-4921",
    actor: "Nguyen Thanh",
    action: "Đã duyệt đơn mua hàng",
    when: "3 phút trước",
    status: "done",
    statusLabel: "Hoàn tất",
  },
  {
    id: "INV-8844",
    actor: "Warehouse Bot",
    action: "Tự động đồng bộ tồn kho từ chi nhánh B",
    when: "11 phút trước",
    status: "done",
    statusLabel: "Hoàn tất",
  },
  {
    id: "REQ-1022",
    actor: "Le Minh",
    action: "Yêu cầu điều chỉnh tồn kho",
    when: "28 phút trước",
    status: "review",
    statusLabel: "Chờ duyệt",
  },
  {
    id: "USR-338",
    actor: "Hệ thống",
    action: "Có tài khoản admin mới cần phê duyệt",
    when: "49 phút trước",
    status: "warning",
    statusLabel: "Cảnh báo",
  },
];

const health = [
  { label: "Độ ổn định API", value: 99.94 },
  { label: "Xử lý đơn hàng", value: 92 },
  { label: "Đồng bộ tồn kho", value: 88 },
  { label: "Tải hàng đợi", value: 61 },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <Card key={item.title} className="border border-border/70">
            <CardHeader>
              <CardDescription>{item.title}</CardDescription>
              <CardTitle className="text-2xl">{item.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Badge
                  variant={item.delta.startsWith("-") ? "destructive" : "secondary"}
                  className="font-medium"
                >
                  {item.delta}
                </Badge>
                <item.icon className="size-4 text-muted-foreground" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{item.hint}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <Card className="border border-border/70 xl:col-span-2">
          <CardHeader className="border-b border-border/70">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Hoạt động gần đây</CardTitle>
                <CardDescription>Các thao tác quản trị mới nhất trên hệ thống</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                Xuất nhật ký
                <ArrowUpRight className="size-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mã tham chiếu</TableHead>
                  <TableHead>Người thực hiện</TableHead>
                  <TableHead>Hành động</TableHead>
                  <TableHead>Thời gian</TableHead>
                  <TableHead className="text-right">Trạng thái</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activities.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">{row.id}</TableCell>
                    <TableCell>{row.actor}</TableCell>
                    <TableCell>{row.action}</TableCell>
                    <TableCell className="text-muted-foreground">{row.when}</TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={
                          row.status === "warning"
                            ? "destructive"
                            : row.status === "review"
                              ? "outline"
                              : "secondary"
                        }
                      >
                        {row.statusLabel}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="border border-border/70">
          <CardHeader className="border-b border-border/70">
            <CardTitle>Sức khỏe hệ thống</CardTitle>
            <CardDescription>Chỉ số chất lượng dịch vụ theo thời gian thực</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-4">
            {health.map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="font-medium">{item.value}%</span>
                </div>
                <div className="h-2 rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}

            <div className="rounded-lg border border-border/70 bg-muted/40 p-3 text-xs text-muted-foreground">
              <div className="mb-1 flex items-center gap-2 text-foreground">
                <CircleAlert className="size-3.5" />
                Cảnh báo đồng bộ
              </div>
              Đồng bộ tồn kho của chi nhánh C đang chậm 7 phút.
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
