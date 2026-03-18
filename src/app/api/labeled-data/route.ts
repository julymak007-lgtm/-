import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 获取标注数据列表
export async function GET(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const searchParams = request.nextUrl.searchParams;
    const deviceId = searchParams.get("device_id");
    const labelType = searchParams.get("label_type");
    const isFault = searchParams.get("is_fault");
    const trainSplit = searchParams.get("train_split");
    const limit = parseInt(searchParams.get("limit") || "100");

    let query = client
      .from("labeled_data")
      .select("*, devices(*)")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (deviceId) {
      query = query.eq("device_id", deviceId);
    }
    if (labelType) {
      query = query.eq("label_type", labelType);
    }
    if (isFault !== null) {
      query = query.eq("is_fault", isFault === "true");
    }
    if (trainSplit) {
      query = query.eq("train_split", trainSplit);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch labeled data" },
      { status: 500 }
    );
  }
}

// 创建标注数据
export async function POST(request: NextRequest) {
  try {
    const client = getSupabaseClient();
    const body = await request.json();

    const { data, error } = await client
      .from("labeled_data")
      .insert({
        device_id: body.device_id,
        component_id: body.component_id,
        start_time: body.start_time,
        end_time: body.end_time,
        label_type: body.label_type,
        is_fault: body.is_fault,
        fault_severity: body.fault_severity,
        fault_time: body.fault_time,
        features: body.features,
        labeled_by: body.labeled_by,
        label_confidence: body.label_confidence,
        notes: body.notes,
        train_split: body.train_split || "train",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to create labeled data" },
      { status: 500 }
    );
  }
}
