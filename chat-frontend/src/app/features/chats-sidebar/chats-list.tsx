import {
    Add,
    CheckCircle,
    Folder,
    RadioButtonUnchecked,
} from '@mui/icons-material';
import SearchIcon from '@mui/icons-material/Search';
import {
    Avatar,
    AvatarGroup,
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    FormGroup,
    InputAdornment,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Stack,
    Tab,
    Tabs,
    TextField,
    Typography,
    styled,
} from '@mui/material';
import React, {
    ChangeEvent,
    MouseEvent,
    useContext,
    useEffect,
    useState,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    defaultChatModel,
    findChatById,
    formatDate,
    isValidMessage,
    mapFolderDtoToFolderModel,
} from 'src/app/helpers';
import { UserDto, UserModel } from 'src/app/providers/auth-provider/user';
import { ChatModel, ChatType } from 'src/app/providers/chat-provider/chat';
import { ChatDataService } from 'src/app/providers/chat-provider/chat-data-service';
import { ChatContext } from 'src/app/providers/chat-provider/chat-provider';
import { FolderModel } from 'src/app/providers/chat-provider/folder';
import UsersList from './users-list';

const ChatsList: React.FC<{
    chats: ChatModel[];
    folders: FolderModel[];
    selectedChat: ChatContext['selectedChat'];
    setSelectedChat: ChatContext['setSelectedChat'];
}> = ({ chats, folders, selectedChat, setSelectedChat }) => {
    const { setFolders } = useContext(ChatContext);
    const [search, setSearch] = useState('');
    const [folderIndex, setFolderIndex] = useState(0);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [openedContextMenuChat, setOpenedContextMenuChat] =
        useState<ChatModel | null>(null);
    const [openFolderDialog, setOpenFolderDialog] = useState(false);
    const [newFolderDialog, setNewFolderDialog] = useState(false);
    const [newFolderName, setNewFolderName] = useState<string>('');
    const [newFolderDescription, setNewFolderDescription] =
        useState<string>('');
    const [selectedFolders, setSelectedFolders] = useState<
        Record<FolderModel['id'], boolean>
    >({});
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        initChat();
    }, [location]);

    const initChat = () => {
        const hash = location.hash.substring(1);

        if (!hash.length) {
            setSelectedChat(null);

            return;
        }

        const chat = findChatById(chats, +hash) ?? null;

        setSelectedChat({ chat });
    };

    const openMenu = Boolean(anchorEl);

    const changeFolder = (event: React.SyntheticEvent, tabIndex: number) => {
        setFolderIndex(tabIndex);
    };

    const changeFolderCheckbox = (event: ChangeEvent<HTMLInputElement>) => {
        setSelectedFolders({
            ...selectedFolders,
            [event.target.name]: event.target.checked,
        });
    };

    const filterChatBySearch = (chat: ChatModel): boolean => {
        if (!search.length) {
            return true;
        }

        return new RegExp(search, 'i').test(chat.name);
    };

    const filterChatByFolder = (chat: ChatModel): boolean => {
        if (!folders.length || folderIndex === 0) {
            return true;
        }

        return folders[folderIndex - 1].chats.includes(chat.id);
    };

    const filteredChats = chats.filter(
        (chat) =>
            filterChatBySearch(chat) &&
            filterChatByFolder(chat) &&
            isValidMessage(chat.lastMessage)
    );

    const isChatSelected = (chat: ChatModel): boolean | undefined => {
        return selectedChat?.chat
            ? selectedChat.chat.id === chat.id
            : undefined;
    };

    const onSearch = (event: ChangeEvent<HTMLInputElement>) => {
        setSearch(event.target.value);
    };

    const openChat = (chat: ChatModel) => {
        // setSelectedChat((selectedChat) => ({ ...selectedChat, chat }));
        setSelectedChat({ chat });
        navigate(`#${chat.id}`);
    };

    const openChatMenu = (
        event: MouseEvent<HTMLDivElement>,
        chat: ChatModel
    ) => {
        event.preventDefault();

        setAnchorEl(event.currentTarget);
        setOpenedContextMenuChat(chat);
    };

    const onCloseMenu = () => {
        setAnchorEl(null);
    };

    const updateNewFolderName = (
        event: ChangeEvent<HTMLInputElement>
    ): void => {
        setNewFolderName(event.target.value);
    };

    const updateNewFolderDescription = (
        event: ChangeEvent<HTMLInputElement>
    ): void => {
        setNewFolderDescription(event.target.value);
    };

    const openFoldersDialog = () => {
        setAnchorEl(null);
        setOpenFolderDialog(true);
    };

    const closeFoldersDialog = () => {
        setOpenFolderDialog(false);
    };

    const closeNewFolderDialog = () => {
        setNewFolderDialog(false);
        setNewFolderName('');
        setNewFolderDescription('');
    };

    const openNewFolderDialog = (): void => {
        setOpenFolderDialog(false);
        setNewFolderDialog(true);
    };

    const openChatSpace = (user: UserDto): void => {
        const chat = findChatWithUserByTheirId(chats!, user);

        chat
            ? setSelectedChat({ chat })
            : setSelectedChat({
                  chat: {
                      ...defaultChatModel,
                      name: user.username,
                      avatar: user.avatar,
                      users: [user.id],
                  },
                  draft: true,
              });
    };

    // TODO: переосмыслить, как лучше определять, существует ли уже чат с пользователем или нет
    // пока что поиск только по приватным чатам
    // нужно учесть, что пользователь может состоять в общих групповых чатах
    const findChatWithUserByTheirId = (
        chats: ChatModel[],
        user: UserModel
    ): ChatModel | null => {
        return (
            chats.find(
                (chat) =>
                    chat.type === ChatType.PRIVATE && chat.users[0] === user.id
            ) ?? null
        );
    };

    const getSelectedFoldersIds = () => {
        return Object.entries(selectedFolders)
            .filter(([_, value]) => Boolean(value))
            .map(([id, _]) => +id);
    };

    const createNewFolder = async () => {
        try {
            const createdFolder = await ChatDataService.createFolder({
                name: newFolderName,
                description: newFolderDescription,
                chats: [],
            });

            setFolders((folders) => [
                ...folders!,
                mapFolderDtoToFolderModel(createdFolder),
            ]);

            closeNewFolderDialog();
            openFoldersDialog();
        } catch (error) {
            Promise.reject(error);
        }
    };

    const addChatToFolders = async () => {
        try {
            const selectedFoldersIds = getSelectedFoldersIds();

            await ChatDataService.addChatToFolders(
                openedContextMenuChat!.id,
                selectedFoldersIds
            );

            closeFoldersDialog();

            // возможно стоит инвалидировать ручку с папками вместо setFolders
            setFolders((folders) =>
                folders!.map((folder) =>
                    selectedFoldersIds.includes(folder.id)
                        ? {
                              ...folder,
                              chats: [
                                  ...folder.chats,
                                  openedContextMenuChat!.id,
                              ],
                          }
                        : folder
                )
            );
        } catch (error) {
            Promise.reject(error);
        }
    };

    return (
        <>
            <StyledSearch
                size="small"
                placeholder="Поиск контактов"
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <SearchIcon />
                        </InputAdornment>
                    ),
                }}
                value={search}
                onChange={onSearch}
            />
            {search.length >= 1 ? (
                <UsersList search={search} onUserSelect={openChatSpace} />
            ) : (
                <>
                    <Box display="flex">
                        <Tabs
                            value={folderIndex}
                            onChange={changeFolder}
                            variant="scrollable"
                            scrollButtons={false}
                            sx={{ flex: 1 }}
                        >
                            <StyledTab key={0} label="Вcе" />
                            {folders.map((folder) => (
                                <StyledTab
                                    key={folder.id}
                                    label={folder.name}
                                />
                            ))}
                        </Tabs>
                    </Box>
                    <StyledChats spacing={0.5}>
                        {filteredChats.map((chat) => (
                            <StyledChat
                                key={chat.id}
                                selected={isChatSelected(chat)}
                                onClick={() => openChat(chat)}
                                onContextMenu={(event) =>
                                    openChatMenu(event, chat)
                                }
                                disableRipple
                            >
                                <AvatarGroup>
                                    <StyledChatAvatar
                                        src={chat.avatar}
                                        variant={
                                            chat.users.length > 1
                                                ? 'rounded'
                                                : 'circular'
                                        }
                                    >
                                        {chat.name[0].toUpperCase()}
                                    </StyledChatAvatar>
                                </AvatarGroup>
                                <StyledChatMetadata>
                                    <StyledChatName variant="subtitle2">
                                        {chat.name}
                                    </StyledChatName>
                                    <StyledChatContent>
                                        <StyledChatContentText variant="subtitle2">
                                            {isValidMessage(chat.lastMessage) &&
                                                chat.lastMessage.payload.text}
                                        </StyledChatContentText>
                                    </StyledChatContent>
                                </StyledChatMetadata>
                                <StyledChatTimestamp variant="caption">
                                    {isValidMessage(chat.lastMessage) &&
                                        formatDate(
                                            chat.lastMessage.payload.timeCreated
                                        )}
                                </StyledChatTimestamp>
                            </StyledChat>
                        ))}
                    </StyledChats>
                </>
            )}
            <Menu
                id="basic-menu"
                anchorEl={anchorEl}
                open={openMenu}
                onClose={onCloseMenu}
                autoFocus={false}
                MenuListProps={{
                    'aria-labelledby': 'basic-button',
                }}
            >
                <MenuItem onClick={openFoldersDialog}>
                    <ListItemIcon>
                        <Folder fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Добавить в папку...</ListItemText>
                </MenuItem>
            </Menu>
            <Dialog open={openFolderDialog} onClose={closeFoldersDialog}>
                <DialogTitle>{'Добавить в папку'}</DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={1}>
                        <FormGroup>
                            {folders.map((folder) => (
                                <FormControlLabel
                                    key={folder.id}
                                    control={
                                        <Checkbox
                                            icon={<RadioButtonUnchecked />}
                                            checkedIcon={<CheckCircle />}
                                            onChange={changeFolderCheckbox}
                                        />
                                    }
                                    name={String(folder.id)}
                                    label={folder.name}
                                    defaultChecked={false}
                                    checked={
                                        selectedFolders[folder.id] ?? false
                                    }
                                />
                            ))}
                        </FormGroup>
                        <Button
                            onClick={openNewFolderDialog}
                            variant="text"
                            startIcon={<Add />}
                            size="small"
                        >
                            Создать папку
                        </Button>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeFoldersDialog}>Отменить</Button>
                    <Button onClick={addChatToFolders}>Добавить</Button>
                </DialogActions>
            </Dialog>
            <Dialog
                open={newFolderDialog}
                onClose={closeNewFolderDialog}
                disableEnforceFocus
            >
                <DialogTitle>{'Создать папку'}</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        required
                        name="name"
                        type="text"
                        margin="normal"
                        fullWidth
                        variant="standard"
                        label="Название"
                        onChange={updateNewFolderName}
                    />
                    <TextField
                        name="description"
                        type="text"
                        margin="normal"
                        fullWidth
                        variant="standard"
                        label="Описание"
                        onChange={updateNewFolderDescription}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={closeNewFolderDialog}>Отмена</Button>
                    <Button
                        disabled={!newFolderName.length}
                        onClick={createNewFolder}
                    >
                        Создать
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

const StyledTab = styled(Tab)(({ theme }) => ({
    minWidth: 'fit-content',
    flex: 1,
    textTransform: 'none',
}));

const StyledSearch = styled(TextField)(({ theme }) => ({
    fieldset: {
        borderRadius: 8,
    },
}));

const StyledChats = styled(Stack)(({ theme }) => ({}));

const StyledChat = styled(ListItemButton)(({ theme }) => ({
    padding: theme.spacing(2, 3),
    display: 'flex',
    borderRadius: 20,
    '&.Mui-selected': {
        backgroundColor: 'rgb(17, 25, 39, 0.04)',
        ':hover': {
            backgroundColor: 'rgb(17, 25, 39, 0.04)',
        },
    },
}));

const StyledChatAvatar = styled(Avatar)({
    height: 36,
    width: 36,
});

const StyledChatMetadata = styled(Box)(({ theme }) => ({
    marginLeft: theme.spacing(2),
    flexGrow: 1,
    overflow: 'hidden',
}));

const StyledChatName = styled(Typography)({
    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    textTransform: 'capitalize',
});

const StyledChatContent = styled(Stack)({
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'row',
});

const StyledChatContentText = styled(Typography)({
    color: '#6C737F',
});

const StyledChatTimestamp = styled(Typography)(({ theme }) => ({
    marginLeft: theme.spacing(2),

    overflow: 'hidden',
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',

    height: '100%',
    fontWeight: 500,
    color: '#6C737F',
}));

export default ChatsList;
