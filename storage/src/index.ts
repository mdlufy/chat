import express, { Request } from 'express';
import expressWs from 'express-ws';
import * as WebSocket from 'ws';
import { HOST, PORT } from './config';
import { SocketMessage, SocketMessageType } from './contracts/socket-message';
import { UploadFile } from './contracts/upload-file';
import { saveFileChunk } from './utils/saveFileChunk';
import { sendFileChunk } from './utils/sendFileChunk';

const baseApp = express();
const wsInstance = expressWs(baseApp);
const app = wsInstance.app;

app.use('/uploads', express.static('uploads'));

app.ws('/upload/file/:file', (ws: WebSocket, req: Request) => {
    ws.on('message', (message: string) => {
        const { type, payload }: SocketMessage<UploadFile> =
            JSON.parse(message);

        switch (type) {
            case SocketMessageType.DATA:
                if (payload) {
                    saveFileChunk(payload, ws, req);
                }
        }
    });

    ws.on('close', () => {
        console.log('WebSocket was closed');
    });
});

app.ws('/download/file/:file', (ws: WebSocket, req: Request) => {
    ws.on('message', (message: string) => {
        const { type }: SocketMessage<void> = JSON.parse(message);

        switch (type) {
            case SocketMessageType.START_DOWNLOAD:
                sendFileChunk(ws, req);
        }
    });
});

app.listen(PORT, HOST, () => {
    console.log(`Server started at port http://${HOST}:${PORT}`);
});
