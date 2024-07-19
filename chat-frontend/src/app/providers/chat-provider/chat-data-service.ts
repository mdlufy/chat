import { AxiosResponse } from 'axios';
import { axiosInstance } from 'src/app/axios';
import { UserDto } from '../auth-provider/user';
import { ChatDto, ChatFactoryModel } from './chat';
import { FolderDto } from './folder';
import { MessageDto, MessageFactoryDto } from './message';

export class ChatDataService {
    public static fetchMessagesByChatId = (
        chatId: number
    ): Promise<MessageDto[]> => {
        return axiosInstance
            .get(`/chats/${chatId}/messages`)
            .then((response) => response.data);
    };

    public static fetchChatsByUserId = (): Promise<ChatDto[]> => {
        return axiosInstance
            .get(`/chats/chats_of_user/`)
            .then((response) => response.data);
    };

    public static fetchUsersByName = (name: string): Promise<UserDto[]> => {
        return axiosInstance
            .get(`/users/get_users_by_name/`, {
                params: {
                    name,
                },
            })
            .then((response) => response.data);
    };

    public static addChatToFolders = (
        chatId: number,
        folders: number[]
    ): Promise<{ status: string }> => {
        return axiosInstance
            .post(`/chats/chatfolder/${chatId}`, { add: folders })
            .then((response) => response.data);
    };

    public static createFolder = (
        folder: Omit<FolderDto, 'user_id' | 'id'>
    ): Promise<FolderDto> => {
        return axiosInstance
            .post(`/folders/`, folder)
            .then((response) => response.data);
    };

    public static createChat = (chat: ChatFactoryModel): Promise<ChatDto> => {
        return axiosInstance
            .post(`/chats/`, chat)
            .then((response) => response.data);
    };

    public static updateFolder = (
        folderId: number,
        folder: Omit<FolderDto, 'user_id' | 'id'>
    ): Promise<FolderDto> => {
        return axiosInstance
            .put(`/folders/${folderId}`, folder)
            .then((response) => response.data);
    };

    public static fetchFoldersByUserId = (): Promise<FolderDto[]> => {
        return axiosInstance
            .get(`/folders/folders_of_user/`)
            .then((response) => response.data);
    };

    public static sendMessage = (
        message: MessageFactoryDto
    ): Promise<MessageDto> => {
        return axiosInstance
            .post(`/messages/`, message)
            .then((response) => response.data);
    };

    public static deleteChat = (
        chatId: number,
        forall: boolean,
        newAdmin?: string
    ): Promise<AxiosResponse<string>> => {
        return axiosInstance.delete(`/chats/${chatId}/`, {
            params: {
                forall: forall,
                ...(newAdmin ? { new_admin: newAdmin } : {}),
            },
        });
    };

    public static toggleArchiveChat = (
        chatId: number,
        archive: boolean
    ): Promise<AxiosResponse<string>> => {
        return axiosInstance.put(`/chats/archive_chat/`, {
            change: archive,
            chat_id: chatId,
        });
    };

    public static toggleMuteChat = (
        chatId: number,
        mute: boolean
    ): Promise<AxiosResponse<string>> => {
        return axiosInstance.put(`/chats/mute_chat/`, {
            change: mute,
            chat_id: chatId,
        });
    };

    public static blockChat = (
        blockedUserId: string
    ): Promise<AxiosResponse<string>> => {
        return axiosInstance.post(`/chats/block/`, null, {
            params: {
                blocked_user_id: blockedUserId,
            },
        });
    };

    public static unblockChat = (
        blockedUserId: string
    ): Promise<AxiosResponse<string>> => {
        return axiosInstance.delete(`/chats/block`, {
            params: {
                blocked_user_id: blockedUserId,
            },
        });
    };
}
