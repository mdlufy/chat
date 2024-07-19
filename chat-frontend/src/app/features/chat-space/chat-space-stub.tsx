import { Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

const ChatSpaceStub: React.FC = () => {
    return (
        <>
            <StyledWelcomeIcon src="/assets/images/error-404.png" />
            <StyledWelcomeText>Начните диалог!</StyledWelcomeText>
        </>
    );
};

const StyledWelcomeIcon = styled('img')({
    maxWidth: 120,
});

const StyledWelcomeText = styled(Typography)(({ theme }) => ({
    color: '#6c737f',
    marginTop: theme.spacing(2),
    fontSize: '1rem',
    lineHeight: 1.57,
    fontWeight: 500,
}));

export default ChatSpaceStub;
