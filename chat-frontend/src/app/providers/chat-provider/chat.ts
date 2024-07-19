import { EmptyMessage, MessageDto, MessageModel } from './message';

export interface ChatDto {
    id: number;
    name: string;
    description: string;
    avatar: string;
    type: number;
    chat_role: number;
    archive: boolean;
    mute: boolean;
    blocked_for_me: boolean;
    blocked_by_me: boolean;
    last_message: MessageDto | EmptyMessage;
    unread_messages: number;
    users: string[];
}

export interface ChatModel {
    id: number;
    name: string;
    description: string;
    avatar: string;
    type: ChatType;
    chatRole: ChatRole;
    archive: boolean;
    mute: boolean;
    blockedForMe: boolean;
    blockedByMe: boolean;
    lastMessage: MessageModel | EmptyMessage;
    unreadMessages: number;
    users: string[];
}

export enum ChatType {
    PRIVATE,
    GROUP,
}

export enum ChatRole {
    ADMIN,
    USER,
}

export type ChatFactoryModel = Pick<
    ChatModel,
    'name' | 'description' | 'avatar' | 'users'
>;
