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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Filter, CheckCircle, XCircle } from "lucide-react";

interface Alert {
  id: string;
  device_id: string;
  alert_type: string;
  severity: string;
  status: string;
  probability: number;
  model_type: string;
  key_evidence: Record<string, unknown>;
  ai_explanation: string;
  created_at: string;
  acknowledged_by: string;
  resolution: string;
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [resolution, setResolution] = useState("");

  useEffect(() => {
    fetchAlerts();
  }, [severityFilter, statusFilter]);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (severityFilter !== "all") params.append("severity", severityFilter);
      if (statusFilter !== "all") params.append("status", statusFilter);

      const res = await fetch(`/api/alerts?${params}`);
      const data = await res.json();
      setAlerts(data.data || []);
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledge = async (alertId: string) => {
    try {
      await fetch(`/api/alerts/${alertId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "acknowledged",
          acknowledged_by: "工程师",
        }),
      });
      fetchAlerts();
    } catch (error) {
      console.error("Failed to acknowledge alert:", error);
    }
  };

  const handleResolve = async () => {
    if (!selectedAlert) return;
    
    try {
      await fetch(`/api/alerts/${selectedAlert.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "resolved",
          resolution: resolution,
        }),
      });
      setSelectedAlert(null);
      setResolution("");
      fetchAlerts();
    } catch (error) {
      console.error("Failed to resolve alert:", error);
    }
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
      active: "destructive",
      acknowledged: "default",
      resolved: "secondary",
      false_alarm: "outline",
    };
    const labels: Record<string, string> = {
      active: "活跃",
      acknowledged: "已确认",
      resolved: "已解决",
      false_alarm: "误报",
    };
    return <Badge variant={variants[status] || "outline"}>{labels[status] || status}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("zh-CN");
  };

  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">预警管理</h1>
          <p className="mt-2 text-slate-600">AI预测模型识别的设备故障预警</p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="flex items-center gap-4 pt-6">
            <Filter className="h-5 w-5 text-slate-400" />
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="严重程度" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部级别</SelectItem>
                <SelectItem value="critical">紧急</SelectItem>
                <SelectItem value="high">高</SelectItem>
                <SelectItem value="medium">中</SelectItem>
                <SelectItem value="low">低</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="active">活跃</SelectItem>
                <SelectItem value="acknowledged">已确认</SelectItem>
                <SelectItem value="resolved">已解决</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Alert List */}
        <div className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-600">
                加载中...
              </CardContent>
            </Card>
          ) : alerts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-500">
                暂无预警数据
              </CardContent>
            </Card>
          ) : (
            alerts.map((alert) => (
              <Card key={alert.id} className="overflow-hidden">
                <div className="flex">
                  {/* Severity Indicator */}
                  <div
                    className={`w-1 ${
                      alert.severity === "critical"
                        ? "bg-red-500"
                        : alert.severity === "high"
                        ? "bg-orange-500"
                        : alert.severity === "medium"
                        ? "bg-yellow-500"
                        : "bg-blue-500"
                    }`}
                  />

                  <div className="flex-1">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <AlertTriangle className="h-5 w-5 text-orange-500" />
                          <div>
                            <CardTitle className="text-lg">{alert.alert_type}</CardTitle>
                            <CardDescription>
                              {formatDate(alert.created_at)}
                            </CardDescription>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getSeverityBadge(alert.severity)}
                          {getStatusBadge(alert.status)}
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent>
                      <div className="grid gap-4 md:grid-cols-2">
                        {/* Left: Details */}
                        <div>
                          <h4 className="mb-2 font-medium">预测详情</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-600">故障概率:</span>
                              <span className="font-medium">
                                {(alert.probability * 100).toFixed(1)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">预测模型:</span>
                              <span className="font-medium">{alert.model_type}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-600">设备ID:</span>
                              <span className="font-medium">{alert.device_id}</span>
                            </div>
                          </div>
                        </div>

                        {/* Right: AI Explanation */}
                        <div>
                          <h4 className="mb-2 font-medium">AI分析说明</h4>
                          <p className="text-sm text-slate-600">
                            {alert.ai_explanation || "等待AI生成解释..."}
                          </p>
                        </div>
                      </div>

                      {/* Actions */}
                      {alert.status === "active" && (
                        <div className="mt-4 flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleAcknowledge(alert.id)}
                          >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            确认预警
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedAlert(alert)}
                          >
                            解决问题
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Resolve Dialog */}
        <Dialog open={!!selectedAlert} onOpenChange={() => setSelectedAlert(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>解决预警</DialogTitle>
              <DialogDescription>
                请输入解决方案以关闭此预警
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea
                placeholder="请描述采取的措施和解决方案..."
                value={resolution}
                onChange={(e) => setResolution(e.target.value)}
                rows={4}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedAlert(null)}>
                取消
              </Button>
              <Button onClick={handleResolve}>确认解决</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
