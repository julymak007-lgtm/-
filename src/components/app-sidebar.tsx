"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Monitor,
  AlertTriangle,
  ClipboardList,
  MessageSquare,
  BookOpen,
  Settings,
  Activity,
  Database,
  Brain,
} from "lucide-react";

const navigation = [
  { name: "设备仪表盘", href: "/", icon: Monitor },
  { name: "预警管理", href: "/alerts", icon: AlertTriangle },
  { name: "工单管理", href: "/work-orders", icon: ClipboardList },
  { name: "智能助手", href: "/assistant", icon: MessageSquare },
  { name: "知识库", href: "/knowledge", icon: BookOpen },
  { name: "数据管理", href: "/data-management", icon: Database },
  { name: "模型训练", href: "/model-training", icon: Brain },
  { name: "系统设置", href: "/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col bg-slate-900 text-white">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-slate-700 px-6">
        <Activity className="h-8 w-8 text-blue-400" />
        <div>
          <h1 className="text-lg font-bold">EHPMS</h1>
          <p className="text-xs text-slate-400">设备健康预测系统</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-700 p-4">
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <div className="h-2 w-2 rounded-full bg-green-400"></div>
          <span>系统运行正常</span>
        </div>
      </div>
    </div>
  );
}
