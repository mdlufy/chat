import { ChatModel } from './chat';

export interface SelectedChat {
    chat: ChatModel | null;
    draft?: boolean;
}
