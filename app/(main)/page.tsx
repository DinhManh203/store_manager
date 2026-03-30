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
    title: "Total Revenue",
    value: "$128,450",
    delta: "+12.8%",
    icon: CreditCard,
    hint: "Compared with last month",
  },
  {
    title: "Active Orders",
    value: "1,248",
    delta: "+9.2%",
    icon: PackageCheck,
    hint: "54 need processing today",
  },
  {
    title: "Inventory Units",
    value: "24,980",
    delta: "-1.3%",
    icon: Boxes,
    hint: "3 categories under threshold",
  },
  {
    title: "Active Staff",
    value: "72",
    delta: "+4",
    icon: Users,
    hint: "2 pending access requests",
  },
];

const activities = [
  {
    id: "PO-4921",
    actor: "Nguyen Thanh",
    action: "Approved purchase order",
    when: "3 mins ago",
    status: "done",
  },
  {
    id: "INV-8844",
    actor: "Warehouse Bot",
    action: "Auto sync inventory from branch B",
    when: "11 mins ago",
    status: "done",
  },
  {
    id: "REQ-1022",
    actor: "Le Minh",
    action: "Requested stock adjustment",
    when: "28 mins ago",
    status: "review",
  },
  {
    id: "USR-338",
    actor: "System",
    action: "New admin account requires approval",
    when: "49 mins ago",
    status: "warning",
  },
];

const health = [
  { label: "API uptime", value: 99.94 },
  { label: "Order processing", value: 92 },
  { label: "Inventory sync", value: 88 },
  { label: "Queue load", value: 61 },
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
                <CardTitle>Recent Activities</CardTitle>
                <CardDescription>Latest admin actions in the system</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                Export Log
                <ArrowUpRight className="size-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ref ID</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead className="text-right">Status</TableHead>
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
                        {row.status}
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
            <CardTitle>System Health</CardTitle>
            <CardDescription>Live service quality indicators</CardDescription>
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
                Sync Alert
              </div>
              Branch C inventory sync is delayed by 7 minutes.
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
