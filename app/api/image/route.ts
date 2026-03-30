import { GetObjectCommand } from "@aws-sdk/client-s3";
import { wasabi, BUCKET } from "@/lib/wasabi";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");

  if (!key) return new Response("Missing key", { status: 400 });

  try {
    const result = await wasabi.send(
      new GetObjectCommand({ Bucket: BUCKET, Key: key }),
    );

    const stream = result.Body as ReadableStream;

    return new Response(stream, {
      headers: {
        "Content-Type": result.ContentType ?? "image/jpeg",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    return new Response("Image not found", { status: 404 });
  }
}
