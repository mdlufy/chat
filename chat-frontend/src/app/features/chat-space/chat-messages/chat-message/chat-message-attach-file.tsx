import styled from '@emotion/styled';
import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined';
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    IconButton,
    TextField,
} from '@mui/material';
import { AxiosError, HttpStatusCode } from 'axios';
import prettyBytes from 'pretty-bytes';
import {
    ChangeEvent,
    Fragment,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';
import { mapNewMessageModelToNewMessageDto } from 'src/app/helpers';
import DocumentIcon from 'src/app/icons/document-icon';
import { ChatDataService } from 'src/app/providers/chat-provider/chat-data-service';
import { ChatContext } from 'src/app/providers/chat-provider/chat-provider';
import { MessageFactoryDto } from 'src/app/providers/chat-provider/message';
import { MessageFile } from 'src/app/providers/chat-provider/message-file';
import { ProgressLabel } from 'src/app/styled/progress-label';

export interface SocketMessage<T> {
    type: SocketMessageType;
    payload?: T;
}

export interface UploadFile {
    data: string;
    fileSize: number;
    totalChunks: number;
    chunkIndex: number;
}

export interface SuccessUploadFile {
    finalFileName: string;
}

export interface DownloadFile {
    data: {
        type: 'Buffer';
        data: number[];
    };
    totalChunks: number;
    chunkIndex: number;
}

export enum SocketMessageType {
    DATA = 'Data',
    START_UPLOAD = 'Start upload',
    FINISH_UPLOAD = 'Finish upload',
    START_DOWNLOAD = 'Start download',
    FINISH_DOWNLOAD = 'Finish download',
}

const CHUNK_SIZE: number = 15 * 1e3;

export const SERVER_HOST: string = 'ws://0.0.0.0:49160';
export const FILES_HOST_PATH: string = 'http://0.0.0.0:49160/uploads';

const ChatMessageAttachFile: React.FC = () => {
    const { selectedChat } = useContext(ChatContext);

    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const uploadSocketRef = useRef<WebSocket | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [choosenFile, setChoosenFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<string>('');
    const [caption, setCaption] = useState<string>('');
    const [chunkIndex, setChunkIndex] = useState<number | null>(null);
    const [progress, setProgress] = useState<number | null>(null);

    useEffect(() => {
        if (chunkIndex === null) {
            return;
        }

        readAndUploadChunk();
    }, [chunkIndex]);

    const attachFileIconClickHandler = () => {
        if (!fileInputRef.current) return;

        fileInputRef.current.click();
    };

    const updateCaption = (event: ChangeEvent<HTMLInputElement>): void => {
        const { value } = event.target;

        setCaption(value);
    };

    const readAndUploadChunk = (): void => {
        const reader = new FileReader();

        if (!choosenFile || chunkIndex === null) {
            return;
        }

        const from = (chunkIndex - 1) * CHUNK_SIZE;
        const to = from + CHUNK_SIZE;

        const blob = choosenFile.slice(from, to);

        reader.onload = (e) => uploadChunk(e);
        reader.readAsDataURL(blob);
    };

    const uploadChunk = (readerEvent: ProgressEvent<FileReader>): void => {
        if (!uploadSocketRef.current || chunkIndex === null) {
            return;
        }

        const totalChunks = Math.ceil((choosenFile?.size ?? 0) / CHUNK_SIZE);

        const payload: UploadFile = {
            data: readerEvent.target?.result as string,
            fileSize: choosenFile?.size as number,
            totalChunks,
            chunkIndex,
        };

        const message: SocketMessage<UploadFile> = {
            type: SocketMessageType.DATA,
            payload,
        };

        uploadSocketRef.current.send(JSON.stringify(message));
        setProgress((chunkIndex / totalChunks) * 100);

        if (!(chunkIndex === totalChunks)) {
            setChunkIndex(chunkIndex + 1);

            return;
        }

        setChunkIndex(null);

        setTimeout(() => {
            setProgress(null);
            closeModal();
        }, 500);
    };

    const attachFileChangeHandler = async () => {
        if (!fileInputRef.current) return;

        const files = fileInputRef.current.files;

        if (!files?.length) return;

        const file = files[0];

        if (['image/jpeg', 'image/png'].includes(file.type)) {
            const reader = new FileReader();

            await new Promise<void>((resolve) => {
                reader.onload = function (e) {
                    setPreview(e.target?.result as string);
                    resolve();
                };

                reader.onerror = function (err) {
                    console.error(err);
                    resolve();
                };

                reader.readAsDataURL(file);
            });
        }

        setChoosenFile(file);
        setIsModalOpen(true);
    };

    const uploadFileClickHandler = (): void => {
        const encodedFilename = encodeURIComponent(choosenFile?.name as string);

        const url = `${SERVER_HOST}/upload/file/${encodedFilename}`;
        uploadSocketRef.current = new WebSocket(url);

        uploadSocketRef.current.onopen = function () {
            const message: SocketMessage<void> = {
                type: SocketMessageType.START_UPLOAD,
            };

            uploadSocketRef.current?.send(JSON.stringify(message));

            setChunkIndex(1);
        };

        uploadSocketRef.current.onmessage = async function (event) {
            const { type, payload }: SocketMessage<SuccessUploadFile> =
                JSON.parse(event.data);

            switch (type) {
                case SocketMessageType.FINISH_UPLOAD:
                    if (payload?.finalFileName) {
                        const file: MessageFile = {
                            url: `${FILES_HOST_PATH}/${payload.finalFileName}`,
                            name: choosenFile?.name ?? '',
                            type: choosenFile?.type ?? '',
                            size: choosenFile?.size ?? 0,
                            caption,
                            as_file: true,
                        };

                        if (!selectedChat?.chat) return;

                        const newMessage: MessageFactoryDto =
                            mapNewMessageModelToNewMessageDto({
                                chatId: selectedChat.chat.id,
                                text: caption,
                                files: [file],
                            });

                        try {
                            // TODO: заменить на код ниже, когда бек будет возвращать в нужном формате: { type: '', payload: '' }
                            await ChatDataService.sendMessage(newMessage);

                            // const createdMessage = mapMessageDtoToMessageModel(
                            //     await ChatDataService.sendMessage(newMessage)
                            // );

                            // setMessages((messages) => [...(messages ?? []), createdMessage]);
                            // updateChatLastMessage(createdMessage);
                        } catch (error) {
                            if (
                                error instanceof AxiosError &&
                                error.response?.status ===
                                    HttpStatusCode.Forbidden
                            ) {
                                console.log('Вас заблокировали');

                                return;
                            }

                            Promise.reject(error);
                        }
                    }
            }
        };

        uploadSocketRef.current.onclose = function () {
            console.log('Connection is closed');
        };

        uploadSocketRef.current.onerror = function (e) {
            console.log(e);
        };
    };

    const closeModal = () => {
        if (!fileInputRef.current) return;

        fileInputRef.current.value = '';
        uploadSocketRef.current = null;
        setProgress(null);

        setTimeout(() => {
            setChoosenFile(null);
            setPreview('');
        }, 400);

        setIsModalOpen(false);
    };

    return (
        <Fragment>
            <IconButton onClick={attachFileIconClickHandler}>
                <AttachFileOutlinedIcon />
            </IconButton>
            <FileInput
                type="file"
                ref={fileInputRef}
                onChange={attachFileChangeHandler}
            />
            <Dialog open={isModalOpen} onClose={closeModal} disableEnforceFocus>
                <DialogContent>
                    {preview ? (
                        <Preview src={preview} />
                    ) : (
                        <Box display="flex" alignItems="center" mb={1}>
                            <DocumentIcon />
                            <Box ml={2}>
                                <Box sx={{ fontWeight: 'bold' }}>
                                    {choosenFile?.name}
                                </Box>
                                <Box sx={{ color: 'text.secondary' }}>
                                    {prettyBytes(choosenFile?.size || 0)}
                                </Box>
                            </Box>
                        </Box>
                    )}
                    {!progress ? (
                        <TextField
                            autoFocus
                            name="caption"
                            type="text"
                            margin="normal"
                            fullWidth
                            variant="standard"
                            label="Подпись"
                            onChange={updateCaption}
                        />
                    ) : (
                        <Box mt={3} display="flex" justifyContent="center">
                            <ProgressLabel value={progress} />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeModal}>Отмена</Button>
                    <Button
                        disabled={Boolean(progress)}
                        onClick={uploadFileClickHandler}
                    >
                        Отправить
                    </Button>
                </DialogActions>
            </Dialog>
        </Fragment>
    );
};

const FileInput = styled.input`
    display: none;
`;

// const StyledAttachFileIcon = styled(AttachFileIcon)`
//     width: 24px;
//     height: 24px;
//     font-size: 1.8rem;
//     cursor: pointer;
//     margin-right: 8px;
//     opacity: 0.5;
// `;

const Preview = styled.img`
    display: block;
    max-width: 300px;
    max-height: 300px;
    margin-bottom: 12px;
`;

export default ChatMessageAttachFile;
