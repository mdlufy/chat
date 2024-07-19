export type AppDrawerProps = {
    drawerOpen: boolean;
    setDrawerOpen: React.Dispatch<React.SetStateAction<boolean>>;
};

export type DrawerStatusProps = Pick<AppDrawerProps, 'drawerOpen'>;
