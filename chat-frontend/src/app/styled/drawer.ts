import { Drawer, styled } from '@mui/material';

export const DRAWER_WIDTH = 380;

const StyledDrawer = styled(Drawer)(({ theme }) => ({
    width: DRAWER_WIDTH,
    flexShrink: 0,
    '& .MuiDrawer-paper': {
        // TODO: подумать, как сделать корректный отступ в навбаре
        marginTop: 64,
        padding: theme.spacing(2),
        width: DRAWER_WIDTH,
        boxSizing: 'border-box',
        borderRight: '1px solid #f2f4f7',
        gap: 16,
    },
}));

export default StyledDrawer;
