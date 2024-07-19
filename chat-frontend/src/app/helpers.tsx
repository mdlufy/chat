import { formatDistance } from 'date-fns';
import { ru } from 'date-fns/locale';
import { UserDto, UserModel } from './providers/auth-provider/user';
import {
    ChatDto,
    ChatFactoryModel,
    ChatModel,
    ChatRole,
    ChatType,
} from './providers/chat-provider/chat';
import { FolderDto, FolderModel } from './providers/chat-provider/folder';
import {
    EmptyMessage,
    MessageDto,
    MessageFactoryDto,
    MessageFactoryModel,
    MessageModel,
} from './providers/chat-provider/message';

export const mapChats = (chats: ChatDto[]): ChatModel[] => {
    return chats.map((chat) => mapChatDtoToChatModel(chat));
};

export const mapMessages = (messages: MessageDto[]): MessageModel[] => {
    return messages.map((message) => mapMessageDtoToMessageModel(message));
};

export const mapFolders = (folders: FolderDto[]): FolderModel[] => {
    return folders.map((chat) => mapFolderDtoToFolderModel(chat));
};

export const mapUsers = (users: UserDto[]): UserModel[] => {
    return users.map((user) => mapUserDtoToUserModel(user));
};

export const mapChatDtoToChatModel = (chat: ChatDto): ChatModel => {
    const chatType = chat.type === 0 ? ChatType.PRIVATE : ChatType.GROUP;
    const chatRole = chat.chat_role === 0 ? ChatRole.ADMIN : ChatRole.USER;
    const lastMessage = isValidMessage(chat.last_message)
        ? mapMessageDtoToMessageModel(chat.last_message)
        : chat.last_message;

    return {
        id: chat.id,
        name: chat.name,
        description: chat.description,
        avatar: chat.avatar,
        type: chatType,
        chatRole: chatRole,
        archive: chat.archive,
        mute: chat.mute,
        blockedForMe: chat.blocked_for_me,
        blockedByMe: chat.blocked_by_me,
        lastMessage,
        unreadMessages: chat.unread_messages,
        users: chat.users,
    };
};

export const mapFolderDtoToFolderModel = (folder: FolderDto): FolderModel => {
    return {
        id: folder.id,
        userId: folder.user_id,
        name: folder.name,
        description: folder.description,
        chats: folder.chats,
    };
};

export const mapMessageDtoToMessageModel = (
    message: MessageDto
): MessageModel => {
    return {
        type: message.type,
        payload: {
            id: message.payload.id,
            userId: message.payload.user_id,
            chatId: message.payload.chat_id,
            text: message.payload.text,
            timeCreated: message.payload.time_created,
            files: message.payload.files,
            reactions: message.payload.reactions,
            userAvatar: message.payload.userAvatar,
            username: message.payload.username,
        },
    };
};

export const mapNewMessageModelToNewMessageDto = (
    message: MessageFactoryModel
): MessageFactoryDto => {
    return {
        text: message.text,
        files: message.files,
        chat_id: message.chatId,
    };
};

export const mapUserDtoToUserModel = (user: UserDto): UserModel => {
    return {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
    };
};

export const chatFactory = (chat: ChatModel): ChatFactoryModel => {
    return {
        name: chat.name,
        description: chat.description,
        avatar: chat.avatar,
        users: chat.users,
    };
};

export const defaultChatModel: ChatModel = {
    id: 0,
    name: '',
    description: '',
    avatar: '',
    type: ChatType.PRIVATE,
    chatRole: ChatRole.ADMIN,
    archive: false,
    mute: false,
    lastMessage: { msg: 'no messages' },
    unreadMessages: 0,
    users: [],
    blockedForMe: false,
    blockedByMe: false,
};

export const formatDate = (date: string) => {
    const currDate = new Date(date);

    const offsetInMinutes = currDate.getTimezoneOffset();
    const localDate = new Date(currDate.getTime() - offsetInMinutes * 60000);

    return formatDistance(localDate, Date.now(), {
        addSuffix: true,
        locale: ru,
    });
};

// продумать обработку отсутствия в списке найденных
export const findChatById = (
    chats: ChatModel[],
    chatId: number
): ChatModel | null => {
    return chats.find((chat: ChatModel) => chat.id === chatId) ?? null;
};

// продумать обработку отсутствия в списке найденных
export const findMessageById = (
    messages: MessageModel[],
    messageId: number
): MessageModel | null => {
    return (
        messages.find(
            (message: MessageModel) => message.payload.id === messageId
        ) ?? null
    );
};

export const filterMessagesByChatId = (
    messages: MessageModel[],
    chatId: number | null
): MessageModel[] => {
    if (!chatId) {
        return [];
    }

    return messages.filter(
        (message: MessageModel) => message.payload.chatId === chatId
    );
};

// с появлением порционной подгрузки сообщений нужно будет переосмыслить,
// как определять, нужно ли загружать сообщения при переходе на другой чат или нет
export const chatMessagesHaveAlreadyBeenFetched = (
    messages: MessageModel[],
    chatId: number
): boolean => {
    return messages.some((message) => message.payload.chatId === chatId);
};

// TODO: используется для определения "пустоты" чата - нужно сделать для этого отдельный метод
// в который абстрагировать этот метод
export const isValidMessage = (
    message: MessageModel | MessageDto | EmptyMessage
): message is MessageModel | MessageDto => {
    return (
        (message as MessageModel)?.payload?.timeCreated !== undefined ||
        (message as MessageDto)?.payload?.time_created !== undefined
    );
};
