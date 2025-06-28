import fs from "fs";
import path from "path";

export const getAllFiles = async (folderPath: string): Promise<string[]> => {
  let response: string[] = [];

  const allFilesandFolders = fs.readdirSync(folderPath);
  for (const file of allFilesandFolders) {
    const fullFilePath = path.join(folderPath, file);
    if (fs.statSync(fullFilePath).isDirectory()) {
      const subFiles = await getAllFiles(fullFilePath);
      response = response.concat(subFiles);
    } else {
      response.push(fullFilePath);
    }
  }

  return response;
};
