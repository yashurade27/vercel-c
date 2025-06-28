import { S3 } from "aws-sdk";
import fs from "fs";

const s3 = new S3({
  accessKeyId: "YOUR_ACCESS_KEY_ID", // Your AWS access key ID
  secretAccessKey: "YOUR_SEC_ACCESS_KEY", // Your AWS secret access key
  endpoint:  "https://s3.us-west-004.backblazeb2.com", // Replace with your S3 endpoint
});

export const uploadFile = async (fileName: string, localFilePath: string) => {
  const fileContent = fs.readFileSync(localFilePath);
  const response = await s3
    .upload({
      Bucket: "vercel",
      Key: fileName,
      Body: fileContent,
    })
    .promise();
  console.log(`File uploaded successfully. ${response.Location}`);
};


