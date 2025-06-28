import express, { Request, Response } from 'express';
import { S3 } from 'aws-sdk';
import mime from 'mime-types';
import path from 'path';

const s3 = new S3({
  accessKeyId: "YOUR_ACCESS_KEY_ID", // Your AWS access key ID
  secretAccessKey: "YOUR_SEC_ACCESS_KEY", // Your AWS secret access key
  endpoint:  "https://s3.us-west-004.backblazeb2.com", // Replace with your S3 endpoint
  s3ForcePathStyle: true,
  signatureVersion: "v4"
});

const app = express();

app.get("*", async (req: Request, res: Response): Promise<any> => {
  try {
    const host = req.hostname;
    const id = host.includes('.') ? host.split('.')[0] : "default";

    const filePath = req.path === "/" ? "/index.html" : req.path;
    const cleanPath = path.posix.normalize(filePath);

    if (cleanPath.includes("..")) {
      return res.status(403).send("Forbidden");
    }

    const key = `dist/${id}${cleanPath}`;
    console.log(`📦 Fetching: ${key}`);

    const result = await s3.getObject({
      Bucket: "vercel",
      Key: key,
    }).promise();

    const contentType = mime.lookup(cleanPath) || "application/octet-stream";
    res.setHeader("Content-Type", contentType);
    res.send(result.Body);
  } catch (err: any) {
    console.error("❌ Error serving file:", err.message);
    res.status(404).send("File not found");
  }
});

app.listen(3001, () => {
  console.log("🚀 Server running on http://localhost:3001");
});
