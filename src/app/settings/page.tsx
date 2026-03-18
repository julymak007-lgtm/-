"use client";

import { AppLayout } from "@/components/layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

export default function SettingsPage() {
  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">系统设置</h1>
          <p className="mt-2 text-slate-600">配置系统参数和功能选项</p>
        </div>

        <div className="space-y-6">
          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle>通知设置</CardTitle>
              <CardDescription>配置预警通知方式和接收规则</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>预警邮件通知</Label>
                  <p className="text-sm text-slate-500">接收重要预警的邮件提醒</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>企业微信通知</Label>
                  <p className="text-sm text-slate-500">通过企业微信推送预警消息</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>短信通知</Label>
                  <p className="text-sm text-slate-500">紧急预警发送短信通知</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          {/* Model Settings */}
          <Card>
            <CardHeader>
              <CardTitle>AI模型设置</CardTitle>
              <CardDescription>配置预测模型和LLM参数</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>预测模型阈值</Label>
                  <Input type="number" placeholder="0.75" defaultValue="0.75" />
                  <p className="text-xs text-slate-500">故障概率超过此值触发预警</p>
                </div>
                <div className="space-y-2">
                  <Label>数据采集频率</Label>
                  <Input type="number" placeholder="1" defaultValue="1" />
                  <p className="text-xs text-slate-500">Hz，每秒采集次数</p>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>LLM思考模式</Label>
                  <p className="text-sm text-slate-500">启用深度推理提升回答质量</p>
                </div>
                <Switch />
              </div>
            </CardContent>
          </Card>

          {/* System Info */}
          <Card>
            <CardHeader>
              <CardTitle>系统信息</CardTitle>
              <CardDescription>当前系统状态和版本信息</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <p className="text-sm text-slate-500">系统版本</p>
                  <p className="font-medium">V3.0</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-slate-500">目标设备</p>
                  <p className="font-medium">SIPLACE SX2 贴片机</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-slate-500">数据库状态</p>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <Badge variant="outline">正常</Badge>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-slate-500">AI服务状态</p>
                  <div className="flex items-center gap-2">
                    <div className="h-2 w-2 rounded-full bg-green-500"></div>
                    <Badge variant="outline">正常</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
