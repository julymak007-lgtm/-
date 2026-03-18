import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 获取单个标注数据详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;

    const { data, error } = await client
      .from("labeled_data")
      .select("*, devices(*)")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    // 获取该时间段的参数数据
    const { data: parameters } = await client
      .from("device_parameters")
      .select("*")
      .eq("device_id", data.device_id)
      .gte("recorded_at", data.start_time)
      .lte("recorded_at", data.end_time)
      .order("recorded_at", { ascending: true });

    return NextResponse.json({
      data: {
        ...data,
        parameters: parameters || [],
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch labeled data" },
      { status: 500 }
    );
  }
}

// 更新标注数据
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (body.label_type !== undefined) updateData.label_type = body.label_type;
    if (body.is_fault !== undefined) updateData.is_fault = body.is_fault;
    if (body.fault_severity !== undefined) updateData.fault_severity = body.fault_severity;
    if (body.fault_time !== undefined) updateData.fault_time = body.fault_time;
    if (body.features !== undefined) updateData.features = body.features;
    if (body.labeled_by !== undefined) updateData.labeled_by = body.labeled_by;
    if (body.label_confidence !== undefined) updateData.label_confidence = body.label_confidence;
    if (body.notes !== undefined) updateData.notes = body.notes;
    if (body.train_split !== undefined) updateData.train_split = body.train_split;
    if (body.is_used_for_training !== undefined) updateData.is_used_for_training = body.is_used_for_training;

    const { data, error } = await client
      .from("labeled_data")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update labeled data" },
      { status: 500 }
    );
  }
}

// 删除标注数据
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;

    const { error } = await client
      .from("labeled_data")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to delete labeled data" },
      { status: 500 }
    );
  }
}
