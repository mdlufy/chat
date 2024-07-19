import { Stack, styled } from '@mui/material';
import { useEffect, useRef } from 'react';
import { MessageModel } from 'src/app/providers/chat-provider/message';
import ChatEmptyStub from './chat-empty-stub';
import ChatMessage from './chat-message/chat-message';
import { filterMessagesByChatId } from 'src/app/helpers';

const ChatMessages: React.FC<{
    messages: MessageModel[] | null;
    chatId: number | null;
}> = ({ messages, chatId }) => {
    const bottomRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const filteredMessages = messages
        ? filterMessagesByChatId(messages, chatId)
        : [];

    const scrollToBottom = () => {
        bottomRef.current?.scrollIntoView({ behavior: 'auto' });
    };

    return (
        <StyledMessages>
            {filteredMessages.length ? (
                filteredMessages.map((message) => (
                    <ChatMessage key={message.payload.id} message={message} />
                ))
            ) : (
                <ChatEmptyStub />
            )}
            <div ref={bottomRef} />
        </StyledMessages>
    );
};

const StyledMessages = styled(Stack)(({ theme }) => ({
    padding: theme.spacing(3),
    gap: theme.spacing(2),
    width: '100%',
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    overflow: 'auto',
    '&::-webkit-scrollbar': {
        width: '0.4em',
    },
    '&::-webkit-scrollbar-track': {
        background: '#f1f1f1',
    },
    '&::-webkit-scrollbar-thumb': {
        backgroundColor: '#888',
    },
    '&::-webkit-scrollbar-thumb:hover': {
        background: '#555',
    },
}));

export default ChatMessages;
