"use client";

import { AppLayout } from "@/components/layout";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  Wrench,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";

interface Device {
  id: string;
  device_code: string;
  device_name: string;
  device_type: string;
  status: string;
  health_score: number;
  location: string;
}

interface Alert {
  id: string;
  device_id: string;
  alert_type: string;
  severity: string;
  status: string;
  probability: number;
  created_at: string;
  ai_explanation: string;
}

interface WorkOrder {
  id: string;
  order_number: string;
  title: string;
  status: string;
  priority: string;
  created_at: string;
}

export default function DashboardPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [devicesRes, alertsRes, workOrdersRes] = await Promise.all([
        fetch("/api/devices"),
        fetch("/api/alerts?limit=5"),
        fetch("/api/work-orders?status=pending&limit=5"),
      ]);

      const devicesData = await devicesRes.json();
      const alertsData = await alertsRes.json();
      const workOrdersData = await workOrdersRes.json();

      setDevices(devicesData.data || []);
      setAlerts(alertsData.data || []);
      setWorkOrders(workOrdersData.data || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  // 统计数据
  const stats = {
    total: devices.length,
    online: devices.filter((d) => d.status === "online").length,
    warning: devices.filter((d) => d.status === "warning").length,
    maintenance: devices.filter((d) => d.status === "maintenance").length,
    criticalAlerts: alerts.filter((a) => a.severity === "critical" && a.status === "active").length,
    pendingOrders: workOrders.length,
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getHealthScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
      critical: "destructive",
      high: "default",
      medium: "secondary",
      low: "outline",
    };
    const labels: Record<string, string> = {
      critical: "紧急",
      high: "高",
      medium: "中",
      low: "低",
    };
    return <Badge variant={variants[severity] || "outline"}>{labels[severity] || severity}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      online: "default",
      offline: "destructive",
      maintenance: "secondary",
      warning: "outline",
    };
    const labels: Record<string, string> = {
      online: "在线",
      offline: "离线",
      maintenance: "维护中",
      warning: "预警",
    };
    return <Badge variant={variants[status] || "outline"}>{labels[status] || status}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-CN", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <div className="text-lg text-slate-600">加载中...</div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">设备监控仪表盘</h1>
          <p className="mt-2 text-slate-600">实时监控设备健康状态，预测性维护管理</p>
        </div>

        {/* Stats Cards */}
        <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">设备总数</CardTitle>
              <Activity className="h-5 w-5 text-slate-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.total}</div>
              <p className="mt-1 text-sm text-slate-600">SIPLACE SX2 贴片机</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">在线设备</CardTitle>
              <CheckCircle className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.online}</div>
              <p className="mt-1 text-sm text-slate-600">
                占比 {stats.total > 0 ? ((stats.online / stats.total) * 100).toFixed(0) : 0}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">活跃预警</CardTitle>
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{stats.criticalAlerts}</div>
              <p className="mt-1 text-sm text-slate-600">需立即处理</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">待处理工单</CardTitle>
              <Wrench className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.pendingOrders}</div>
              <p className="mt-1 text-sm text-slate-600">等待分配</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Device List */}
          <Card>
            <CardHeader>
              <CardTitle>设备健康状态</CardTitle>
              <CardDescription>所有设备的实时健康度评分</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>设备编号</TableHead>
                    <TableHead>设备名称</TableHead>
                    <TableHead>健康度</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>位置</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {devices.slice(0, 5).map((device) => (
                    <TableRow key={device.id}>
                      <TableCell className="font-medium">{device.device_code}</TableCell>
                      <TableCell>{device.device_name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-24 rounded-full bg-slate-200">
                            <div
                              className={`h-2 rounded-full ${getHealthScoreBg(device.health_score)}`}
                              style={{ width: `${device.health_score}%` }}
                            />
                          </div>
                          <span className={`text-sm font-medium ${getHealthScoreColor(device.health_score)}`}>
                            {device.health_score.toFixed(0)}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(device.status)}</TableCell>
                      <TableCell className="text-slate-600">{device.location || "-"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {devices.length === 0 && (
                <div className="py-8 text-center text-slate-500">暂无设备数据</div>
              )}
            </CardContent>
          </Card>

          {/* Active Alerts */}
          <Card>
            <CardHeader>
              <CardTitle>最新预警</CardTitle>
              <CardDescription>AI预测模型识别的潜在故障</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {alerts.slice(0, 4).map((alert) => (
                  <div
                    key={alert.id}
                    className="rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-orange-500" />
                          <span className="font-medium">{alert.alert_type}</span>
                          {getSeverityBadge(alert.severity)}
                        </div>
                        <p className="mt-1 text-sm text-slate-600 line-clamp-2">
                          {alert.ai_explanation || "等待AI生成解释..."}
                        </p>
                        <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                          <span>概率: {(alert.probability * 100).toFixed(1)}%</span>
                          <span>{formatDate(alert.created_at)}</span>
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        查看
                      </Button>
                    </div>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <div className="py-8 text-center text-slate-500">暂无预警信息</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Work Orders */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>待处理工单</CardTitle>
            <CardDescription>需要分配和处理的维护工单</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>工单编号</TableHead>
                  <TableHead>标题</TableHead>
                  <TableHead>优先级</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {workOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell>{order.title}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          order.priority === "urgent"
                            ? "destructive"
                            : order.priority === "high"
                            ? "default"
                            : "secondary"
                        }
                      >
                        {order.priority}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{order.status}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(order.created_at)}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm">
                        详情
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {workOrders.length === 0 && (
              <div className="py-8 text-center text-slate-500">暂无待处理工单</div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
