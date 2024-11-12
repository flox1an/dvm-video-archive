import * as fs from 'fs';
import * as path from 'path';
import { DATA_DIR } from '../env.js';

/**
 * Appends a payment token to a file with the specified format.
 * 
 * @param fileName - The name of the file (received tokens or swapped tokens).
 * @param token - The payment token to append.
 */
export function appendPaymentToken(sender: string, fileName: string, token: string) {
    const directoryPath = DATA_DIR;
    const filePath = path.resolve(directoryPath, fileName);

    // Ensure the directory exists
    if (!fs.existsSync(directoryPath)) {
        fs.mkdirSync(directoryPath, { recursive: true });
    }

    const currentDate = new Date().toLocaleString();
    const dataToAppend = `${currentDate}\n${sender}\n${token}\n\n`;

    fs.appendFile(filePath, dataToAppend, (err) => {
        if (err) {
            console.error(`Error appending token to file: ${err.message}`);
        } else {
            console.log(`Token successfully appended to ${fileName}`);
        }
    });
}