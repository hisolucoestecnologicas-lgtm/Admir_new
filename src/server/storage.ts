import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import { Readable } from 'stream';

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_ENDPOINT = process.env.R2_ENDPOINT;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'admir-public-media';

// Validation of required environment variables
const isR2Configured = Boolean(
  R2_ACCESS_KEY_ID && 
  R2_SECRET_ACCESS_KEY && 
  R2_ENDPOINT && 
  R2_BUCKET_NAME
);

let s3Client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (!s3Client) {
    if (!isR2Configured) {
      throw new Error('Cloudflare R2 configuration is missing or incomplete (R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT).');
    }
    s3Client = new S3Client({
      region: 'auto',
      endpoint: R2_ENDPOINT,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID!,
        secretAccessKey: R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return s3Client;
}

export interface StorageResult {
  url: string;
  key: string;
  size: number;
  mimeType: string;
}

export const PublicMediaStorage = {
  isConfigured: () => isR2Configured,

  async upload(
    key: string,
    body: Buffer | Readable | Uint8Array,
    mimeType: string
  ): Promise<StorageResult> {
    const client = getR2Client();
    
    // For small files, PutObject is sufficient. For streams, Upload is better.
    // We'll use PutObject for simpler logic if it's a buffer.
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: mimeType,
    });

    await client.send(command);

    return {
      key,
      url: `/api/media/proxy/${key}`, // Backend proxy URL to keep bucket private
      size: body instanceof Buffer ? body.length : 0,
      mimeType
    };
  },

  async read(key: string): Promise<{ body: Readable; contentType: string; contentLength: number }> {
    const client = getR2Client();
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    const response = await client.send(command);
    
    if (!response.Body) {
      throw new Error(`Object ${key} has no body`);
    }

    return {
      body: response.Body as Readable,
      contentType: response.ContentType || 'application/octet-stream',
      contentLength: response.ContentLength || 0,
    };
  },

  async delete(key: string): Promise<void> {
    const client = getR2Client();
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    await client.send(command);
  },

  async exists(key: string): Promise<boolean> {
    const client = getR2Client();
    const command = new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    try {
      await client.send(command);
      return true;
    } catch (err: any) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw err;
    }
  },

  /**
   * Generates a signed URL for direct client-side access if needed.
   * Note: The user requested a backend proxy, but this is a useful fallback.
   */
  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const client = getR2Client();
    const command = new GetObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });

    return await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  }
};
