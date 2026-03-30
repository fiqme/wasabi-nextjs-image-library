import { NextRequest, NextResponse } from "next/server";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { wasabi, BUCKET } from "@/lib/wasabi";
import path from "path";

const folder = process.env.WASABI_FOLDER ?? "";
export async function DELETE(request: NextRequest) {
  const { filename } = await request.json();
  if (!filename)
    return NextResponse.json({ error: "Filename required" }, { status: 400 });

  // Prevent path traversal but keep the folder prefix
  const safeFilename = path.basename(filename);
  const key = folder ? `${folder}/${safeFilename}` : safeFilename;

  await wasabi.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }),
  );

  return NextResponse.json({ success: true });
}
