import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';

const R2_PRIVATE_ACCESS_KEY_ID = process.env.R2_PRIVATE_ACCESS_KEY_ID;
const R2_PRIVATE_SECRET_ACCESS_KEY = process.env.R2_PRIVATE_SECRET_ACCESS_KEY;
const R2_PRIVATE_ENDPOINT = process.env.R2_PRIVATE_ENDPOINT;
const R2_PRIVATE_BUCKET_NAME = process.env.R2_PRIVATE_BUCKET_NAME || 'admir-private-documents';

const isPrivateR2Configured = Boolean(
  R2_PRIVATE_ACCESS_KEY_ID && 
  R2_PRIVATE_SECRET_ACCESS_KEY && 
  R2_PRIVATE_ENDPOINT && 
  R2_PRIVATE_BUCKET_NAME
);

let privateS3Client: S3Client | null = null;

export function getPrivateR2Client(): S3Client {
  if (!privateS3Client) {
    if (!isPrivateR2Configured) {
      throw new Error('Cloudflare R2 Private configuration is missing or incomplete.');
    }
    privateS3Client = new S3Client({
      region: 'auto',
      endpoint: R2_PRIVATE_ENDPOINT,
      credentials: {
        accessKeyId: R2_PRIVATE_ACCESS_KEY_ID!,
        secretAccessKey: R2_PRIVATE_SECRET_ACCESS_KEY!,
      },
    });
  }
  return privateS3Client;
}

export interface PrivateStorageResult {
  key: string;
  size: number;
  mimeType: string;
}

export const PrivateDocumentStorage = {
  isConfigured: () => isPrivateR2Configured,

  /**
   * Uploads a private document.
   * key format: private/ambassadors/<ambassadorId>/<documentId>/<safeFilename>
   */
  async upload(
    key: string,
    body: Buffer | Readable | Uint8Array,
    mimeType: string
  ): Promise<PrivateStorageResult> {
    const client = getPrivateR2Client();
    
    const command = new PutObjectCommand({
      Bucket: R2_PRIVATE_BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: mimeType,
    });

    await client.send(command);

    return {
      key,
      size: body instanceof Buffer ? body.length : 0,
      mimeType
    };
  },

  async read(key: string): Promise<{ body: Readable; contentType: string; contentLength: number }> {
    const client = getPrivateR2Client();
    const command = new GetObjectCommand({
      Bucket: R2_PRIVATE_BUCKET_NAME,
      Key: key,
    });

    const response = await client.send(command);
    
    if (!response.Body) {
      throw new Error(`Private object ${key} has no body`);
    }

    return {
      body: response.Body as Readable,
      contentType: response.ContentType || 'application/octet-stream',
      contentLength: response.ContentLength || 0,
    };
  },

  async delete(key: string): Promise<void> {
    const client = getPrivateR2Client();
    const command = new DeleteObjectCommand({
      Bucket: R2_PRIVATE_BUCKET_NAME,
      Key: key,
    });

    await client.send(command);
  },

  async exists(key: string): Promise<boolean> {
    const client = getPrivateR2Client();
    const command = new HeadObjectCommand({
      Bucket: R2_PRIVATE_BUCKET_NAME,
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
  }
};
