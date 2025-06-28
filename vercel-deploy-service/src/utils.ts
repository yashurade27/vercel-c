import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

export async function buildProject(id: string) {
  const projectPath = path.join(__dirname, '..', `output/${id}`);

  if (!fs.existsSync(projectPath)) {
    throw new Error(`Project directory not found: ${projectPath}`);
  }

  return new Promise((resolve, reject) => {
    console.log(`🏗️ Building project at: ${projectPath}`);

    const buildProcess = exec(
      `cd "${projectPath}" && npm install && npm run build`,
      { windowsHide: true },
      (error, stdout, stderr) => {
        if (error) {
          console.error(`❌ Build failed for ${id}:`, stderr);
          return reject(error);
        }
        console.log(`✅ Build succeeded for ${id}`);
        resolve(stdout);
      }
    );

    buildProcess.stdout?.pipe(process.stdout);
    buildProcess.stderr?.pipe(process.stderr);
  });
}
