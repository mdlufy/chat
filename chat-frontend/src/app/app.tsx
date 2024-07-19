import { useState } from 'react';
import AppDrawer from './features/app-drawer/app-drawer';
import AppNavbar from './features/app-navbar/app-navbar';
import ChatProvider from './providers/chat-provider/chat-provider';

export function App() {
    const [drawerOpen, setDrawerOpen] = useState(true);

    return (
        <ChatProvider>
            <AppNavbar />
            <AppDrawer drawerOpen={drawerOpen} setDrawerOpen={setDrawerOpen} />
        </ChatProvider>
    );
}

export default App;
