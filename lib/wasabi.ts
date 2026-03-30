import { S3Client } from "@aws-sdk/client-s3";

export const wasabi = new S3Client({
  region: process.env.WASABI_REGION!,
  endpoint: `https://s3.${process.env.WASABI_REGION}.wasabisys.com`,
  credentials: {
    accessKeyId: process.env.WASABI_ACCESS_KEY!,
    secretAccessKey: process.env.WASABI_SECRET_KEY!,
  },
});

export const BUCKET = process.env.WASABI_BUCKET!;
