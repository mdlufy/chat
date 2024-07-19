import { AuthForm } from '../../features/auth-page/auth-page';
import { axiosInstance } from 'src/app/axios';
import { UserDto } from './user';

interface AuthResponseDto {
    access_token: string;
    token_type: string;
}

export class AuthDataService {
    public static login = (authForm: AuthForm): Promise<AuthResponseDto> => {
        const data = new URLSearchParams(
            authForm as unknown as Record<string, string>
        );

        return axiosInstance
            .post(`/token`, data)
            .then((response) => response.data);
    };

    public static fetchMe = (): Promise<UserDto> => {
        return axiosInstance
            .get(`/users/me/`)
            .then((response) => response.data);
    };
}
