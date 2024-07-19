import {
    Dispatch,
    ReactNode,
    SetStateAction,
    createContext,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import {
    findChatById,
    findMessageById,
    mapChatDtoToChatModel,
    mapChats,
    mapFolders,
    mapMessageDtoToMessageModel,
} from '../../helpers';
import { ChatDataService } from './chat-data-service';
import { UserContext } from '../auth-provider/auth-provider';
import { ChatModel } from './chat';
import { MessageModel } from './message';
import { FolderModel } from './folder';
import { SelectedChat } from './selected-chat';
import { useNavigate } from 'react-router-dom';

enum WebSocketEvent {
    NEW_MESSAGE = 'new_message',
    NEW_CHAT = 'new_chat',
    CONNECTION = 'connection',
    BLOCK = 'block',
    UNBLOCK = 'unblock',
    DELETE_CHAT = 'delete_chat',
}

export interface ChatContext {
    chats: ChatModel[] | null;
    setChats: Dispatch<SetStateAction<ChatModel[] | null>>;
    messages: MessageModel[] | null;
    setMessages: Dispatch<SetStateAction<MessageModel[] | null>>;
    folders: FolderModel[] | null;
    setFolders: Dispatch<SetStateAction<FolderModel[] | null>>;
    selectedChat: SelectedChat | null;
    setSelectedChat: Dispatch<SetStateAction<SelectedChat | null>>;
}

export const ChatContext = createContext<ChatContext>({
    chats: null,
    setChats: () => {},
    messages: null,
    setMessages: () => {},
    folders: null,
    setFolders: () => {},
    selectedChat: null,
    setSelectedChat: () => {},
});

const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user } = useContext(UserContext);
    const [selectedChat, setSelectedChat] = useState<SelectedChat | null>(null);
    const [chats, setChats] = useState<ChatModel[] | null>(null);
    const [folders, setFolders] = useState<FolderModel[] | null>(null);
    const [messages, setMessages] = useState<MessageModel[] | null>(null);
    const socket = useRef<WebSocket | null>(null);

    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
        initWebsocket();

        return onDestroy;
    }, [chats, user]);

    // TODO: обдумать, нужно ли что-то делать во время дестроя (например при логауте)
    // есть корнер кейсы при ре-рендере списка чатов, когда почему-то закрывается сокет -> можно пропустить сообщение
    const onDestroy = (): void => {
        // if (socket?.current?.readyState === WebSocket.OPEN) {
        //     socket.current.close();
        //     socket.current = null;
        // }
    };

    const fetchData = async () => {
        if (!user || chats) {
            return;
        }

        const [fetchedChats, fetchedFolders] = await Promise.all([
            ChatDataService.fetchChatsByUserId(),
            ChatDataService.fetchFoldersByUserId(),
        ]);

        setChats((chats) => [...(chats ?? []), ...mapChats(fetchedChats)]);
        setFolders((folders) => [
            ...(folders ?? []),
            ...mapFolders(fetchedFolders),
        ]);
    };

    const updateChatLastMessage = (message: MessageModel): void => {
        setChats(
            (chats) =>
                chats?.map((chat) =>
                    chat.id === message.payload.chatId
                        ? { ...chat, lastMessage: message }
                        : chat
                ) ?? []
        );
    };

    const initWebsocket = (): void => {
        if (!chats || socket.current) {
            return;
        }

        socket.current = new WebSocket('ws://localhost:3000');

        socket.current.onopen = function () {
            console.log('Соединение установлено');

            const connectionMessage = {
                event: WebSocketEvent.CONNECTION,
                id: user!.id,
                chats: chats!.map((chat) => chat.id),
            };

            socket.current?.send(JSON.stringify(connectionMessage));
        };

        socket.current.onmessage = function (event) {
            const parsedEvent = JSON.parse(event.data);
            console.log('Получено сообщение:', parsedEvent);

            if (parsedEvent.event === WebSocketEvent.NEW_MESSAGE) {
                const message = mapMessageDtoToMessageModel(
                    parsedEvent.payload
                );

                // на всякий случай закладываемся, чтобы избежать двойного добавления
                const messageAlreadyExists = findMessageById(
                    messages ?? [],
                    message.payload.id
                );

                if (!messageAlreadyExists) {
                    setMessages((messages) => [...(messages ?? []), message]);
                    updateChatLastMessage(message);
                }
            }

            if (parsedEvent.event === WebSocketEvent.NEW_CHAT) {
                const createdChat = mapChatDtoToChatModel(parsedEvent.payload);

                // на всякий случай закладываемся, чтобы избежать двойного добавления
                // т.к. неизвестно, где обработается быстрее: по ws или по http
                const chatAlreadyExists = findChatById(
                    chats ?? [],
                    createdChat.id
                );

                if (!chatAlreadyExists) {
                    setChats((chats) => [createdChat, ...(chats ?? [])]);
                }
            }

            if (parsedEvent.event === WebSocketEvent.DELETE_CHAT) {
                const deletedChatId = parsedEvent.payload.id;

                // TODO: подумать, как лучше обрабатывать удаление чата
                setChats((chats) =>
                    (chats ?? []).filter((chat) => chat.id !== deletedChatId)
                );

                navigate('..')
            }

            if (parsedEvent.event === WebSocketEvent.BLOCK) {
                // TODO: добавить обновление чата как заблокированного
                console.log(parsedEvent);
            }

            if (parsedEvent.event === WebSocketEvent.UNBLOCK) {
                // TODO: добавить обновление чата как разблокированного
                console.log(parsedEvent);
            }
        };

        socket.current.onclose = function (event) {
            console.log('Соединение закрыто');
        };
    };

    return (
        <ChatContext.Provider
            value={{
                chats,
                setChats,
                folders,
                setFolders,
                messages,
                setMessages,
                selectedChat,
                setSelectedChat,
            }}
        >
            {children}
        </ChatContext.Provider>
    );
};

export default ChatProvider;
