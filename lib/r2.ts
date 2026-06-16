import { S3Client } from '@aws-sdk/client-s3';

const r2Endpoint = process.env.CLOUDFLARE_R2_ENDPOINT;
const r2AccessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID;
const r2SecretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY;

export const r2Client = new S3Client({
  region: 'auto',
  endpoint: r2Endpoint,
  credentials: {
    accessKeyId: r2AccessKeyId || '',
    secretAccessKey: r2SecretAccessKey || '',
  },
});

export const R2_BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || '';
export const MEDIA_DOMAIN = process.env.NEXT_PUBLIC_MEDIA_DOMAIN || 'https://media.gadogaucho.com';
