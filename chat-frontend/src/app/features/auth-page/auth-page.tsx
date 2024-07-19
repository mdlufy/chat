import {
    Box,
    Button,
    Container,
    CssBaseline,
    TextField,
    Typography,
    styled,
} from '@mui/material';
import { ChangeEvent, SyntheticEvent, useContext, useState } from 'react';
import { AuthContext } from 'src/app/providers/auth-provider/auth-provider';

export interface AuthForm {
    username: string;
    password: string;
}

const AuthPage: React.FC = () => {
    const [authInput, setAuthInput] = useState<AuthForm>({
        username: '',
        password: '',
    });
    const { loginFn } = useContext(AuthContext);

    const onInputChange = (event: ChangeEvent<HTMLInputElement>): void => {
        const { name, value } = event.target;

        setAuthInput((input) => ({
            ...input,
            [name]: value,
        }));
    };

    const handleSubmit = (event: SyntheticEvent): void => {
        event.preventDefault();

        loginFn(authInput);
    };

    return (
        <Container component="main" maxWidth="xs">
            <CssBaseline />
            <Box
                sx={{
                    marginTop: 8,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                }}
            >
                <Typography component="h1" variant="h5">
                    Авторизация
                </Typography>
                <Box
                    component="form"
                    onSubmit={handleSubmit}
                    noValidate
                    sx={{ mt: 1 }}
                >
                    <TextField
                        name="username"
                        type="email"
                        margin="normal"
                        fullWidth
                        required
                        label="Логин"
                        placeholder="example@mail.ru"
                        onChange={onInputChange}
                    />
                    <TextField
                        name="password"
                        type="password"
                        margin="normal"
                        fullWidth
                        required
                        label="Пароль"
                        onChange={onInputChange}
                    />
                    <StyledButton
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                    >
                        Войти
                    </StyledButton>
                </Box>
            </Box>
        </Container>
    );
};

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

export default AuthPage;
