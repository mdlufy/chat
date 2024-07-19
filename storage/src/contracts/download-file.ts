export interface DownloadFile {
    data: {
        type: 'Buffer';
        data: number[];
    };
    totalChunks: number;
    chunkIndex: number;
}
