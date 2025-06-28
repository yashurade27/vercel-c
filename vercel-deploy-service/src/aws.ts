// aws.ts
import { S3 } from "aws-sdk";
import fs from "fs";
import path from "path";

const s3 = new S3({
  accessKeyId: "YOUR_ACCESS_KEY_ID", // Your AWS access key ID
  secretAccessKey: "YOUR_SEC_ACCESS_KEY", // Your AWS secret access key
  endpoint:  "https://s3.us-west-004.backblazeb2.com", // Replace with your S3 endpoint
  s3ForcePathStyle: true,
  signatureVersion: "v4"
});

export async function downloadS3Folder(id: string) {
  const prefix = `output/${id}/`;

  console.log(`Looking for files with prefix: ${prefix}`);

  let objects;
  try {
    objects = await s3.listObjectsV2({
      Bucket: "vercel",
      Prefix: prefix
    }).promise();

    console.log('Found objects:', objects.Contents?.map(c => c.Key));

    if (!objects.Contents?.length) {
      throw new Error(`No files found with prefix: ${prefix}`);
    }
  } catch (error) {
    console.error('S3 listObjects error:', error);
    throw new Error(`Failed to list files for ${id}`);
  }

  const localPath = path.join(__dirname, '..', `output/${id}`);
  console.log(`Downloading to local path: ${localPath}`);

  await Promise.all(objects.Contents.map(async ({ Key }) => {
    if (!Key) return;

    const relativePath = Key.substring(prefix.length);
    const fullPath = path.join(localPath, relativePath);

    console.log(`Downloading ${Key} to ${fullPath}`);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    const file = fs.createWriteStream(fullPath);
    return s3.getObject({ Bucket: "vercel", Key })
      .createReadStream()
      .pipe(file);
  }));
}

export async function copyFinalDist(id: string) {
  const distPath = path.join(__dirname, '..', `output/${id}/dist`);
  const files = getAllFiles(distPath);

  await Promise.all(files.map(file => {
    const relativePath = path.relative(distPath, file).replace(/\\/g, '/');
    const s3Key = `dist/${id}/${relativePath}`;
    return uploadFile(s3Key, file);
  }));
}

function getAllFiles(dirPath: string): string[] {
  return fs.readdirSync(dirPath).flatMap(file => {
    const fullPath = path.join(dirPath, file);
    return fs.statSync(fullPath).isDirectory()
      ? getAllFiles(fullPath)
      : fullPath;
  });
}

export async function uploadFile(key: string, filePath: string) {
  const r2Key = key.replace(/\\/g, '/');
  await s3.upload({
    Bucket: "vercel",
    Key: r2Key,
    Body: fs.readFileSync(filePath)
  }).promise();
}
