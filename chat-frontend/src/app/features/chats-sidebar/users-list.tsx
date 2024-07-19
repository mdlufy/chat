import {
    Avatar,
    Box,
    List,
    ListItem,
    ListItemAvatar,
    ListItemButton,
    ListItemText,
    Stack,
    Typography,
    styled,
} from '@mui/material';
import { useContext, useEffect, useState } from 'react';
import { mapUsers } from 'src/app/helpers';
import { UserContext } from 'src/app/providers/auth-provider/auth-provider';
import { UserDto, UserModel } from 'src/app/providers/auth-provider/user';
import { ChatDataService } from 'src/app/providers/chat-provider/chat-data-service';

const UsersList: React.FC<{
    search: string;
    onUserSelect: (user: UserDto) => void;
}> = ({ search, onUserSelect }) => {
    const { user } = useContext(UserContext);
    const [users, setUsers] = useState<UserModel[] | null>(null);

    useEffect(() => {
        fetchUsers();
    }, [search]);

    const fetchUsers = async () => {
        try {
            const fetchedUsers = await ChatDataService.fetchUsersByName(search);

            // TODO: переосмыслить отображение самого себя в списке пользователей
            // возможно не возвращать с бека пользователя, который запрашивает
            setUsers(
                mapUsers(fetchedUsers).filter(({ id }) => id !== user!.id)
            );
        } catch (error) {
            Promise.reject(error);
        }
    };

    return users?.length ? (
        <StyledUsersContainer>
            <StyledText variant="subtitle2">Пользователи</StyledText>
            <StyledUsersList>
                {users.map((user) => (
                    <ListItem key={user.id} disablePadding>
                        <ListItemButton onClick={() => onUserSelect(user)}>
                            <ListItemAvatar>
                                <Avatar
                                    alt=''
                                    src={user.avatar}
                                />
                            </ListItemAvatar>
                            <ListItemText
                                id={user.id}
                                primary={user.username}
                            />
                        </ListItemButton>
                    </ListItem>
                ))}
            </StyledUsersList>
        </StyledUsersContainer>
    ) : (
        <StyledEmptyUsersContainer>
            <StyledText>Не найдено. Попробуйте другой запрос</StyledText>
        </StyledEmptyUsersContainer>
    );
};

const StyledUsersContainer = styled(Stack)(({ theme }) => ({
    height: '100%',
    // padding: theme.spacing(2),
}));

const StyledEmptyUsersContainer = styled(Box)(({ theme }) => ({
    height: '100%',
    padding: theme.spacing(2),
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
}));

const StyledUsersList = styled(List)(({ theme }) => ({
    padding: theme.spacing(1),
    width: '100%',
    maxWidth: 360,
    bgcolor: 'background.paper',
    gap: 16,
}));

const StyledText = styled(Typography)(({ theme }) => ({
    padding: theme.spacing(2),
    color: '#6c737f',
    fontSize: '0.875rem',
    lineHeight: 1.57,
    fontWeight: 500,
}));

export default UsersList;
