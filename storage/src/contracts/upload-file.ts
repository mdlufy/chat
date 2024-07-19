export interface UploadFile {
    data: string;
    fileSize: number;
    totalChunks: number;
    chunkIndex: number;
}

export interface SuccessUploadFile {
    finalFileName: string;
}
