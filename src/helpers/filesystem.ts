import { statSync } from "fs";

export function getFileSizeSync(filePath: string): number {
  // Get file stats synchronously
  const stats = statSync(filePath);

  // Check if the path points to a file
  if (!stats.isFile()) {
    throw new Error("Provided path is not a file.");
  }

  return stats.size;
}
