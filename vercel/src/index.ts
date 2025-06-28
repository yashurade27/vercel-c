import express from "express";
import cors from "cors";
import { Request, Response } from "express";
import simpleGit from "simple-git";
import { generate } from "./utils";
import path from "path";
import { getAllFiles } from "./files";
import { uploadFile } from "./aws";
import { createClient } from "redis";




const redisConfig = {
  url: 'redis://localhost:6379',
  socket: {
    reconnectStrategy: (retries: number) => {
      if (retries > 5) {
        console.error("Max Redis reconnection attempts reached");
        return new Error("Max retries reached");
      }
      return Math.min(retries * 100, 5000);
    }
  }
};

const publisher = createClient(redisConfig);
const subscriber = createClient(redisConfig);

// Connect to Redis with error handling
async function initializeRedis() {
  try {
    await publisher.connect();
    await subscriber.connect();
    console.log("✅ Connected to Redis");
  } catch (error) {
    console.error("❌ Redis connection error:", error);
    process.exit(1);
  }
}

const app = express();
app.use(cors());
app.use(express.json());


// Enhanced deployment endpoint
app.post("/deploy", async (req: Request, res: Response): Promise<void> => {
  const repoUrl = req.body.repoUrl;
  if (!repoUrl) {
    res.status(400).json({ error: "Repository URL is required" });
    return;
  }

  const id = generate();
  const outputPath = path.join(__dirname, `output/${id}`);
  console.log(`🔧 Deployment ID: ${id}`);
  console.log(`📂 Output path: ${outputPath}`);
  console.log(`📦 Repository URL: ${repoUrl}`);
  console.log(`🔗 Dirname: ${__dirname}`);


  try {
    // 1. Clone repository
    console.log(`⬇️ Cloning repository ${repoUrl}`);
    await simpleGit().clone(repoUrl, outputPath);
    
    // 2. Upload files to R2
    console.log(`📤 Uploading files for deployment ${id}`);
    const files = await getAllFiles(outputPath);
    await Promise.all(files.map(file => 
      uploadFile(`output/${id}/${path.relative(outputPath, file)}`, file)
    ));

    // 3. Add to build queue
    await publisher.lPush("build-queue", id);
    await publisher.hSet("status", id, "uploaded");

    console.log(`🚀 Deployment queued: ${id}`);
    res.json({ 
      id,
      status: "uploaded",
      message: "Deployment is being processed"
    });

  } catch (error: any) {
    console.error(`❌ Deployment failed: ${error}`);
    await publisher.hSet("status", id, "error");
    res.status(500).json({ 
      id,
      error: "Deployment failed",
      details: error.message 
    });
  }
});



// Enhanced status endpoint
app.get("/status", async (req: Request, res: Response): Promise<any> => {
  const id = req.query.id as string;
  if (!id) {
    return res.status(400).json({ error: "Deployment ID is required" });
  }

  try {
    const status = await publisher.hGet("status", id);
    if (!status) {
      return res.status(404).json({ 
        id,
        error: "Deployment not found" 
      });
    }
    
    res.json({ 
      id,
      status,
      url: status === "deployed" 
        ? `http://${id}.localhost:3001` 
        : undefined
    });
  } catch (error) {
    console.error(`❌ Status check failed: ${error}`);
    res.status(500).json({ 
      id,
      error: "Status check failed" 
    });
  }
});

// Initialize and start server
async function startServer() {
  await initializeRedis();
  
  app.listen(3000, () => {
    console.log("🚀 Server running on http://localhost:3000");
  });
}

startServer().catch(error => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});

export default app;

