import MenuIcon from '@mui/icons-material/Menu';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import { styled } from '@mui/material/styles';
import React from 'react';
import { StyledDivider } from 'src/app/styled/divider';
import { DRAWER_WIDTH } from '../../styled/drawer';
import ChatSpace from '../chat-space/chat-space';
import ChatsSidebar from '../chats-sidebar/chats-sidebar';
import { AppDrawerProps, DrawerStatusProps } from './app-drawer-props';

const AppDrawer: React.FC<AppDrawerProps> = ({ drawerOpen, setDrawerOpen }) => {
    const changeDrawerState = (): void => {
        setDrawerOpen((curr) => !curr);
    };

    return (
        <StyledAppContainer>
            <ChatsSidebar drawerOpen={drawerOpen}></ChatsSidebar>
            <StyledChatLayout drawerOpen={drawerOpen}>
                <StyledChatBar drawerOpen={drawerOpen}>
                    <Box sx={{ p: 2 }}>
                        <IconButton onClick={changeDrawerState} sx={{ mr: 2 }}>
                            <MenuIcon />
                        </IconButton>
                    </Box>
                </StyledChatBar>
                <StyledDivider variant="fullWidth" flexItem />
                <ChatSpace />
            </StyledChatLayout>
        </StyledAppContainer>
    );
};

const StyledAppContainer = styled(Box)({
    position: 'fixed',
    display: 'flex',
    marginTop: 64,
    inset: 0,
});

const StyledChatBar = styled(Box, {
    shouldForwardProp: (prop) => prop !== 'drawerOpen',
})<DrawerStatusProps>(({ theme, drawerOpen }) => ({
    backgroundColor: theme.palette.background.default,
    transition: theme.transitions.create(['margin', 'width'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
    ...(drawerOpen && {
        transition: theme.transitions.create(['margin', 'width'], {
            easing: theme.transitions.easing.easeOut,
            duration: theme.transitions.duration.enteringScreen,
        }),
    }),
}));

const StyledChatLayout = styled(Box, {
    shouldForwardProp: (prop) => prop !== 'drawerOpen',
})<DrawerStatusProps>(({ theme, drawerOpen }) => ({
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    overflow: 'hidden',
    transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: `-${DRAWER_WIDTH}px`,
    ...(drawerOpen && {
        transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.easeOut,
            duration: theme.transitions.duration.enteringScreen,
        }),
        marginLeft: 0,
    }),
}));

export default AppDrawer;
