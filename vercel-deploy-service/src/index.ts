import { createClient } from 'redis';
import { downloadS3Folder, copyFinalDist } from './aws';
import { buildProject } from './utils';
import fs from 'fs';
import path from 'path';

const subscriber = createClient();
const publisher = createClient();

async function main() {
  await publisher.connect();
  await subscriber.connect();

  while (true) {
    let id: string | undefined;
    try {
      const response = await subscriber.brPop('build-queue', 0);
      id = response?.element;
      if (!id) continue;

      console.log(`🚀 Starting deployment for ${id}`);
      await publisher.hSet('status', id, 'building');

      // 1. Download
      const downloadPath = `output/${id}`;
      console.log(`⬇️ Downloading to ${path.join(__dirname, '..', downloadPath)}`);
      await downloadS3Folder(id);

      const projectPath = path.join(__dirname, '..', downloadPath);
      if (!fs.existsSync(projectPath)) {
        throw new Error(`Download failed - directory not created: ${projectPath}`);
      }

      // 2. Build
      console.log(`🔨 Building in ${projectPath}`);
      await buildProject(id);

      // 3. Deploy
      console.log(`📦 Finalizing deployment`);
      await copyFinalDist(id);

      console.log(`✅ Deployment complete for ${id}`);
      await publisher.hSet('status', id, 'deployed');
    } catch (error) {
      console.error('❌ Deployment failed:', error);
      if (id) {
        await publisher.hSet('status', id, 'error');
        const cleanupPath = path.join(__dirname, '..', `output/${id}`);
        if (fs.existsSync(cleanupPath)) {
          fs.rmSync(cleanupPath, { recursive: true });
        }
      }
    }
  }
}

main().catch(console.error);
