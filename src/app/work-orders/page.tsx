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
import { ClipboardList, Filter, Plus, Loader2 } from "lucide-react";

interface WorkOrder {
  id: string;
  order_number: string;
  title: string;
  description: string;
  fault_analysis: string;
  inspection_steps: string[];
  required_parts: Array<{ name: string; model: string; quantity: number }>;
  safety_notes: string;
  priority: string;
  status: string;
  assigned_to: string;
  created_at: string;
  device_id: string;
}

export default function WorkOrdersPage() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<WorkOrder | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchWorkOrders();
  }, [statusFilter]);

  const fetchWorkOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.append("status", statusFilter);

      const res = await fetch(`/api/work-orders?${params}`);
      const data = await res.json();
      setWorkOrders(data.data || []);
    } catch (error) {
      console.error("Failed to fetch work orders:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateWorkOrder = async () => {
    try {
      setGenerating(true);
      // 这里应该选择一个设备ID，暂时使用模拟数据
      const res = await fetch("/api/llm/generate-work-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          device_id: workOrders[0]?.device_id || "demo-device-id",
        }),
      });
      
      if (res.ok) {
        fetchWorkOrders();
      }
    } catch (error) {
      console.error("Failed to generate work order:", error);
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      await fetch(`/api/work-orders/${orderId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchWorkOrders();
    } catch (error) {
      console.error("Failed to update work order:", error);
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, "destructive" | "default" | "secondary" | "outline"> = {
      urgent: "destructive",
      high: "default",
      medium: "secondary",
      low: "outline",
    };
    const labels: Record<string, string> = {
      urgent: "紧急",
      high: "高",
      medium: "中",
      low: "低",
    };
    return <Badge variant={variants[priority] || "outline"}>{labels[priority] || priority}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      assigned: "default",
      in_progress: "default",
      completed: "outline",
      cancelled: "destructive",
    };
    const labels: Record<string, string> = {
      pending: "待处理",
      assigned: "已分配",
      in_progress: "进行中",
      completed: "已完成",
      cancelled: "已取消",
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">工单管理</h1>
            <p className="mt-2 text-slate-600">设备维护工单的创建、分配与跟踪</p>
          </div>
          <Button onClick={handleGenerateWorkOrder} disabled={generating}>
            {generating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            AI生成工单
          </Button>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="flex items-center gap-4 pt-6">
            <Filter className="h-5 w-5 text-slate-400" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="状态" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部状态</SelectItem>
                <SelectItem value="pending">待处理</SelectItem>
                <SelectItem value="assigned">已分配</SelectItem>
                <SelectItem value="in_progress">进行中</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Work Order List */}
        <div className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-600">
                加载中...
              </CardContent>
            </Card>
          ) : workOrders.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-500">
                暂无工单数据
              </CardContent>
            </Card>
          ) : (
            workOrders.map((order) => (
              <Card
                key={order.id}
                className="cursor-pointer transition-colors hover:bg-slate-50"
                onClick={() => setSelectedOrder(order)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <ClipboardList className="h-5 w-5 text-blue-500" />
                        <CardTitle className="text-lg">{order.title}</CardTitle>
                      </div>
                      <CardDescription className="mt-1">
                        {order.order_number} · {formatDate(order.created_at)}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(order.priority)}
                      {getStatusBadge(order.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 line-clamp-2">
                    {order.description || "无描述"}
                  </p>
                  {order.assigned_to && (
                    <div className="mt-2 text-sm text-slate-500">
                      分配给: {order.assigned_to}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Detail Dialog */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedOrder?.title}</DialogTitle>
              <DialogDescription>
                {selectedOrder?.order_number}
              </DialogDescription>
            </DialogHeader>
            
            {selectedOrder && (
              <div className="space-y-4">
                {/* Description */}
                <div>
                  <h4 className="mb-2 font-medium">故障描述</h4>
                  <p className="text-sm text-slate-600">
                    {selectedOrder.description}
                  </p>
                </div>

                {/* Fault Analysis */}
                {selectedOrder.fault_analysis && (
                  <div>
                    <h4 className="mb-2 font-medium">原因分析</h4>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">
                      {selectedOrder.fault_analysis}
                    </p>
                  </div>
                )}

                {/* Inspection Steps */}
                {selectedOrder.inspection_steps && selectedOrder.inspection_steps.length > 0 && (
                  <div>
                    <h4 className="mb-2 font-medium">排查步骤</h4>
                    <ol className="list-inside list-decimal space-y-1 text-sm text-slate-600">
                      {selectedOrder.inspection_steps.map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Required Parts */}
                {selectedOrder.required_parts && selectedOrder.required_parts.length > 0 && (
                  <div>
                    <h4 className="mb-2 font-medium">所需备件</h4>
                    <div className="space-y-1 text-sm">
                      {selectedOrder.required_parts.map((part, index) => (
                        <div key={index} className="flex justify-between text-slate-600">
                          <span>{part.name} ({part.model})</span>
                          <span>数量: {part.quantity}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Safety Notes */}
                {selectedOrder.safety_notes && (
                  <div className="rounded-lg bg-yellow-50 p-4">
                    <h4 className="mb-2 font-medium text-yellow-800">安全注意事项</h4>
                    <p className="text-sm text-yellow-700 whitespace-pre-wrap">
                      {selectedOrder.safety_notes}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  {selectedOrder.status === "pending" && (
                    <Button onClick={() => handleUpdateStatus(selectedOrder.id, "assigned")}>
                      分配工单
                    </Button>
                  )}
                  {selectedOrder.status === "assigned" && (
                    <Button onClick={() => handleUpdateStatus(selectedOrder.id, "in_progress")}>
                      开始处理
                    </Button>
                  )}
                  {selectedOrder.status === "in_progress" && (
                    <Button onClick={() => handleUpdateStatus(selectedOrder.id, "completed")}>
                      完成工单
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
