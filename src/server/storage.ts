import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand, PutBucketCorsCommand } from '@aws-sdk/client-s3';
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
  },

  /**
   * Generates a secure presigned PUT URL for direct client upload to R2
   */
  async getPresignedPutUrl(key: string, contentType: string, expiresInSeconds = 3600): Promise<string> {
    const client = getR2Client();
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      ContentType: contentType,
    });

    return await getSignedUrl(client, command, { expiresIn: expiresInSeconds });
  },

  /**
   * Enforces a secure CORS configuration on the R2 bucket to allow browser direct uploads
   */
  async ensureBucketCors(origin: string): Promise<void> {
    if (!isR2Configured) return;
    try {
      const client = getR2Client();
      const originsToAllow = [
        'https://ais-dev-mpovpbsy35sokjlyzu3jla-573675315275.us-east1.run.app',
        'https://ais-pre-mpovpbsy35sokjlyzu3jla-573675315275.us-east1.run.app',
        'http://localhost:3000',
        'http://localhost:5173',
      ];
      
      if (origin && !originsToAllow.includes(origin)) {
        // Simple security sanity check to prevent arbitrary domain injections, allowing known patterns
        if (
          origin.startsWith('https://ais-dev-') || 
          origin.startsWith('https://ais-pre-') || 
          origin === 'http://localhost:3000' ||
          origin === 'http://localhost:5173'
        ) {
          originsToAllow.push(origin);
        }
      }

      console.log('[R2 CORS] Applying CORS policy for origins:', originsToAllow);

      const command = new PutBucketCorsCommand({
        Bucket: R2_BUCKET_NAME,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedOrigins: originsToAllow,
              AllowedMethods: ['GET', 'PUT', 'POST', 'HEAD'],
              AllowedHeaders: ['*'],
              ExposeHeaders: ['ETag'],
              MaxAgeSeconds: 3600,
            },
          ],
        },
      });

      await client.send(command);
      console.log('[R2 CORS] CORS configuration successfully applied to bucket:', R2_BUCKET_NAME);
    } catch (err: any) {
      console.warn('[R2 CORS WARNING] Failed to automatically set R2 bucket CORS (non-fatal):', err.message);
    }
  }
};
