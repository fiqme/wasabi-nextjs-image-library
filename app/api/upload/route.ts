import { NextRequest, NextResponse } from "next/server";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { wasabi, BUCKET } from "@/lib/wasabi";
import path from "path";

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const files = formData.getAll("files") as File[];

  if (!files.length) {
    return NextResponse.json({ error: "No files provided" }, { status: 400 });
  }

  const uploaded = [];

  for (const file of files) {
    const ext = path.extname(file.name) || ".jpg";
    const id = generateId();
    const filename = `${id}${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const folder = process.env.WASABI_FOLDER ?? "";
    const key = folder ? `${folder}/${filename}` : filename;

    await wasabi.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type,
      }),
    );

    uploaded.push({
      id,
      name: filename,
      url: `/api/image?key=${encodeURIComponent(key)}`,
      size: file.size,
    });
  }

  return NextResponse.json({ images: uploaded });
}
