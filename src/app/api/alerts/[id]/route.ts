import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 更新预警状态
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (body.status) {
      updateData.status = body.status;
      if (body.status === "acknowledged") {
        updateData.acknowledged_at = new Date().toISOString();
        updateData.acknowledged_by = body.acknowledged_by;
      } else if (body.status === "resolved" || body.status === "false_alarm") {
        updateData.resolved_at = new Date().toISOString();
        updateData.resolution = body.resolution;
      }
    }

    const { data, error } = await client
      .from("alerts")
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
      { error: "Failed to update alert" },
      { status: 500 }
    );
  }
}
