import { NextRequest, NextResponse } from "next/server";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// AI生成工单接口
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { alert_id, device_id } = body;

    if (!alert_id && !device_id) {
      return NextResponse.json(
        { error: "alert_id or device_id is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseClient();

    // 获取预警信息
    let alert = null;
    if (alert_id) {
      const { data } = await supabase
        .from("alerts")
        .select("*")
        .eq("id", alert_id)
        .single();
      alert = data;
    }

    // 获取设备信息
    const { data: device } = await supabase
      .from("devices")
      .select("*")
      .eq("id", device_id || alert?.device_id)
      .single();

    if (!device) {
      return NextResponse.json({ error: "Device not found" }, { status: 404 });
    }

    // 构建提示词
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const prompt = `你是一名专业的SMT设备维护工程师。请根据以下预警信息，生成一份详细的预防性维护工单。

设备信息：
- 设备编号：${device.device_code}
- 设备名称：${device.device_name}
- 设备型号：${device.device_type}
- 当前健康度：${device.health_score}%

${alert ? `预警信息：
- 预警类型：${alert.alert_type}
- 严重程度：${alert.severity}
- 故障概率：${(alert.probability * 100).toFixed(1)}%
- 预测模型：${alert.model_type}
- 关键证据：${JSON.stringify(alert.key_evidence, null, 2)}
- 预测说明：${alert.ai_explanation || '无'}` : '无具体预警，请根据设备状态生成例行检查工单'}

请生成一份结构化的维护工单，包含以下内容：
1. 故障现象描述（简洁明了）
2. 可能原因分析（至少3条，按可能性排序）
3. 逐步排查建议（详细的操作步骤）
4. 所需工具与备件（具体型号和数量）
5. 安全注意事项（必须遵守的安全规范）

请以JSON格式返回，结构如下：
{
  "title": "工单标题",
  "description": "故障现象描述",
  "fault_analysis": "可能原因分析",
  "inspection_steps": ["步骤1", "步骤2", ...],
  "required_parts": [{"name": "备件名", "model": "型号", "quantity": 数量}, ...],
  "safety_notes": "安全注意事项"
}`;

    const messages = [{ role: "user" as const, content: prompt }];

    const response = await client.invoke(messages, {
      model: "doubao-seed-1-8-251228",
      temperature: 0.3,
    });

    // 解析AI返回的JSON
    let workOrderData;
    try {
      // 尝试提取JSON部分
      const jsonMatch = response.content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        workOrderData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch {
      // 如果解析失败，使用原始内容作为描述
      workOrderData = {
        title: `${device.device_name} - ${alert?.alert_type || '预防性维护'}`,
        description: response.content,
        fault_analysis: "",
        inspection_steps: [],
        required_parts: [],
        safety_notes: "",
      };
    }

    return NextResponse.json({
      data: {
        ...workOrderData,
        device_id: device.id,
        alert_id: alert?.id,
        priority: alert?.severity === "critical" ? "urgent" : 
                 alert?.severity === "high" ? "high" : "medium",
      },
    });
  } catch (error) {
    console.error("Generate work order error:", error);
    return NextResponse.json(
      { error: "Failed to generate work order" },
      { status: 500 }
    );
  }
}
