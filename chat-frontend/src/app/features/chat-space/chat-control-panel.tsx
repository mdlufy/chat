import MoreHorizOutlinedIcon from '@mui/icons-material/MoreHorizOutlined';
import {
    Avatar,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    ListItemIcon,
    ListItemText,
    Stack,
    Typography,
    styled,
} from '@mui/material';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import { MouseEvent, useContext, useState } from 'react';
import {
    Archive,
    Delete,
    Mail,
    MailLock,
    NotificationsNone,
    NotificationsOff,
    Unarchive,
} from '@mui/icons-material';
import { ChatDataService } from '../../providers/chat-provider/chat-data-service';
import { useNavigate } from 'react-router-dom';
import { UserContext } from 'src/app/providers/auth-provider/auth-provider';
import { ChatModel } from 'src/app/providers/chat-provider/chat';
import { ChatContext } from 'src/app/providers/chat-provider/chat-provider';

const ChatControlPanel: React.FC<{ chat: ChatModel }> = ({ chat }) => {
    const { user } = useContext(UserContext);
    const { setSelectedChat, setChats } = useContext(ChatContext);
    const navigate = useNavigate();

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [openDeleteDialog, setOpenDeleteDialog] = useState(false);

    const openMenu = Boolean(anchorEl);

    const handleClickOpenDialog = () => {
        setAnchorEl(null);
        setOpenDeleteDialog(true);
    };

    const handleCloseDeleteDialog = () => {
        setOpenDeleteDialog(false);
    };

    const handleClickMenu = (event: MouseEvent<HTMLButtonElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const updateBlock = async () => {
        try {
            // TODO: для групповых чатов не имеет смысла, нужно будет делать отдельную ручку для них
            const [blockedUserId] = chat.users;

            if (!user || !blockedUserId) {
                return;
            }

            chat.blockedByMe
                ? await ChatDataService.unblockChat(blockedUserId)
                : await ChatDataService.blockChat(blockedUserId);

            setSelectedChat((selectedChat) => ({
                ...selectedChat,
                chat: {
                    ...chat,
                    blockedByMe: !chat.blockedByMe,
                },
            }));
        } catch (error) {
            Promise.reject(error);
        }
    };

    const handleDeleteChat = async (forall: boolean) => {
        try {
            await ChatDataService.deleteChat(chat.id, forall);

            // TODO: обдумать обработку удаления чата
            setAnchorEl(null);

            setChats((chats) =>
                (chats ?? []).filter(({ id }) => id !== chat.id)
            );

            navigate('..');
        } catch (error) {
            Promise.reject(error);
        }
    };

    const handleArchive = async () => {
        try {
            await ChatDataService.toggleArchiveChat(chat.id, !chat.archive);

            setSelectedChat((selectedChat) => ({
                ...selectedChat,
                chat: {
                    ...chat,
                    archive: !chat.archive,
                },
            }));
        } catch (error) {
            Promise.reject(error);
        }
    };

    const toggleMute = async () => {
        try {
            await ChatDataService.toggleMuteChat(chat.id, !chat.mute);

            setSelectedChat({
                chat: {
                    ...chat,
                    mute: !chat.mute,
                },
            });
        } catch (error) {
            Promise.reject(error);
        }
    };

    return (
        <StyledChatControlPanel>
            <StyledChatInfo>
                <Avatar />
                <StyledChatInfoContent>
                    <Typography variant="subtitle2">{chat.name}</Typography>
                    <Typography variant="caption">
                        Последняя активность 4 часа назад
                    </Typography>
                </StyledChatInfoContent>
            </StyledChatInfo>
            <StyledChatControls>
                <IconButton
                    id="basic-button"
                    aria-controls={openMenu ? 'basic-menu' : undefined}
                    aria-haspopup="true"
                    aria-expanded={openMenu ? 'true' : undefined}
                    onClick={handleClickMenu}
                >
                    <MoreHorizOutlinedIcon />
                </IconButton>
                <Menu
                    id="basic-menu"
                    anchorEl={anchorEl}
                    open={openMenu}
                    onClose={handleClose}
                    autoFocus={false}
                    MenuListProps={{
                        'aria-labelledby': 'basic-button',
                    }}
                >
                    <MenuItem onClick={updateBlock}>
                        <ListItemIcon>
                            {chat.blockedByMe ? (
                                <Mail fontSize="small" />
                            ) : (
                                <MailLock fontSize="small" />
                            )}
                        </ListItemIcon>
                        <ListItemText>
                            {chat.blockedByMe
                                ? 'Разблокировать'
                                : 'Заблокировать'}
                        </ListItemText>
                    </MenuItem>
                    <MenuItem onClick={handleClickOpenDialog}>
                        <ListItemIcon>
                            <Delete fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Удалить</ListItemText>
                    </MenuItem>
                    <MenuItem onClick={handleArchive}>
                        <ListItemIcon>
                            {chat.archive ? (
                                <Unarchive fontSize="small" />
                            ) : (
                                <Archive fontSize="small" />
                            )}
                        </ListItemIcon>
                        <ListItemText>
                            {chat.archive ? 'Разархивировать' : 'Архивировать'}
                        </ListItemText>
                    </MenuItem>
                    <MenuItem onClick={toggleMute}>
                        <ListItemIcon>
                            {chat.mute ? (
                                <NotificationsNone fontSize="small" />
                            ) : (
                                <NotificationsOff fontSize="small" />
                            )}
                        </ListItemIcon>
                        <ListItemText>
                            {chat.mute
                                ? 'Включить уведомления'
                                : 'Отключить уведомления'}
                        </ListItemText>
                    </MenuItem>
                </Menu>
                <Dialog
                    open={openDeleteDialog}
                    onClose={handleCloseDeleteDialog}
                    aria-labelledby="alert-dialog-title"
                    aria-describedby="alert-dialog-description"
                >
                    <DialogTitle id="alert-dialog-title">
                        {'Удалить чат'}
                    </DialogTitle>
                    <DialogContent>
                        <DialogContentText id="alert-dialog-description">
                            Вы уверены что хотите удалить этот чат?
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCloseDeleteDialog}>Назад</Button>
                        <Button
                            onClick={() => handleDeleteChat(false)}
                            color="error"
                        >
                            Удалить только для меня
                        </Button>
                        <Button
                            onClick={() => handleDeleteChat(true)}
                            color="error"
                        >
                            Удалить для всех
                        </Button>
                    </DialogActions>
                </Dialog>
            </StyledChatControls>
        </StyledChatControlPanel>
    );
};

const StyledChatControlPanel = styled(Stack)(({ theme }) => ({
    padding: theme.spacing(1, 2),
    minHeight: 64,
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
}));

const StyledChatInfo = styled(Stack)({
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
});

const StyledChatInfoContent = styled(Stack)(({ theme }) => ({
    marginLeft: theme.spacing(2),
}));

const StyledChatControls = styled(Stack)(({ theme }) => ({
    display: 'flex',
    gap: theme.spacing(1),
    flexDirection: 'row',
    alignItems: 'center',
}));

export default ChatControlPanel;
