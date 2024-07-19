import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import {
    Avatar,
    Box,
    Container,
    IconButton,
    OutlinedInput,
    Stack,
    styled,
} from '@mui/material';
import { ChangeEvent, KeyboardEvent, useState } from 'react';
import { MessageModel } from 'src/app/providers/chat-provider/message';
import ChatMessageAttachFile from './chat-message-attach-file';

const ChatMessageInput: React.FC<{
    sendMessage: (
        message: Pick<MessageModel['payload'], 'text' | 'files'>
    ) => void;
    disabled?: boolean;
}> = ({ sendMessage, disabled }) => {
    const [input, setInput] = useState<string>('');

    const messageFactory = (
        value: string
    ): Pick<MessageModel['payload'], 'text' | 'files'> => ({
        text: value,
        files: [],
    });

    const sendMessageWrapper = (): void => {
        if (!input.length) {
            return;
        }

        sendMessage(messageFactory(input));
        setInput('');
    };

    const onInput = (event: ChangeEvent<HTMLInputElement>) => {
        setInput(event.target.value);
    };

    const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            sendMessageWrapper();
        }
    };

    return (
        <Container>
            <StyledMessageInput>
                <Avatar />
                <StyledMessageInputField
                    autoFocus
                    value={input}
                    placeholder="Оставьте сообщение"
                    onChange={onInput}
                    onKeyDown={onKeyDown}
                    disabled={disabled}
                />
                <StyledMessageControls>
                    <StyledMessageSendControl>
                        <IconButton
                            disabled={!input.length || disabled}
                            onClick={sendMessageWrapper}
                        >
                            <SendOutlinedIcon />
                        </IconButton>
                    </StyledMessageSendControl>
                    <StyledMessageAttachControl>
                        <ChatMessageAttachFile />
                    </StyledMessageAttachControl>
                </StyledMessageControls>
            </StyledMessageInput>
        </Container>
    );
};

const StyledMessageInput = styled(Stack)(({ theme }) => ({
    padding: theme.spacing(1, 3),
    gap: theme.spacing(2),
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
}));

const StyledMessageInputField = styled(OutlinedInput)(({ theme }) => ({
    width: '100%',
    input: {
        padding: '8.5px 14px',
        fontSize: 14,
    },
    fieldset: {
        borderRadius: 8,
    },
}));

const StyledMessageControls = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
}));

const StyledMessageSendControl = styled(Box)(({ theme }) => ({
    margin: theme.spacing(1),
}));

const StyledMessageAttachControl = styled(Box)(({ theme }) => ({
    margin: theme.spacing(1),
}));

export default ChatMessageInput;
