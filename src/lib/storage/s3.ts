import "server-only";
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getEnv } from "@/lib/env";

/**
 * S3 (또는 R2/MinIO 등 S3 호환) 스토리지 유틸.
 *
 * 보안 원칙
 * - 버킷은 퍼블릭 접근 완전 차단. 다운로드는 짧은 수명의 presigned URL 로만 제공한다.
 * - 모든 객체는 서버측 암호화(SSE-S3) 로 저장한다.
 * - 객체 키에 원본 파일명을 넣지 않는다. 파일명 자체가 개인정보일 수 있다 (예: 홍길동_신분증.jpg).
 * - 1시간 TTL 의 1차 보장은 cleanup 크론(retention.ts). S3 Lifecycle 은 하루 단위라서 2차 안전망으로만 쓴다.
 */

let client: S3Client | null = null;

export function getS3(): S3Client {
  if (client) return client;
  const env = getEnv();
  client = new S3Client({
    region: env.S3_REGION,
    endpoint: env.S3_ENDPOINT,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    },
  });
  return client;
}

export type AssetKindKey = "original" | "result";

/**
 * 객체 키 규칙: {kind}/{yyyy-mm-dd}/{sessionId}/{assetId}.{ext}
 * - 날짜 prefix 로 Lifecycle 규칙과 수동 점검이 쉬워진다.
 * - 원본 파일명은 절대 포함하지 않는다.
 */
export function buildObjectKey(params: {
  kind: AssetKindKey;
  sessionId: string;
  assetId: string;
  ext: string;
  now?: Date;
}): string {
  const d = params.now ?? new Date();
  const day = d.toISOString().slice(0, 10);
  const ext = params.ext.replace(/^\./, "").toLowerCase();
  return `${params.kind}/${day}/${params.sessionId}/${params.assetId}.${ext}`;
}

export async function uploadObject(params: {
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
}): Promise<void> {
  const env = getEnv();
  await getS3().send(
    new PutObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType,
      ServerSideEncryption: "AES256",
      // 다운로드 시 브라우저가 파일로 저장하도록. 파일명은 개인정보가 없는 고정 이름을 쓴다.
      ContentDisposition: "attachment",
    }),
  );
}

/** 다운로드용 presigned URL. 기본 10분. TTL(60분)보다 항상 짧아야 한다. */
export async function getDownloadUrl(params: {
  key: string;
  filename: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const env = getEnv();
  const expiresIn = Math.min(params.expiresInSeconds ?? 600, 60 * 60);
  const safeName = params.filename.replace(/[^\w.\-]+/g, "_");
  return getSignedUrl(
    getS3(),
    new GetObjectCommand({
      Bucket: env.S3_BUCKET,
      Key: params.key,
      ResponseContentDisposition: `attachment; filename="${safeName}"`,
    }),
    { expiresIn },
  );
}

/**
 * 여러 객체를 일괄 삭제. S3 API 는 1회 1000개 제한이므로 청크로 나눈다.
 * 반환값: 삭제 실패한 키 목록 (호출자가 재시도/로그).
 */
export async function deleteObjects(keys: string[]): Promise<string[]> {
  if (keys.length === 0) return [];
  const env = getEnv();
  const failed: string[] = [];
  for (let i = 0; i < keys.length; i += 1000) {
    const chunk = keys.slice(i, i + 1000);
    const res = await getS3().send(
      new DeleteObjectsCommand({
        Bucket: env.S3_BUCKET,
        Delete: { Objects: chunk.map((Key) => ({ Key })), Quiet: true },
      }),
    );
    for (const e of res.Errors ?? []) {
      if (e.Key) failed.push(e.Key);
    }
  }
  return failed;
}
