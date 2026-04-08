"use client";

import { useEffect, useState } from "react";
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


function formatTimeAgo(dateString: string) {
  if (!dateString) return "Vừa xong";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (diffInSeconds < 60) return `${diffInSeconds} giây trước`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} giờ trước`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays} ngày trước`;
}

function getActionLabel(changeType: string) {
    if (changeType === "nhap") return "Nhập kho";
    if (changeType === "xuat") return "Xuất kho";
    if (changeType === "chinh_sua") return "Cập nhật tồn kho";
    return changeType;
}

export default function DashboardPage() {
  const [data, setData] = useState({
    overview: {
      tong_san_pham: 0,
      tong_ton_kho: 0,
      het_hang: 0,
      sap_het_hang: 0,
    },
    activities: [],
    employees_count: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/dashboard");
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error("Lỗi lấy dữ liệu dashboard:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const stats = [
    {
      title: "Tổng sản phẩm",
      value: data.overview.tong_san_pham.toLocaleString(),
      delta: "",
      icon: Boxes,
      hint: `Với ${data.overview.tong_ton_kho} đơn vị trong kho`,
    },
    {
      title: "Sản phẩm sắp hết",
      value: data.overview.sap_het_hang.toString(),
      delta: "",
      icon: CircleAlert,
      hint: "Số lượng dưới ngưỡng an toàn",
    },
    {
      title: "Đã hết hàng",
      value: data.overview.het_hang.toString(),
      delta: "",
      icon: PackageCheck,
      hint: "Cần nhập thêm ngay",
    },
    {
      title: "Nhân sự hệ thống",
      value: data.employees_count.toLocaleString(),
      delta: "",
      icon: Users,
      hint: "Người dùng đang hoạt động",
    },
  ];

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <Card key={item.title} className="border border-border/70">
            <CardHeader>
              <CardDescription>{item.title}</CardDescription>
              <CardTitle className="text-2xl">
                {isLoading ? "..." : item.value}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                {item.delta && (
                    <Badge variant="secondary" className="font-medium">
                        {item.delta}
                    </Badge>
                )}
                {!item.delta && <div></div>}
                <item.icon className="size-4 text-muted-foreground" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{isLoading ? "Đang tải..." : item.hint}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section>
        <Card className="border border-border/70">
          <CardHeader className="border-b border-border/70">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>Hoạt động gần đây</CardTitle>
                <CardDescription>Các sự kiện xuất nhập kho mới nhất</CardDescription>
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
                  <TableHead>Sản phẩm</TableHead>
                  <TableHead>Người thực hiện</TableHead>
                  <TableHead>Thao tác</TableHead>
                  <TableHead>Chênh lệch</TableHead>
                  <TableHead>Thời gian</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                    <TableRow>
                        <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">Đang tải dữ liệu...</TableCell>
                    </TableRow>
                ) : data.activities.length === 0 ? (
                    <TableRow>
                        <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">Không có hoạt động nào.</TableCell>
                    </TableRow>
                ) : (
                    data.activities.map((row: any) => (
                    <TableRow key={row.id || row._id || Math.random()}>
                        <TableCell className="font-medium">{row.product_name}</TableCell>
                        <TableCell>{row.created_by || "Hệ thống"}</TableCell>
                        <TableCell>
                            <Badge variant={row.change_type === 'xuat' ? 'outline' : 'secondary'}>
                                {getActionLabel(row.change_type)}
                            </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {row.change_type === 'xuat' ? '-' : row.change_type === 'nhap' ? '+' : ''}{row.quantity}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{formatTimeAgo(row.created_at)}</TableCell>
                    </TableRow>
                    ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
