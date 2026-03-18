import { NextRequest, NextResponse } from "next/server";
import { LLMClient, Config, HeaderUtils } from "coze-coding-dev-sdk";

// AI解释预测结果接口
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { alert_type, probability, key_evidence, device_code } = body;

    if (!alert_type || probability === undefined) {
      return NextResponse.json(
        { error: "alert_type and probability are required" },
        { status: 400 }
      );
    }

    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    const prompt = `以下是SIPLACE SX2设备的一次故障预测分析。请用工程师能理解的语言，解释为什么系统认为存在风险，并给出建议。

预测结果：
- 设备：${device_code || '未知设备'}
- 故障类型：${alert_type}
- 故障概率：${(probability * 100).toFixed(1)}%

关键证据：
${JSON.stringify(key_evidence, null, 2)}

请生成一段简短的解释（100-150字），包含：
1. 触发预警的核心数据依据
2. 为什么这些数据表明存在风险
3. 建议优先检查的方向`;

    const messages = [{ role: "user" as const, content: prompt }];

    const response = await client.invoke(messages, {
      model: "doubao-seed-1-8-251228",
      temperature: 0.5,
    });

    return NextResponse.json({
      data: {
        explanation: response.content,
      },
    });
  } catch (error) {
    console.error("Explain prediction error:", error);
    return NextResponse.json(
      { error: "Failed to explain prediction" },
      { status: 500 }
    );
  }
}
