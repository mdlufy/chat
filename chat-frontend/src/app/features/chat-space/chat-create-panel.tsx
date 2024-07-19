import { Search } from '@mui/icons-material';
import {
    Avatar,
    Box,
    Button,
    Chip,
    InputAdornment,
    ListItem,
    Popover,
    Stack,
    TextField,
    Typography,
    styled,
} from '@mui/material';
import { ChangeEvent, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mapChatDtoToChatModel } from 'src/app/helpers';
import { UserDto } from 'src/app/providers/auth-provider/user';
import { ChatFactoryModel } from 'src/app/providers/chat-provider/chat';
import { ChatDataService } from 'src/app/providers/chat-provider/chat-data-service';
import UsersList from '../chats-sidebar/users-list';

const ChatCreatePanel: React.FC = () => {
    const [search, setSearch] = useState('');
    const [selectedUsers, setSelectedUsers] = useState<UserDto[]>([]);
    const [anchorEl, setAnchorEl] = useState<HTMLDivElement | null>(null);
    const searchRef = useRef<HTMLDivElement | null>(null);
    const navigate = useNavigate();

    const handleClose = () => {
        setAnchorEl(null);
    };

    const open = Boolean(anchorEl);

    const onSearch = (event: ChangeEvent<HTMLInputElement>) => {
        const value = event.target.value;

        setSearch(value);
        setAnchorEl(value.length ? searchRef.current : null);
    };

    const selectUser = (user: UserDto): void => {
        setSelectedUsers((users) => [...users, user]);

        setSearch('');
        setAnchorEl(null);
    };

    const deleteUser = (userToDelete: UserDto) => () => {
        setSelectedUsers((users) =>
            users.filter((user) => user.id !== userToDelete.id)
        );
    };

    const createGroupChat = async (): Promise<void> => {
        const chat: ChatFactoryModel = {
            name: selectedUsers.map((user) => user.username).join(', '),
            users: selectedUsers.map((user) => user.id),
            description: '',
            avatar: '',
        };

        try {
            const createdChat = mapChatDtoToChatModel(
                await ChatDataService.createChat(chat)
            );

            // TODO: разобраться, почему некорректно работает и дважды происходит отправка
            // на всякий случай закладываемся, чтобы избежать двойного добавления
            // т.к. неизвестно, где обработается быстрее: по ws или по http
            // setChats((chats) =>
            //     findChatById(chats ?? [], createdChat.id)
            //         ? chats
            //         : [createdChat, ...(chats ?? [])]
            // );

            navigate(`#${createdChat.id}`);
        } catch (error) {
            Promise.reject(error);
        }
    };

    return (
        <StyledChatCreatePanelContainer>
            <StyledChatCreatePanel>
                <StyledSearch
                    size="small"
                    placeholder="Поиск контактов"
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search />
                            </InputAdornment>
                        ),
                    }}
                    ref={searchRef}
                    value={search}
                    onChange={onSearch}
                />
                <Popover
                    open={open}
                    anchorEl={anchorEl}
                    onClose={handleClose}
                    anchorOrigin={{
                        vertical: 48,
                        horizontal: 'left',
                    }}
                    disableAutoFocus
                >
                    <UsersList search={search} onUserSelect={selectUser} />
                </Popover>
                <StyledText>To:</StyledText>
                <StyledSelectedUsers>
                    {selectedUsers.map((user) => (
                        <ListItem key={user.id} disablePadding>
                            <Chip
                                avatar={<Avatar src={user.avatar} />}
                                label={user.username}
                                variant="outlined"
                                onDelete={deleteUser(user)}
                            />
                        </ListItem>
                    ))}
                </StyledSelectedUsers>
            </StyledChatCreatePanel>
            <StyledChatCreateActions>
                <Button variant='outlined' onClick={createGroupChat}>Создать</Button>
            </StyledChatCreateActions>
        </StyledChatCreatePanelContainer>
    );
};
const StyledChatCreatePanelContainer = styled(Stack)(({ theme }) => ({
    gap: 36,
    padding: theme.spacing(2),
    minHeight: 64,
    width: '100%',
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
}));

const StyledChatCreatePanel = styled(Box)(({ theme }) => ({
    display: 'flex',
    flexDirection: 'row',
    gap: 16,
    overflowX: 'auto',
    alignItems: 'center',
}));

const StyledSearch = styled(TextField)(({ theme }) => ({
    fieldset: {
        borderRadius: 8,
    },
}));

const StyledText = styled(Typography)(({ theme }) => ({
    color: '#6c737f',
    fontSize: '0.875rem',
    lineHeight: 1.57,
    fontWeight: 400,
}));

const StyledSelectedUsers = styled(Stack)(({ theme }) => ({
    maxWidth: 570,
    display: 'flex',
    flexDirection: 'row',
    gap: 16,
    alignItems: 'center',
    overflowX: 'auto',
}));

const StyledChatCreateActions = styled(Box)(({ theme }) => ({
    display: 'flex',
}));

export default ChatCreatePanel;
