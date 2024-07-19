import { MessageFile } from './message-file';
import { ReactionDto } from './reaction';

export type MessageFactoryDto = Pick<
    MessageDto['payload'],
    'text' | 'files' | 'chat_id'
>;
export type MessageFactoryModel = Pick<
    MessageModel['payload'],
    'text' | 'files' | 'chatId'
>;

export enum MessageType {
    MESSAGE = 'message',
    EVENT = 'event',
}

export interface MessageDto {
    type: MessageType;
    payload: {
        id: number;
        user_id: string;
        chat_id: number;
        text: string;
        time_created: string;
        files: MessageFile[];
        reactions: ReactionDto[];
        // TODO: уточнить формат
        userAvatar: {
            image: string;
            color: string;
        };
        username: string;
    };
}

export interface MessageModel {
    type: MessageType;
    payload: {
        id: number;
        userId: string;
        chatId: number;
        text: string;
        timeCreated: string;
        files: MessageFile[];
        reactions: ReactionDto[];
        // TODO: уточнить формат
        userAvatar: {
            image: string;
            color: string;
        };
        username: string;
    };
}

export interface EmptyMessage {
    msg: 'no messages';
}
