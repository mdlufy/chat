import { Error } from '@mui/icons-material';
import { Container, Stack, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';
import { AxiosError, HttpStatusCode } from 'axios';
import {
    FocusEvent,
    KeyboardEvent,
    useContext,
    useEffect,
    useRef,
} from 'react';
import { useNavigate } from 'react-router-dom';
import {
    chatFactory,
    chatMessagesHaveAlreadyBeenFetched,
    findMessageById,
    mapChatDtoToChatModel,
    mapMessages,
    mapNewMessageModelToNewMessageDto,
} from 'src/app/helpers';
import { UserContext } from 'src/app/providers/auth-provider/auth-provider';
import { ChatModel, ChatType } from 'src/app/providers/chat-provider/chat';
import { ChatContext } from 'src/app/providers/chat-provider/chat-provider';
import {
    MessageFactoryDto,
    MessageModel,
} from 'src/app/providers/chat-provider/message';
import { StyledDivider } from 'src/app/styled/divider';
import { ChatDataService } from '../../providers/chat-provider/chat-data-service';
import ChatControlPanel from './chat-control-panel';
import ChatCreatePanel from './chat-create-panel';
import ChatMessageInput from './chat-messages/chat-message/chat-message-input';
import ChatMessages from './chat-messages/chat-messages';
import ChatSpaceStub from './chat-space-stub';

const ChatSpace: React.FC = () => {
    const { user } = useContext(UserContext);
    const { selectedChat, setSelectedChat, messages, setMessages } =
        useContext(ChatContext);
    const chatSpaceRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    const isDraftGroupChat =
        selectedChat?.draft && selectedChat?.chat?.type === ChatType.GROUP;

    useEffect(() => {
        // TODO: подумать, как не дергать каждый раз, когда меняем структуру selectedChat
        // сейчас все сообщения сохраняются в messages в ChatProvider
        fetchMessages();
    }, [selectedChat?.chat]);

    const fetchMessages = async () => {
        if (
            !user ||
            !selectedChat?.chat ||
            selectedChat.draft ||
            chatMessagesHaveAlreadyBeenFetched(
                messages ?? [],
                selectedChat.chat.id
            )
        ) {
            return;
        }

        try {
            const fetchedMessages = await ChatDataService.fetchMessagesByChatId(
                selectedChat.chat.id
            );

            setMessages((messages) => [
                ...(messages ?? []),
                ...mapMessages(fetchedMessages).filter(
                    (message) =>
                        !findMessageById(messages ?? [], message.payload.id)
                ),
            ]);
        } catch (error) {
            Promise.reject(error);
        }
    };

    // const updateChatLastMessage = (message: MessageModel): void => {
    //     setChats(
    //         (chats) =>
    //             chats?.map((chat) =>
    //                 chat.id === message.payload.chatId
    //                     ? { ...chat, lastMessage: message }
    //                     : chat
    //             ) ?? []
    //     );
    // };

    const sendMessage = async (
        message: Pick<MessageModel['payload'], 'text' | 'files'>
    ) => {
        if (!selectedChat?.chat) {
            return;
        }

        const newMessage: MessageFactoryDto = mapNewMessageModelToNewMessageDto(
            {
                ...message,
                chatId: selectedChat.draft
                    ? (await createChat(selectedChat.chat))!.id
                    : selectedChat.chat.id,
            }
        );

        try {
            await ChatDataService.sendMessage(newMessage)

            // TODO: разобраться, почему некорректно работает и дважды происходит отправка
            // const createdMessage = mapMessageDtoToMessageModel(
            //     await ChatDataService.sendMessage(newMessage)
            // );

            // setMessages((messages) => {
            //     // на всякий случай закладываемся, чтобы избежать двойного добавления
            //     // т.к. неизвестно, где обработается быстрее: по ws или по http
            //     const messageAlreadyExists = findMessageById(
            //         messages ?? [],
            //         createdMessage.payload.id
            //     );

            //     console.log('sendMessage', messageAlreadyExists);

            //     if (!messageAlreadyExists) {
            //         updateChatLastMessage(createdMessage);

            //         return [...(messages ?? []), createdMessage];
            //     }

            //     return messages;
            // });
        } catch (error) {
            if (
                error instanceof AxiosError &&
                error.response?.status === HttpStatusCode.Forbidden
            ) {
                setSelectedChat((chat) => ({
                    ...chat,
                    chat: {
                        ...chat!.chat!,
                        blockedForMe: true,
                    },
                }));

                return;
            }

            Promise.reject(error);
        }
    };

    const createChat = async (chat: ChatModel): Promise<ChatModel | null> => {
        try {
            const createdChat = mapChatDtoToChatModel(
                await ChatDataService.createChat(chatFactory(chat))
            );

            // TODO: разобраться, почему некорректно работает и дважды происходит отправка
            // const createdChat = mapChatDtoToChatModel(
            //     await ChatDataService.createChat(chatFactory(chat))
            // );

            // setChats((chats) => {
            //     // на всякий случай закладываемся, чтобы избежать двойного добавления
            //     // т.к. неизвестно, где обработается быстрее: по ws или по http
            //     const chatAlreadyExists = findChatById(
            //         chats ?? [],
            //         createdChat.id
            //     );

            //     console.log('createChat', chatAlreadyExists);

            //     if (!chatAlreadyExists) {
            //         return [createdChat, ...(chats ?? [])];
            //     }

            //     return chats;
            // });

            navigate(`#${createdChat.id}`);

            return createdChat;
        } catch (error) {
            Promise.reject(error);
            return null;
        }
    };

    const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Escape') {
            navigate('..');
            setSelectedChat((chat) => ({
                ...chat!,
                draft: false,
            }));
        }
    };

    const onBlur = (event: FocusEvent<HTMLDivElement>) => {
        if (event.target !== chatSpaceRef.current) {
            chatSpaceRef.current?.focus();
        }
    };

    return (
        <StyledChatSpace
            tabIndex={-1}
            ref={chatSpaceRef}
            onKeyDown={onKeyDown}
            onBlur={onBlur}
        >
            {selectedChat?.chat ? (
                <>
                    {isDraftGroupChat ? (
                        <ChatCreatePanel />
                    ) : (
                        <ChatControlPanel chat={selectedChat.chat} />
                    )}
                    <StyledDivider variant="fullWidth" flexItem />
                    <ChatMessages
                        messages={selectedChat.draft ? [] : messages}
                        chatId={selectedChat.chat.id}
                    />
                    {!isDraftGroupChat &&
                        (selectedChat.chat.blockedForMe ? (
                            <StyledBlockContainer>
                                <StyledBlockText>
                                    {'Пользователь вас заблокировал'}
                                </StyledBlockText>
                                <Error color="error" />
                            </StyledBlockContainer>
                        ) : (
                            <ChatMessageInput sendMessage={sendMessage} />
                        ))}
                </>
            ) : (
                <ChatSpaceStub />
            )}
        </StyledChatSpace>
    );
};

// const StyledScrollButtons = styled(Box)({
//     position: 'absolute',
//     bottom: '6rem',
//     right: '1rem',
// });

const StyledChatSpace = styled(Stack)({
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
});

const StyledBlockText = styled(Typography)(({ theme }) => ({
    color: '#d32f2f',
    alignContent: 'center',
    fontSize: '1rem',
    lineHeight: 1.57,
    fontWeight: 500,
}));

const StyledBlockContainer = styled(Container)(({ theme }) => ({
    padding: theme.spacing(2, 3),
    gap: theme.spacing(2),
    justifyContent: 'center',
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
}));

export default ChatSpace;
