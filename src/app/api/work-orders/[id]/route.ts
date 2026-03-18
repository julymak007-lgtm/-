import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";

// 获取单个工单详情
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = getSupabaseClient();
    const { id } = await params;

    const { data, error } = await client
      .from("work_orders")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch work order" },
      { status: 500 }
    );
  }
}

// 更新工单状态
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
      if (body.status === "assigned") {
        updateData.assigned_at = new Date().toISOString();
        updateData.assigned_to = body.assigned_to;
      } else if (body.status === "in_progress") {
        updateData.started_at = new Date().toISOString();
      } else if (body.status === "completed") {
        updateData.completed_at = new Date().toISOString();
        updateData.actual_solution = body.actual_solution;
        updateData.replaced_parts = body.replaced_parts;
        updateData.feedback = body.feedback;
      }
    }

    if (body.assigned_to) updateData.assigned_to = body.assigned_to;
    if (body.priority) updateData.priority = body.priority;

    const { data, error } = await client
      .from("work_orders")
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
      { error: "Failed to update work order" },
      { status: 500 }
    );
  }
}
