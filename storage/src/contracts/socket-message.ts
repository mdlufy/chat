export enum SocketMessageType {
    DATA = 'Data',
    START_UPLOAD = 'Start upload',
    FINISH_UPLOAD = 'Finish upload',
    START_DOWNLOAD = 'Start download',
    FINISH_DOWNLOAD = 'Finish download',
}

export interface SocketMessage<T> {
    type: SocketMessageType;
    payload?: T;
}
