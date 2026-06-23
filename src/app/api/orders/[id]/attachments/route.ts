import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import path from "path";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/authz";
import { getAccessibleOrder } from "@/lib/orderAccess";
import { MAX_ATTACHMENT_SIZE } from "@/lib/uploads";
import { supabaseAdmin, SUPABASE_BUCKET } from "@/lib/supabase";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const order = await getAccessibleOrder(id, user);
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  }
  if (file.size > MAX_ATTACHMENT_SIZE) {
    return NextResponse.json({ error: "파일 크기는 10MB 이하만 가능합니다." }, { status: 400 });
  }

  const ext = path.extname(file.name).slice(0, 10);
  const storedName = `${randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabaseAdmin.storage
    .from(SUPABASE_BUCKET)
    .upload(storedName, buffer, {
      contentType: file.type || "application/octet-stream",
    });
  if (uploadError) {
    return NextResponse.json({ error: "파일 업로드에 실패했습니다." }, { status: 500 });
  }

  const attachment = await prisma.attachment.create({
    data: {
      orderId: id,
      fileName: storedName,
      originalName: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      uploadedById: user.id,
    },
  });

  return NextResponse.json(attachment, { status: 201 });
}
