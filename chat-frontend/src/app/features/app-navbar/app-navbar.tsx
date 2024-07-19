import {
    AppBar,
    Avatar,
    Container,
    Menu,
    MenuItem,
    Toolbar,
    Tooltip,
    Typography,
    styled,
} from '@mui/material';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import React, { MouseEvent, useContext, useState } from 'react';
import { UserContext } from 'src/app/providers/auth-provider/auth-provider';
import { RazumAiWhiteLogoIcon } from 'src/assets/icons/RazumAiWhiteLogoIcon';

const AppNavbar: React.FC = () => {
    const [anchorElUser, setAnchorElUser] = useState<null | HTMLElement>(null);
    const { user, logoutFn } = useContext(UserContext);

    const handleOpenUserMenu = (event: MouseEvent<HTMLElement>) => {
        setAnchorElUser(event.currentTarget);
    };

    const handleCloseUserMenu = () => {
        setAnchorElUser(null);
    };

    return (
        <StyledAppBar elevation={1}>
            <Container maxWidth="xl">
                <Toolbar disableGutters>
                    <Box sx={{ flexGrow: 0 }}>
                        <Tooltip title="Open settings">
                            <IconButton
                                onClick={handleOpenUserMenu}
                                sx={{ p: 0 }}
                            >
                                <Avatar alt="" src={user?.avatar} />
                            </IconButton>
                        </Tooltip>
                        <Menu
                            sx={{ mt: '45px' }}
                            id="menu-appbar"
                            anchorEl={anchorElUser}
                            anchorOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                            keepMounted
                            transformOrigin={{
                                vertical: 'top',
                                horizontal: 'right',
                            }}
                            open={Boolean(anchorElUser)}
                            onClose={handleCloseUserMenu}
                        >
                            <MenuItem disabled>
                                <StyledHeaderText>
                                    {user ? user.username : 'Loading'}
                                </StyledHeaderText>
                            </MenuItem>
                            <MenuItem onClick={logoutFn}>
                                <Typography textAlign="center">
                                    Выйти
                                </Typography>
                            </MenuItem>
                        </Menu>
                    </Box>
                </Toolbar>
            </Container>
        </StyledAppBar>
    );
};

const StyledAppBar = styled(AppBar)({
    position: 'fixed',
    backgroundColor: '#6366f1',
});

const StyledHeaderText = styled(Typography)({
    fontWeight: 600,
});

export default AppNavbar;
