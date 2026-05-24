import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

const SHARD_COUNT = 1;

export class R2 {
  constructor() {}

  // ========== SHARD LOGIC ==========

  randomShard() {
    return Math.floor(Math.random() * SHARD_COUNT) + 1;
  }

  getClient(shardId) {
    return new S3Client({
      region: "auto",
      endpoint: process.env[`R2_ENDPOINT${shardId}`],
      credentials: {
        accessKeyId: process.env[`R2_ACCESS_KEY${shardId}`],
        secretAccessKey: process.env[`R2_SECRET${shardId}`],
      },
    });
  }

  getBucket(shardId) {
    return process.env[`R2_BUCKET${shardId}`];
  }

  buildKey(shardId, key, folder) {
    return `${folder}/${shardId}:${key}`;
  }

  async streamToString(stream) {
    const chunks = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString("utf-8");
  }

  // ========== SET ==========

  async set(key, value, folder = "", ttl = 36000) {
    const shardId = this.randomShard();

    const client = this.getClient(shardId);
    const bucket = this.getBucket(shardId);

    const finalKey = this.buildKey(shardId, key, folder);

    const body = Buffer.from(JSON.stringify(value));

    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: finalKey,
        Body: body,
        ContentType: "application/json",
        CacheControl: `public, max-age=${ttl}`,
      }),
    );

    return {
      shardId,
      key: key,
      storedKey: finalKey
    };
  }

  // ========== GET ==========

  async get(shardId, key, folder = "") {
    const client = this.getClient(shardId);
    const bucket = this.getBucket(shardId);

    const finalKey = this.buildKey(shardId, key, folder);

    try {
      const res = await client.send(
        new GetObjectCommand({
          Bucket: bucket,
          Key: finalKey,
        }),
      );

      const text = await this.streamToString(res.Body);

      return JSON.parse(text);
    } catch (err) {
      return null;
    }
  }
}

export const r2 = new R2();
