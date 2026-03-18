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
import { Input } from "@/components/ui/input";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { BookOpen, Search, Eye } from "lucide-react";

interface Knowledge {
  id: string;
  title: string;
  category: string;
  device_type: string;
  content: string;
  keywords: string[];
  source: string;
  view_count: number;
  created_at: string;
}

export default function KnowledgePage() {
  const [knowledge, setKnowledge] = useState<Knowledge[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [selectedKnowledge, setSelectedKnowledge] = useState<Knowledge | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    fetchKnowledge();
  }, [categoryFilter]);

  const fetchKnowledge = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (categoryFilter !== "all") params.append("category", categoryFilter);
      if (searchKeyword) params.append("keyword", searchKeyword);

      const res = await fetch(`/api/knowledge?${params}`);
      const data = await res.json();
      setKnowledge(data.data || []);
    } catch (error) {
      console.error("Failed to fetch knowledge:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    fetchKnowledge();
  };

  const handleSelectKnowledge = async (item: Knowledge) => {
    setLoadingDetail(true);
    try {
      const res = await fetch(`/api/knowledge/${item.id}`);
      const data = await res.json();
      setSelectedKnowledge(data.data);
    } catch (error) {
      console.error("Failed to fetch knowledge detail:", error);
      setSelectedKnowledge(item);
    } finally {
      setLoadingDetail(false);
    }
  };

  const getCategoryBadge = (category: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      manual: "default",
      case: "secondary",
      faq: "outline",
      sop: "default",
    };
    const labels: Record<string, string> = {
      manual: "设备手册",
      case: "故障案例",
      faq: "常见问题",
      sop: "操作规范",
    };
    return <Badge variant={variants[category] || "outline"}>{labels[category] || category}</Badge>;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("zh-CN");
  };

  return (
    <AppLayout>
      <div className="p-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">知识库</h1>
          <p className="mt-2 text-slate-600">设备手册、维修案例与操作规范</p>
        </div>

        {/* Search and Filter */}
        <Card className="mb-6">
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                className="pl-10"
                placeholder="搜索知识库..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="分类" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部分类</SelectItem>
                <SelectItem value="manual">设备手册</SelectItem>
                <SelectItem value="case">故障案例</SelectItem>
                <SelectItem value="faq">常见问题</SelectItem>
                <SelectItem value="sop">操作规范</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch}>搜索</Button>
          </CardContent>
        </Card>

        {/* Knowledge List */}
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-600">
              加载中...
            </CardContent>
          </Card>
        ) : knowledge.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-slate-500">
              暂无知识库内容
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {knowledge.map((item) => (
              <Card
                key={item.id}
                className="cursor-pointer transition-all hover:shadow-md"
                onClick={() => handleSelectKnowledge(item)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <BookOpen className="h-5 w-5 text-blue-500" />
                    {getCategoryBadge(item.category)}
                  </div>
                  <CardTitle className="mt-2 line-clamp-2 text-lg">
                    {item.title}
                  </CardTitle>
                  <CardDescription>
                    {item.device_type || "通用"} · {formatDate(item.created_at)}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="mb-3 line-clamp-2 text-sm text-slate-600">
                    {item.content ? item.content.substring(0, 100) + "..." : "点击查看详情..."}
                  </p>
                  {item.keywords && item.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {item.keywords.slice(0, 3).map((keyword, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                    <Eye className="h-3 w-3" />
                    <span>{item.view_count || 0} 次浏览</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Detail Dialog */}
        <Dialog open={!!selectedKnowledge} onOpenChange={() => setSelectedKnowledge(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2">
                {selectedKnowledge && getCategoryBadge(selectedKnowledge.category)}
              </div>
              <DialogTitle className="text-xl">
                {selectedKnowledge?.title}
              </DialogTitle>
              <DialogDescription>
                {selectedKnowledge?.device_type || "通用"} · 
                {selectedKnowledge && formatDate(selectedKnowledge.created_at)}
              </DialogDescription>
            </DialogHeader>
            
            {selectedKnowledge && (
              <div className="space-y-4">
                {loadingDetail ? (
                  <div className="py-8 text-center text-slate-500">加载中...</div>
                ) : (
                  <>
                    {/* Keywords */}
                    {selectedKnowledge.keywords && selectedKnowledge.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedKnowledge.keywords.map((keyword, index) => (
                          <Badge key={index} variant="outline">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    )}

                    {/* Content */}
                    <div className="prose prose-sm max-w-none">
                      <p className="whitespace-pre-wrap text-slate-700">
                        {selectedKnowledge.content || "暂无内容"}
                      </p>
                    </div>

                    {/* Source */}
                    {selectedKnowledge.source && (
                      <div className="border-t pt-4 text-sm text-slate-500">
                        来源: {selectedKnowledge.source}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
