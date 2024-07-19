import { Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

const ChatEmptyStub: React.FC = () => {
    return (
        <Box display='flex' justifyContent='center'>
            {/* <img src='./frontend/empty-chat-emoji.png'/> */}
            <StyledWelcomeText>Нет сообщений</StyledWelcomeText>
        </Box>
    );
};

const StyledWelcomeText = styled(Typography)(({ theme }) => ({
    color: '#6c737f',
    marginTop: theme.spacing(2),
    fontSize: '1rem',
    lineHeight: 1.57,
    fontWeight: 500,
}));

export default ChatEmptyStub;
