import { createContext, useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { axiosInstance } from '../../axios';
import { AuthDataService } from './auth-data-service';
import { AuthForm } from '../../features/auth-page/auth-page';
import { UserDto } from './user';
import { AxiosError, HttpStatusCode } from 'axios';

export interface AuthContext {
    isAuth: boolean | null;
    user: UserDto | null;
    loginFn: (authForm: AuthForm) => void;
    logoutFn: () => void;
}

export const AuthContext = createContext<AuthContext>({
    isAuth: null,
    user: null,
    loginFn: () => {},
    logoutFn: () => {},
});

// TODO: вынести в отдельный контекст
export const UserContext = AuthContext;

const TOKEN_STORAGE_KEY = 'token';

const AuthProvider: React.FC = () => {
    const [isAuth, setIsAuth] = useState<boolean | null>(null);
    const [user, setUser] = useState<UserDto | null>(null);

    const navigate = useNavigate();

    useEffect(() => {
        // addAuthInterceptors();
        checkAuth();
    }, []);

    // const addAuthInterceptors = (): void => {
    //     axiosInstance.interceptors.response.use(
    //         function (response) {
    //             return response;
    //         },
    //         function (error: AxiosError) {
    //             console.log('LOG', error.response?.status);

    //             if (error.response?.status === HttpStatusCode.Unauthorized) {
    //                 navigate('/login');
    //             }
    //         }
    //     );
    // };

    const checkAuth = (): void => {
        const token = sessionStorage.getItem(TOKEN_STORAGE_KEY);

        if (!token) {
            logoutFn();
            return;
        }

        // handleSuccessAuth(token);
        setIsAuth(true);
        axiosInstance.defaults.headers.common.Authorization = token;
        getUser();

        navigate('/');
    };

    const getUser = async () => {
        try {
            const fetchedUser = await AuthDataService.fetchMe();

            setUser(fetchedUser);
        } catch (error) {
            if (
                error instanceof AxiosError &&
                error.response?.status === HttpStatusCode.Unauthorized
            ) {
                navigate('/login');
            }
        }
    };

    const loginFn = async (authForm: AuthForm): Promise<void> => {
        try {
            const fetchedCreds = await AuthDataService.login(authForm);
            const token = `${fetchedCreds.token_type} ${fetchedCreds.access_token}`;

            sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
            axiosInstance.defaults.headers.common.Authorization = token;

            setIsAuth(true);
            getUser();

            navigate('/');
        } catch (error) {
            Promise.reject(error);
        }
    };

    // const handleSuccessAuth = (token: string): void => {
    //     sessionStorage.setItem(TOKEN_STORAGE_KEY, token);
    //     axiosInstance.defaults.headers.common.Authorization = token;

    //     getUser();
    // };

    const clearToken = (): void => {
        sessionStorage.removeItem(TOKEN_STORAGE_KEY);
        axiosInstance.defaults.headers.common.Authorization = undefined;
    };

    const logoutFn = (): void => {
        setIsAuth(false);
        clearToken();

        navigate('/login');
    };

    return (
        <AuthContext.Provider
            value={{
                isAuth,
                user,
                loginFn,
                logoutFn,
            }}
        >
            <Outlet />
        </AuthContext.Provider>
    );
};

export default AuthProvider;
