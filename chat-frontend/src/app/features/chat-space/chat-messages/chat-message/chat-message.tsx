import {
    Avatar,
    Box,
    ImageList,
    ImageListItem,
    Paper,
    Stack,
    Typography,
    styled,
} from '@mui/material';
import { useContext, useRef, useState } from 'react';
import { formatDate } from 'src/app/helpers';
import DocumentIcon from 'src/app/icons/document-icon';
import { UserContext } from 'src/app/providers/auth-provider/auth-provider';
import { MessageModel } from 'src/app/providers/chat-provider/message';
import { ProgressLabel } from 'src/app/styled/progress-label';
import { saveFile } from '../utils/saveFile';
import {
    DownloadFile,
    SERVER_HOST,
    SocketMessage,
    SocketMessageType,
} from './chat-message-attach-file';
import { MessageFile } from 'src/app/providers/chat-provider/message-file';

type UserProps = { currentUserMessage: boolean };

const downloadFileChunks: Uint8Array[] = [];

const ChatMessage: React.FC<{ message: MessageModel }> = ({ message }) => {
    const { user } = useContext(UserContext);
    const downloadSocketRef = useRef<WebSocket | null>(null);
    const [progress, setProgress] = useState<{ [key: string]: number | null }>(
        {}
    );

    const currentUserMessage = message.payload.userId === user!.id;

    const isImage = (file: MessageFile): boolean => {
        const imageRegex = /^.*\.(jpg|jpeg|png|gif|bmp)$/;

        return imageRegex.test(file.url);
    };

    const downloadFileClickHandler = async (fileName: string) => {
        const encodedFilename = encodeURIComponent(fileName);

        const url = `${SERVER_HOST}/download/file/${encodedFilename}`;
        downloadSocketRef.current = new WebSocket(url);

        downloadSocketRef.current.binaryType = 'arraybuffer';

        downloadSocketRef.current.onopen = function () {
            const message: SocketMessage<void> = {
                type: SocketMessageType.START_DOWNLOAD,
            };

            downloadSocketRef.current?.send(JSON.stringify(message));
        };

        downloadSocketRef.current.onmessage = function (event) {
            const { type, payload }: SocketMessage<DownloadFile> = JSON.parse(
                event.data
            );

            switch (type) {
                case SocketMessageType.DATA:
                    if (payload) {
                        const { data, totalChunks, chunkIndex }: DownloadFile =
                            payload;

                        if (chunkIndex === 1) {
                            downloadFileChunks.length = 0;
                        }

                        downloadFileChunks.push(new Uint8Array(data.data));
                        setProgress({
                            ...progress,
                            [fileName]: (chunkIndex / totalChunks) * 100,
                        });

                        if (chunkIndex === totalChunks) {
                            saveFile(fileName, downloadFileChunks);

                            setTimeout(() => {
                                setProgress({
                                    ...progress,
                                    [fileName]: null,
                                });
                            }, 500);
                        }
                    }
            }
        };
    };
    return (
        <StyledMessage currentUserMessage={currentUserMessage}>
            <StyledMessageContainer currentUserMessage={currentUserMessage}>
                <Avatar sx={{ width: 32, height: 32 }} />
                <StyledMessageContent>
                    <StyledMessagePaper currentUserMessage={currentUserMessage}>
                        {!currentUserMessage && (
                            <StyledMessageAuthor>
                                {message.payload.username}
                            </StyledMessageAuthor>
                        )}
                        {message.payload.files?.length >= 1 &&
                            (isImage(message.payload.files[0]) ? (
                                <ImageList
                                    cols={1}
                                    sx={{
                                        maxWidth: 400,
                                        maxHeight: 400,
                                        margin: 0,
                                    }}
                                >
                                    {message.payload.files.map((file) => (
                                        <ImageListItem key={file.url}>
                                            <img
                                                srcSet={file.url}
                                                src={file.url}
                                                alt=""
                                                loading="lazy"
                                            />
                                        </ImageListItem>
                                    ))}
                                </ImageList>
                            ) : (
                                <Box
                                    display="flex"
                                    gap="10px"
                                    alignItems="center"
                                    onClick={() =>
                                        downloadFileClickHandler(
                                            message.payload.files[0].name
                                        )
                                    }
                                    sx={{
                                        cursor: 'pointer',
                                    }}
                                >
                                    {progress[message.payload.files[0].name] ? (
                                        <ProgressLabel
                                            value={
                                                progress[
                                                    message.payload.files[0]
                                                        .name
                                                ]!
                                            }
                                        />
                                    ) : (
                                        <DocumentIcon />
                                    )}
                                    <Box sx={{ fontWeight: 'bold' }}>
                                        {message.payload.files[0].name}
                                    </Box>
                                </Box>
                            ))}
                        <StyledMessageText>
                            {message.payload.text}
                        </StyledMessageText>
                    </StyledMessagePaper>
                    <StyledMessageTimeContainer
                        currentUserMessage={currentUserMessage}
                    >
                        <StyledMessageTime variant="caption" noWrap>
                            {formatDate(message.payload.timeCreated)}
                        </StyledMessageTime>
                    </StyledMessageTimeContainer>
                </StyledMessageContent>
            </StyledMessageContainer>
        </StyledMessage>
    );
};

const StyledMessage = styled(Box, {
    shouldForwardProp: (prop) => prop !== 'currentUserMessage',
})<UserProps>(({ currentUserMessage }) => ({
    display: 'flex',
    ...(!currentUserMessage && {
        alignItems: 'flex-start',
    }),
    ...(currentUserMessage && {
        alignItems: 'flex-end',
    }),
}));

const StyledMessageContainer = styled(Stack, {
    shouldForwardProp: (prop) => prop !== 'currentUserMessage',
})<UserProps>(({ theme, currentUserMessage }) => ({
    display: 'flex',
    gap: theme.spacing(2),
    alignItems: 'flex-start',
    maxWidth: 500,
    ...(!currentUserMessage && {
        flexDirection: 'row',
        marginLeft: 0,
        marginRight: 'auto',
    }),
    ...(currentUserMessage && {
        flexDirection: 'row-reverse',
        marginLeft: 'auto',
        marginRight: 0,
    }),
}));

const StyledMessageContent = styled(Box)(({ theme }) => ({
    flexGrow: 1,
}));

const StyledMessagePaper = styled(Paper, {
    shouldForwardProp: (prop) => prop !== 'currentUserMessage',
})<UserProps>(({ theme, currentUserMessage }) => ({
    padding: theme.spacing(1, 2),
    overflow: 'hidden',
    backgroundImage: 'none',
    borderRadius: 20,
    ...(currentUserMessage && {
        backgroundColor: '#6366F1',
        color: '#FFFFFF',
    }),
}));

const StyledMessageTimeContainer = styled(Box, {
    shouldForwardProp: (prop) => prop !== 'currentUserMessage',
})<UserProps>(({ theme, currentUserMessage }) => ({
    marginTop: theme.spacing(0.5),
    paddingLeft: theme.spacing(2),
    paddingRight: theme.spacing(2),
    display: 'flex',
    ...(!currentUserMessage && {
        justifyContent: 'flex-start',
    }),
    ...(currentUserMessage && {
        justifyContent: 'flex-end',
    }),
}));

const StyledMessageTime = styled(Typography)(({ theme }) => ({
    fontWeight: 500,
    fontFamily:
        'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
    color: `rgb(108, 115, 127)`,
}));

const StyledMessageAuthor = styled(Typography)(({ theme }) => ({
    fontWeight: 'bold',
    cursor: 'pointer',
    marginBottom: theme.spacing(1),
    ':hover': {
        textDecoration: 'underline',
    },
}));

const StyledMessageText = styled(Typography)(({ theme }) => ({
    margin: 0,
    fontSize: '1rem',
    fontWeight: 400,
    lineHeight: 1.5,
}));

export default ChatMessage;
