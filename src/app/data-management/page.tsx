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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Database,
  Upload,
  Plus,
  Edit,
  Trash2,
  Filter,
  ChevronRight,
  Calendar,
} from "lucide-react";

interface LabeledData {
  id: string;
  device_id: string;
  start_time: string;
  end_time: string;
  label_type: string;
  is_fault: boolean;
  fault_severity: string;
  fault_time: string;
  labeled_by: string;
  label_confidence: number;
  notes: string;
  train_split: string;
  is_used_for_training: boolean;
  created_at: string;
}

interface Device {
  id: string;
  device_code: string;
  device_name: string;
}

export default function DataManagementPage() {
  const [labeledData, setLabeledData] = useState<LabeledData[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedData, setSelectedData] = useState<LabeledData | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filters, setFilters] = useState({
    labelType: "all",
    isFault: "all",
    trainSplit: "all",
  });

  useEffect(() => {
    fetchData();
  }, [filters]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.labelType !== "all") params.append("label_type", filters.labelType);
      if (filters.isFault !== "all") params.append("is_fault", filters.isFault);
      if (filters.trainSplit !== "all") params.append("train_split", filters.trainSplit);

      const [dataRes, devicesRes] = await Promise.all([
        fetch(`/api/labeled-data?${params}`),
        fetch("/api/devices"),
      ]);

      const dataData = await dataRes.json();
      const devicesData = await devicesRes.json();

      setLabeledData(dataData.data || []);
      setDevices(devicesData.data || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这条标注数据吗？")) return;
    
    try {
      await fetch(`/api/labeled-data/${id}`, { method: "DELETE" });
      fetchData();
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  const getLabelTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      nozzle_clog: "destructive",
      pressure_failure: "default",
      feeder_jam: "secondary",
      normal_operation: "outline",
    };
    const labels: Record<string, string> = {
      nozzle_clog: "吸嘴堵塞",
      pressure_failure: "气压故障",
      feeder_jam: "送料器卡料",
      normal_operation: "正常运行",
    };
    return <Badge variant={variants[type] || "outline"}>{labels[type] || type}</Badge>;
  };

  const getTrainSplitBadge = (split: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      train: "default",
      val: "secondary",
      test: "outline",
    };
    const labels: Record<string, string> = {
      train: "训练集",
      val: "验证集",
      test: "测试集",
    };
    return <Badge variant={variants[split] || "outline"}>{labels[split] || split}</Badge>;
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
            <h1 className="text-3xl font-bold text-slate-900">数据管理</h1>
            <p className="mt-2 text-slate-600">标注数据的采集、标注和管理</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Upload className="mr-2 h-4 w-4" />
              导入数据
            </Button>
            <Button onClick={() => setShowCreateDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              创建标注
            </Button>
          </div>
        </div>

        <Tabs defaultValue="labeled" className="space-y-6">
          <TabsList>
            <TabsTrigger value="labeled">标注数据</TabsTrigger>
            <TabsTrigger value="raw">原始数据</TabsTrigger>
            <TabsTrigger value="statistics">数据统计</TabsTrigger>
          </TabsList>

          <TabsContent value="labeled" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardContent className="flex flex-wrap items-center gap-4 pt-6">
                <Filter className="h-5 w-5 text-slate-400" />
                <Select
                  value={filters.labelType}
                  onValueChange={(v) => setFilters({ ...filters, labelType: v })}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="标签类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部类型</SelectItem>
                    <SelectItem value="nozzle_clog">吸嘴堵塞</SelectItem>
                    <SelectItem value="pressure_failure">气压故障</SelectItem>
                    <SelectItem value="feeder_jam">送料器卡料</SelectItem>
                    <SelectItem value="normal_operation">正常运行</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.isFault}
                  onValueChange={(v) => setFilters({ ...filters, isFault: v })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="故障状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="true">故障</SelectItem>
                    <SelectItem value="false">正常</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={filters.trainSplit}
                  onValueChange={(v) => setFilters({ ...filters, trainSplit: v })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="数据集" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">全部</SelectItem>
                    <SelectItem value="train">训练集</SelectItem>
                    <SelectItem value="val">验证集</SelectItem>
                    <SelectItem value="test">测试集</SelectItem>
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-600">总样本数</p>
                  <p className="text-2xl font-bold">{labeledData.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-600">故障样本</p>
                  <p className="text-2xl font-bold text-red-600">
                    {labeledData.filter((d) => d.is_fault).length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-600">正常样本</p>
                  <p className="text-2xl font-bold text-green-600">
                    {labeledData.filter((d) => !d.is_fault).length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-slate-600">用于训练</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {labeledData.filter((d) => d.is_used_for_training).length}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Data List */}
            {loading ? (
              <Card>
                <CardContent className="py-12 text-center text-slate-600">
                  加载中...
                </CardContent>
              </Card>
            ) : labeledData.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-slate-500">
                  <Database className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                  <p>暂无标注数据</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setShowCreateDialog(true)}
                  >
                    创建第一条标注
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {labeledData.map((item) => (
                  <Card
                    key={item.id}
                    className="cursor-pointer transition-colors hover:bg-slate-50"
                    onClick={() => setSelectedData(item)}
                  >
                    <CardContent className="flex items-center justify-between py-4">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            {getLabelTypeBadge(item.label_type)}
                            {item.is_fault && (
                              <Badge variant="destructive">故障</Badge>
                            )}
                            {getTrainSplitBadge(item.train_split)}
                            {!item.is_used_for_training && (
                              <Badge variant="outline">未启用</Badge>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-slate-600">
                            {formatDate(item.start_time)} - {formatDate(item.end_time)}
                          </p>
                          {item.notes && (
                            <p className="mt-1 text-sm text-slate-500 line-clamp-1">
                              {item.notes}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(item.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                        <ChevronRight className="h-5 w-5 text-slate-400" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="raw">
            <Card>
              <CardHeader>
                <CardTitle>原始数据管理</CardTitle>
                <CardDescription>查看和导出设备采集的原始参数数据</CardDescription>
              </CardHeader>
              <CardContent className="py-12 text-center text-slate-500">
                <p>原始数据管理功能开发中...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="statistics">
            <Card>
              <CardHeader>
                <CardTitle>数据统计分析</CardTitle>
                <CardDescription>标签分布、时间窗口分析等</CardDescription>
              </CardHeader>
              <CardContent className="py-12 text-center text-slate-500">
                <p>数据统计分析功能开发中...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Detail Dialog */}
        <Dialog open={!!selectedData} onOpenChange={() => setSelectedData(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>标注数据详情</DialogTitle>
              <DialogDescription>
                {selectedData && formatDate(selectedData.created_at)}
              </DialogDescription>
            </DialogHeader>
            {selectedData && (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>标签类型</Label>
                    <div className="mt-1">{getLabelTypeBadge(selectedData.label_type)}</div>
                  </div>
                  <div>
                    <Label>数据集</Label>
                    <div className="mt-1">{getTrainSplitBadge(selectedData.train_split)}</div>
                  </div>
                  <div>
                    <Label>故障状态</Label>
                    <p className="mt-1 font-medium">
                      {selectedData.is_fault ? "是" : "否"}
                    </p>
                  </div>
                  <div>
                    <Label>用于训练</Label>
                    <p className="mt-1 font-medium">
                      {selectedData.is_used_for_training ? "是" : "否"}
                    </p>
                  </div>
                  {selectedData.label_confidence && (
                    <div>
                      <Label>标注置信度</Label>
                      <p className="mt-1 font-medium">
                        {(selectedData.label_confidence * 100).toFixed(0)}%
                      </p>
                    </div>
                  )}
                  {selectedData.labeled_by && (
                    <div>
                      <Label>标注人</Label>
                      <p className="mt-1 font-medium">{selectedData.labeled_by}</p>
                    </div>
                  )}
                </div>
                <div>
                  <Label>时间窗口</Label>
                  <p className="mt-1 text-sm">
                    开始: {formatDate(selectedData.start_time)}
                  </p>
                  <p className="text-sm">结束: {formatDate(selectedData.end_time)}</p>
                </div>
                {selectedData.notes && (
                  <div>
                    <Label>备注</Label>
                    <p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">
                      {selectedData.notes}
                    </p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Create Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>创建标注数据</DialogTitle>
              <DialogDescription>
                选择时间窗口并标注数据
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <p className="py-8 text-center text-slate-500">
                标注数据创建功能开发中...
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
