import { Add } from '@mui/icons-material';
import { Button, styled } from '@mui/material';
import Typography from '@mui/material/Typography';
import React, { useContext } from 'react';
import { defaultChatModel } from 'src/app/helpers';
import { ChatType } from 'src/app/providers/chat-provider/chat';
import { ChatContext } from 'src/app/providers/chat-provider/chat-provider';
import StyledDrawer from '../../styled/drawer';
import StyledDrawerHeader from '../../styled/drawer-header';
import { DrawerStatusProps } from '../app-drawer/app-drawer-props';
import ChatsList from './chats-list';

const ChatsSidebar: React.FC<DrawerStatusProps> = ({ drawerOpen }) => {
    const { chats, folders, selectedChat, setSelectedChat } =
        useContext(ChatContext);

    const openAddGroupPanel = (): void => {
        setSelectedChat({
            chat: {
                ...defaultChatModel,
                type: ChatType.GROUP,
            },
            draft: true,
        });
    };

    return (
        // TODO: разобраться, какой variant предпочительнее: persistent или permanent
        <StyledDrawer variant="persistent" anchor="left" open={drawerOpen}>
            <StyledDrawerHeader>
                <StyledHeaderText variant="h5">Чаты</StyledHeaderText>
                <StyledButton
                    onClick={openAddGroupPanel}
                    startIcon={<Add />}
                    variant="contained"
                    disableElevation
                >
                    Группа
                </StyledButton>
            </StyledDrawerHeader>
            {chats && folders && (
                <ChatsList
                    chats={chats}
                    folders={folders}
                    selectedChat={selectedChat}
                    setSelectedChat={setSelectedChat}
                />
            )}
        </StyledDrawer>
    );
};

const StyledHeaderText = styled(Typography)({
    fontWeight: 700,
    lineHeight: 1.2,
});

const StyledButton = styled(Button)(({ theme }) => ({
    padding: theme.spacing(1, 1.5),
    backgroundColor: '#6366f1',
    fontWeight: 600,
    borderRadius: 12,
    textTransform: 'none',
    ':hover': {
        backgroundColor: '#4338CA',
    },
}));

export default ChatsSidebar;
