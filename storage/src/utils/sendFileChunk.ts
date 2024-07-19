import { Request } from 'express';
import fs from 'fs';
import Fs from 'fs/promises';
import md5 from 'md5';
import * as WebSocket from 'ws';
import { DownloadFile } from '../contracts/download-file';
import { SocketMessage, SocketMessageType } from '../contracts/socket-message';
import { CHUNK_SIZE } from '../config';

export async function sendFileChunk(ws: WebSocket, req: Request): Promise<void> {
    const encodedFilename = req.params.file;
    const fileName = decodeURIComponent(encodedFilename);

    const [ext] = fileName.split('.').reverse();
    const hashedFileName = md5(fileName) + '.' + ext;

    const filePath = './uploads/' + hashedFileName;

    if (!fs.existsSync(filePath)) {
        return;
    }

    const fileSize = (await Fs.stat(filePath)).size;
    const totalChunks = Math.ceil(fileSize / CHUNK_SIZE);

    const fileStream = fs.createReadStream(filePath, { highWaterMark: CHUNK_SIZE });

    let chunkIndex = 1;
    for await (const data of fileStream) {
        const payload: DownloadFile = {
            data,
            chunkIndex,
            totalChunks,
        };

        const message: SocketMessage<DownloadFile> = {
            type: SocketMessageType.DATA,
            payload,
        };

        ws.send(JSON.stringify(message));
        chunkIndex++;
    }

    console.log(`Success download file ${fileName} with hashed name ${hashedFileName}`);
}

// export async function startFileDownload(ws, filename) {
//   const fileStream = fs.createReadStream(filename);

//   await sendFileChunk(ws, fileStream, 0);
// }

// async function sendFileChunk(ws, fileStream, offset = 0) {
//   const buffer = Buffer.alloc(CHUNK_SIZE);

//   const bytesRead = await fileStream.read(buffer, 0, CHUNK_SIZE, offset);

//   if (bytesRead === 0) {
//         const payload: DownloadFile = {
//             data: buffer,
//             chunkIndex: (bytesRead / CHUNK_SIZE) + 1,
//             totalChunks,
//         };

//         const message: SocketMessage<DownloadFile> = {
//             type: SocketMessageType.DATA,
//             payload,
//         };

//         ws.send(JSON.stringify(message));
//     ws.send(JSON.stringify({ action: 'part', done: true }));
//   } else {
//     ws.send(JSON.stringify({ action: 'part', part: buffer.slice(0, bytesRead), offset: offset, done: false }));

//     sendFileChunk(ws, fileStream, offset + buffer.slice(0, bytesRead).length);
//   }
// }
