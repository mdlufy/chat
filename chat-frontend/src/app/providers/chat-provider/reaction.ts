export interface ReactionDto {
    id: number;
    user_id: string;
    mes_id: number;
    name: string;
    avatar: {
        image: string;
        color: string;
    };
}
export interface ReactionModel {
    id: number;
    userId: string;
    mesId: number;
    name: string;
    avatar: {
        image: string;
        color: string;
    };
}
