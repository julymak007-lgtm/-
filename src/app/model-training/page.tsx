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
import { Label } from "@/components/ui/label";
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
import {
  AlertCircle,
  Brain,
  Play,
  CheckCircle2,
  Clock,
  Database,
  BarChart3,
  TrendingUp,
  Target,
  Zap,
} from "lucide-react";

interface ModelTraining {
  id: string;
  model_name: string;
  model_type: string;
  target_label_type: string;
  status: string;
  version: number;
  is_deployed: boolean;
  created_at: string;
  started_at: string;
  completed_at: string;
  deployed_at: string;
  train_sample_count: number;
  val_sample_count: number;
  test_sample_count: number;
  fault_sample_count: number;
  normal_sample_count: number;
  evaluation_metrics: Record<string, number>;
  error_message: string;
}

export default function ModelTrainingPage() {
  const [trainings, setTrainings] = useState<ModelTraining[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTraining, setSelectedTraining] = useState<ModelTraining | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [createForm, setCreateForm] = useState({
    modelType: "lstm",
    targetLabelType: "nozzle_clog",
    createdBy: "系统管理员",
  });

  useEffect(() => {
    fetchTrainings();
  }, []);

  const fetchTrainings = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/model-trainings");
      const data = await res.json();
      setTrainings(data.data || []);
    } catch (error) {
      console.error("Failed to fetch trainings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTraining = async () => {
    try {
      await fetch("/api/model-trainings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      setShowCreateDialog(false);
      fetchTrainings();
    } catch (error) {
      console.error("Failed to create training:", error);
    }
  };

  const handleDeploy = async (id: string) => {
    try {
      await fetch(`/api/model-trainings/${id}/deploy`, {
        method: "POST",
      });
      fetchTrainings();
    } catch (error) {
      console.error("Failed to deploy model:", error);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      training: "default",
      completed: "default",
      failed: "destructive",
    };
    const labels: Record<string, string> = {
      pending: "等待中",
      training: "训练中",
      completed: "已完成",
      failed: "失败",
    };
    const icons: Record<string, React.ReactNode> = {
      pending: <Clock className="mr-1 h-3 w-3" />,
      training: <Zap className="mr-1 h-3 w-3 animate-pulse" />,
      completed: <CheckCircle2 className="mr-1 h-3 w-3" />,
      failed: <AlertCircle className="mr-1 h-3 w-3" />,
    };
    return (
      <Badge variant={variants[status] || "outline"} className="flex items-center">
        {icons[status]}
        {labels[status] || status}
      </Badge>
    );
  };

  const getModelTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      lstm: "default",
      survival: "secondary",
      rule_engine: "outline",
    };
    const labels: Record<string, string> = {
      lstm: "LSTM",
      survival: "生存分析",
      rule_engine: "规则引擎",
    };
    return <Badge variant={variants[type] || "outline"}>{labels[type] || type}</Badge>;
  };

  const getLabelTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      nozzle_clog: "吸嘴堵塞",
      pressure_failure: "气压故障",
      feeder_jam: "送料器卡料",
    };
    return labels[type] || type;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleString("zh-CN");
  };

  const formatMetric = (value: number | undefined) => {
    if (value === undefined) return "-";
    return (value * 100).toFixed(1) + "%";
  };

  const deployedModels = trainings.filter((t) => t.is_deployed);
  const pendingTrainings = trainings.filter((t) => t.status === "pending" || t.status === "training");

  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">模型训练</h1>
            <p className="mt-2 text-slate-600">LSTM、生存分析等预测模型的训练与部署</p>
          </div>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Play className="mr-2 h-4 w-4" />
                开始训练
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>创建训练任务</DialogTitle>
                <DialogDescription>
                  配置模型参数并开始训练
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">模型类型</label>
                  <Select
                    value={createForm.modelType}
                    onValueChange={(v) => setCreateForm({ ...createForm, modelType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lstm">LSTM 深度学习模型</SelectItem>
                      <SelectItem value="survival">生存分析模型</SelectItem>
                      <SelectItem value="rule_engine">规则引擎</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">预测目标</label>
                  <Select
                    value={createForm.targetLabelType}
                    onValueChange={(v) => setCreateForm({ ...createForm, targetLabelType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nozzle_clog">吸嘴堵塞</SelectItem>
                      <SelectItem value="pressure_failure">气压故障</SelectItem>
                      <SelectItem value="feeder_jam">送料器卡料</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  取消
                </Button>
                <Button onClick={handleCreateTraining}>开始训练</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Overview Cards */}
        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-500" />
                <p className="text-sm text-slate-600">总训练任务</p>
              </div>
              <p className="mt-2 text-2xl font-bold">{trainings.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                <p className="text-sm text-slate-600">训练中</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-yellow-600">
                {pendingTrainings.length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <p className="text-sm text-slate-600">已完成</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-green-600">
                {trainings.filter((t) => t.status === "completed").length}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-500" />
                <p className="text-sm text-slate-600">已部署</p>
              </div>
              <p className="mt-2 text-2xl font-bold text-purple-600">
                {deployedModels.length}
              </p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">全部任务</TabsTrigger>
            <TabsTrigger value="deployed">已部署</TabsTrigger>
            <TabsTrigger value="running">运行中</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {loading ? (
              <Card>
                <CardContent className="py-12 text-center text-slate-600">
                  加载中...
                </CardContent>
              </Card>
            ) : trainings.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center text-slate-500">
                  <Brain className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                  <p>暂无训练任务</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setShowCreateDialog(true)}
                  >
                    创建第一个训练
                  </Button>
                </CardContent>
              </Card>
            ) : (
              trainings.map((training) => (
                <Card
                  key={training.id}
                  className="cursor-pointer transition-colors hover:bg-slate-50"
                  onClick={() => setSelectedTraining(training)}
                >
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          {training.is_deployed && (
                            <Badge variant="default" className="bg-purple-600">
                              <Target className="mr-1 h-3 w-3" />
                              已部署
                            </Badge>
                          )}
                          {getModelTypeBadge(training.model_type)}
                          {getStatusBadge(training.status)}
                        </div>
                        <h3 className="mt-2 font-semibold">{training.model_name}</h3>
                        <p className="text-sm text-slate-600">
                          预测: {getLabelTypeLabel(training.target_label_type)} · 
                          版本 v{training.version}
                        </p>
                        {training.status === "completed" && training.evaluation_metrics && (
                          <div className="mt-2 flex gap-4 text-xs text-slate-600">
                            <span>精确率: {formatMetric(training.evaluation_metrics.precision)}</span>
                            <span>召回率: {formatMetric(training.evaluation_metrics.recall)}</span>
                            <span>F1: {formatMetric(training.evaluation_metrics.f1)}</span>
                          </div>
                        )}
                        {training.train_sample_count !== undefined && (
                          <p className="mt-1 text-xs text-slate-500">
                            训练样本: {training.train_sample_count} · 
                            故障: {training.fault_sample_count} · 
                            正常: {training.normal_sample_count}
                          </p>
                        )}
                        <p className="mt-1 text-xs text-slate-400">
                          创建: {formatDate(training.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {training.status === "completed" && !training.is_deployed && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeploy(training.id);
                            }}
                          >
                            部署
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="deployed">
            <div className="space-y-4">
              {deployedModels.map((training) => (
                <Card key={training.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="bg-purple-600">
                            <Target className="mr-1 h-3 w-3" />
                            已部署
                          </Badge>
                          {getModelTypeBadge(training.model_type)}
                        </div>
                        <h3 className="mt-2 font-semibold">{training.model_name}</h3>
                        <p className="text-sm text-slate-600">
                          预测: {getLabelTypeLabel(training.target_label_type)}
                        </p>
                        {training.evaluation_metrics && (
                          <div className="mt-2 flex gap-4 text-xs">
                            <span className="text-green-600">
                              <TrendingUp className="inline h-3 w-3 mr-1" />
                              精确率: {formatMetric(training.evaluation_metrics.precision)}
                            </span>
                            <span className="text-blue-600">
                              <BarChart3 className="inline h-3 w-3 mr-1" />
                              召回率: {formatMetric(training.evaluation_metrics.recall)}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-slate-400">
                          部署时间: {formatDate(training.deployed_at)}
                        </p>
                        <p className="text-xs text-slate-400">
                          版本 v{training.version}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {deployedModels.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center text-slate-500">
                    暂无已部署的模型
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="running">
            <div className="space-y-4">
              {pendingTrainings.map((training) => (
                <Card key={training.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <div className="animate-pulse">
                        <Zap className="h-8 w-8 text-yellow-500" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {getModelTypeBadge(training.model_type)}
                          {getStatusBadge(training.status)}
                        </div>
                        <h3 className="mt-2 font-semibold">{training.model_name}</h3>
                        <p className="text-sm text-slate-600">
                          开始时间: {formatDate(training.started_at)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {pendingTrainings.length === 0 && (
                <Card>
                  <CardContent className="py-12 text-center text-slate-500">
                    暂无正在运行的训练任务
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Detail Dialog */}
        <Dialog open={!!selectedTraining} onOpenChange={() => setSelectedTraining(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>训练任务详情</DialogTitle>
              <DialogDescription>
                {selectedTraining?.model_name}
              </DialogDescription>
            </DialogHeader>
            {selectedTraining && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {selectedTraining.is_deployed && (
                    <Badge variant="default" className="bg-purple-600">已部署</Badge>
                  )}
                  {getModelTypeBadge(selectedTraining.model_type)}
                  {getStatusBadge(selectedTraining.status)}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <Label>目标标签</Label>
                    <p className="mt-1 font-medium">
                      {getLabelTypeLabel(selectedTraining.target_label_type)}
                    </p>
                  </div>
                  <div>
                    <Label>版本</Label>
                    <p className="mt-1 font-medium">v{selectedTraining.version}</p>
                  </div>
                </div>

                {selectedTraining.status === "completed" && selectedTraining.evaluation_metrics && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">评估指标</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-sm text-slate-600">精确率 (Precision)</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatMetric(selectedTraining.evaluation_metrics.precision)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">召回率 (Recall)</p>
                        <p className="text-2xl font-bold text-blue-600">
                          {formatMetric(selectedTraining.evaluation_metrics.recall)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">F1 值</p>
                        <p className="text-2xl font-bold text-purple-600">
                          {formatMetric(selectedTraining.evaluation_metrics.f1)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">准确率</p>
                        <p className="text-2xl font-bold text-orange-600">
                          {formatMetric(selectedTraining.evaluation_metrics.accuracy)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {selectedTraining.train_sample_count !== undefined && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">数据集统计</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-3">
                      <div>
                        <p className="text-sm text-slate-600">训练集</p>
                        <p className="text-xl font-bold">{selectedTraining.train_sample_count}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">验证集</p>
                        <p className="text-xl font-bold">{selectedTraining.val_sample_count}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">测试集</p>
                        <p className="text-xl font-bold">{selectedTraining.test_sample_count}</p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">故障样本</p>
                        <p className="text-xl font-bold text-red-600">
                          {selectedTraining.fault_sample_count}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-600">正常样本</p>
                        <p className="text-xl font-bold text-green-600">
                          {selectedTraining.normal_sample_count}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="grid gap-4 md:grid-cols-2 text-sm text-slate-600">
                  <div>
                    <p>创建时间</p>
                    <p className="font-medium">{formatDate(selectedTraining.created_at)}</p>
                  </div>
                  {selectedTraining.started_at && (
                    <div>
                      <p>开始时间</p>
                      <p className="font-medium">{formatDate(selectedTraining.started_at)}</p>
                    </div>
                  )}
                  {selectedTraining.completed_at && (
                    <div>
                      <p>完成时间</p>
                      <p className="font-medium">{formatDate(selectedTraining.completed_at)}</p>
                    </div>
                  )}
                </div>

                {selectedTraining.status === "failed" && selectedTraining.error_message && (
                  <div className="rounded-lg bg-red-50 p-4">
                    <p className="text-sm font-medium text-red-800">错误信息</p>
                    <p className="mt-1 text-sm text-red-600">{selectedTraining.error_message}</p>
                  </div>
                )}

                {selectedTraining.status === "completed" && !selectedTraining.is_deployed && (
                  <DialogFooter>
                    <Button onClick={() => handleDeploy(selectedTraining.id)}>
                      部署此模型
                    </Button>
                  </DialogFooter>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
