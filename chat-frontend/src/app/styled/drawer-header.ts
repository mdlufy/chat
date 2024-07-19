import { styled } from '@mui/material';

const StyledDrawerHeader = styled('div')(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    // necessary for content to be below app bar
    ...theme.mixins.toolbar,
}));

export default StyledDrawerHeader;
