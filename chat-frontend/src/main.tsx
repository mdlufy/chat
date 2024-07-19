import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import * as ReactDOM from 'react-dom/client';
import './index.css';

import { RouterProvider, createBrowserRouter } from 'react-router-dom';
import App from './app/app';
import AuthPage from './app/features/auth-page/auth-page';
import PrivateRoute from './app/features/auth-page/private-route';
import AuthProvider from './app/providers/auth-provider/auth-provider';

const router = createBrowserRouter([
    {
        element: <AuthProvider />,
        children: [
            {
                path: '/',
                element: <PrivateRoute />,
                children: [
                    {
                        path: '/',
                        element: <App />,
                    },
                ],
            },
            {
                path: '/login',
                element: <AuthPage />,
            },
        ],
    },
]);

const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);
root.render(<RouterProvider router={router} />);
