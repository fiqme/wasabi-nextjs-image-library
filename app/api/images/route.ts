import { NextResponse } from "next/server";
import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { wasabi, BUCKET } from "@/lib/wasabi";
import path from "path";

const ALLOWED_EXT = new Set([
  ".jpg",
  ".jpeg",
  ".png",
  ".gif",
  ".webp",
  ".avif",
  ".svg",
]);
const folder = process.env.WASABI_FOLDER ?? "";

export async function GET() {
  const result = await wasabi.send(
    new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: folder ? `${folder}/` : undefined,
    }),
  );

  const images = (result.Contents || [])
    .filter((obj) => {
      const ext = obj.Key?.slice(obj.Key.lastIndexOf(".")).toLowerCase() ?? "";
      return ALLOWED_EXT.has(ext);
    })
    .map((obj) => {
      const key = obj.Key!;
      const filename = path.basename(key);
      const ext = key.slice(key.lastIndexOf("."));
      const id = key.slice(0, key.lastIndexOf("."));
      console.log(
        "Generated URL:",
        `https://s3.${process.env.WASABI_REGION}.wasabisys.com/${BUCKET}/${key}`,
      );
      return {
        id,
        name: filename,
        url: `https://s3.${process.env.WASABI_REGION}.wasabisys.com/${BUCKET}/${key}`,
        size: obj.Size ?? 0,
        uploadedAt: obj.LastModified?.toISOString() ?? new Date().toISOString(),
      };
    })
    .sort(
      (a, b) =>
        new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
    );

  return NextResponse.json({ images });
}
