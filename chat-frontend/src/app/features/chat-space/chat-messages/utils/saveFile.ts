export function saveFile(downloadFileName: string | null = "file.txt", data: Uint8Array[]) {
    const blob = new Blob(data);
    const downloadUrl = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = downloadFileName as string;
    link.click();

    URL.revokeObjectURL(downloadUrl);
}
