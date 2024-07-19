export interface FolderDto {
    id: number;
    user_id: string;
    name: string;
    description: string;
    chats: number[];
}

export interface FolderModel {
    id: number;
    userId: string;
    name: string;
    description: string;
    chats: number[];
}
