import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 初始化演示数据
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();

    // 1. 创建设备
    const devices = [
      {
        device_code: "SX2-01",
        device_name: "SIPLACE SX2 #1",
        device_type: "SIPLACE SX2",
        location: "产线A-01",
        status: "online",
        health_score: 92.5,
      },
      {
        device_code: "SX2-02",
        device_name: "SIPLACE SX2 #2",
        device_type: "SIPLACE SX2",
        location: "产线A-02",
        status: "warning",
        health_score: 68.3,
      },
      {
        device_code: "SX2-03",
        device_name: "SIPLACE SX2 #3",
        device_type: "SIPLACE SX2",
        location: "产线B-01",
        status: "online",
        health_score: 88.7,
      },
      {
        device_code: "SX2-04",
        device_name: "SIPLACE SX2 #4",
        device_type: "SIPLACE SX2",
        location: "产线B-02",
        status: "maintenance",
        health_score: 45.2,
      },
    ];

    const { data: insertedDevices, error: deviceError } = await client
      .from("devices")
      .insert(devices)
      .select();

    if (deviceError) {
      console.error("Device insert error:", deviceError);
    }

    // 2. 创建预警
    const alerts = [
      {
        device_id: insertedDevices?.[1]?.id || "demo-id-1",
        alert_type: "吸嘴堵塞风险",
        severity: "high",
        status: "active",
        probability: 0.85,
        model_type: "lstm",
        key_evidence: {
          vacuum_drop: "真空度在过去4小时从-65kPa下降至-55kPa",
          rejection_rate: "抛料率从2次/小时上升至8次/小时",
        },
        ai_explanation: "吸嘴#5真空度持续下降15%，抛料率异常升高，建议优先检查吸嘴是否堵塞或磨损。预测未来24小时内发生堵塞故障的概率为85%。",
      },
      {
        device_id: insertedDevices?.[3]?.id || "demo-id-2",
        alert_type: "气压系统异常",
        severity: "critical",
        status: "active",
        probability: 0.92,
        model_type: "rule_engine",
        key_evidence: {
          main_pressure: "主气路压力连续5次低于安全阈值0.45MPa",
          filter_dp: "空气过滤器压差异常升高",
        },
        ai_explanation: "主气路压力低于安全阈值，可能影响真空发生器性能。建议立即检查气源和过滤器状态。",
      },
      {
        device_id: insertedDevices?.[0]?.id || "demo-id-3",
        alert_type: "吸嘴磨损预警",
        severity: "medium",
        status: "acknowledged",
        probability: 0.65,
        model_type: "survival",
        key_evidence: {
          pick_count: "吸嘴#3拾取次数已达125万次",
          service_hours: "在役时长超过2000小时",
        },
        ai_explanation: "吸嘴#3已接近预期使用寿命，24小时失效概率为65%。建议安排预防性更换。",
      },
    ];

    const { error: alertError } = await client.from("alerts").insert(alerts);
    if (alertError) {
      console.error("Alert insert error:", alertError);
    }

    // 3. 创建工单
    const workOrders = [
      {
        order_number: "WO-20260312-001",
        device_id: insertedDevices?.[1]?.id || "demo-id-1",
        title: "吸嘴#5堵塞预防性维护",
        description: "AI预测吸嘴#5存在高概率堵塞风险，需要进行预防性清洗或更换",
        fault_analysis: "1. 吸嘴内部可能积聚粉尘或助焊剂残留\n2. 真空管路可能存在泄漏\n3. 过滤器可能需要更换",
        inspection_steps: [
          "1. 检查吸嘴外观是否有明显污损",
          "2. 使用专用清洗液清洗吸嘴内部",
          "3. 检查真空管路连接是否紧密",
          "4. 测试真空度是否恢复正常",
          "5. 必要时更换新吸嘴",
        ],
        required_parts: [
          { name: "吸嘴清洗液", model: "CL-200", quantity: 1 },
          { name: "备用吸嘴", model: "N-505", quantity: 2 },
          { name: "真空过滤器", model: "VF-100", quantity: 1 },
        ],
        safety_notes: "1. 停机后等待设备完全静止\n2. 佩戴防静电手环\n3. 小心操作避免损坏吸嘴和供料器",
        priority: "high",
        status: "pending",
      },
      {
        order_number: "WO-20260312-002",
        device_id: insertedDevices?.[3]?.id || "demo-id-2",
        title: "气路系统紧急检修",
        description: "主气路压力异常，需要立即检修",
        fault_analysis: "1. 主气源可能压力不足\n2. 空气过滤器堵塞\n3. 气路管路泄漏",
        inspection_steps: [
          "1. 检查主气源压力是否正常",
          "2. 检查空气过滤器压差",
          "3. 检查气路管路是否有泄漏",
          "4. 清洁或更换过滤器",
        ],
        required_parts: [
          { name: "空气过滤器", model: "AF-300", quantity: 1 },
          { name: "气管密封胶带", model: "PTFE-10", quantity: 1 },
        ],
        safety_notes: "紧急维修，需立即停机处理",
        priority: "urgent",
        status: "pending",
      },
    ];

    const { error: workOrderError } = await client.from("work_orders").insert(workOrders);
    if (workOrderError) {
      console.error("Work order insert error:", workOrderError);
    }

    // 4. 创建知识库内容
    const knowledge = [
      {
        title: "SIPLACE SX2 吸嘴堵塞故障处理指南",
        category: "case",
        device_type: "SIPLACE SX2",
        content: `故障现象：
设备频繁出现拾取错误，抛料率异常升高。

可能原因：
1. 吸嘴内部积聚粉尘或助焊剂残留
2. 真空管路泄漏
3. 过滤器堵塞
4. 吸嘴磨损

排查步骤：
1. 检查真空度是否正常（正常范围：-60kPa 至 -70kPa）
2. 检查吸嘴外观，如有明显污损需清洗
3. 使用专用清洗液清洗吸嘴内部
4. 检查真空管路连接是否紧密
5. 检查过滤器压差，必要时更换

预防措施：
- 定期清洁吸嘴（建议每8小时）
- 定期更换过滤器
- 监控真空度变化趋势`,
        keywords: ["吸嘴", "堵塞", "真空度", "抛料"],
        source: "内部维修案例库",
      },
      {
        title: "真空报警处理流程",
        category: "sop",
        device_type: "SIPLACE SX2",
        content: `适用范围：SIPLACE SX2系列贴片机真空系统故障

处理流程：

第一步：确认报警类型
- 低真空度报警（真空度 < -50kPa）
- 真空建立失败（真空度无法达到设定值）
- 真空泄漏（真空度不稳定）

第二步：检查气源
1. 确认主气路压力是否在正常范围（0.5-0.7MPa）
2. 检查气源是否稳定
3. 确认空气过滤器状态

第三步：检查真空系统
1. 检查真空发生器工作状态
2. 检查真空管路连接
3. 检查吸嘴和吸嘴座密封性

第四步：清洁或更换部件
1. 清洗或更换吸嘴
2. 更换真空过滤器
3. 更换老化管路

第五步：测试验证
1. 执行真空度测试
2. 执行试贴片验证
3. 记录处理结果`,
        keywords: ["真空", "报警", "处理流程"],
        source: "设备维修SOP",
      },
      {
        title: "CPH效率下降原因分析",
        category: "faq",
        device_type: "SIPLACE SX2",
        content: `问：为什么设备CPH（每小时贴片数）会下降？

答：CPH下降可能由以下原因导致：

1. 拾取问题
- 吸嘴堵塞或磨损
- 真空度不足
- 送料器供料异常

2. 贴装问题
- 贴装头移动速度降低
- 视觉识别时间增加
- 贴装精度下降导致重复贴装

3. 设备老化
- 电机性能下降
- 导轨磨损
- 润滑不足

4. 程序问题
- 贴片路径优化不足
- 元件数据库错误
- 照明参数不匹配

解决方法：
1. 定期维护保养设备
2. 优化贴片程序
3. 及时更换磨损部件
4. 培训操作人员正确使用`,
        keywords: ["CPH", "效率", "贴片速度"],
        source: "常见问题库",
      },
    ];

    const { error: knowledgeError } = await client.from("knowledge_base").insert(knowledge);
    if (knowledgeError) {
      console.error("Knowledge insert error:", knowledgeError);
    }

    return NextResponse.json({
      success: true,
      message: "演示数据初始化成功",
      devices: insertedDevices?.length || 0,
    });
  } catch (error) {
    console.error("Init data error:", error);
    return NextResponse.json(
      { error: "Failed to initialize data" },
      { status: 500 }
    );
  }
}
