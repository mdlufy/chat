import datetime
from typing import Union

from pydantic import BaseModel


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    user_id: Union[str, None] = None


class User(BaseModel):
    id: str
    username: str
    email: str
    avatar: str


class ChatUser(BaseModel):
    id: str
    username: str
    email: str
    avatar: str
    chat_role: int


class Media(BaseModel):
    url: str
    name: str
    type: str
    size: int
    caption: str
    as_file: bool


class CreateMessage(BaseModel):
    chat_id: int
    text: str
    files: list[Media]


class CreateReaction(BaseModel):
    mes_id: int
    name: str


class CreateChat(BaseModel):
    name: str
    description: str
    avatar: str
    users: list[str]


class ChangeChat(BaseModel):
    name: str
    description: str
    avatar: str


class UserAvatar(BaseModel):
    image: str
    color: str


class Reaction(BaseModel):
    id: int
    user_id: str
    mes_id: int
    name: str
    avatar: str


class ChatMes(BaseModel):
    id: int
    user_id: str
    chat_id: int
    text: str
    time_created: str
    files: list[Media]
    reactions: list[Reaction]
    userAvatar: str
    username: str


class ChatMesWrap(BaseModel):
    type: str
    payload: ChatMes


class CreateChatUser(BaseModel):
    user_id: str
    chat_id: int


class CreateFolder(BaseModel):
    name: str
    description: str
    chats: set[int]


class Folder(BaseModel):
    id: int
    user_id: str
    name: str
    description: str
    chats: list[int]


class CreateChatfolder(BaseModel):
    add: list[int]


class Chat(BaseModel):
    id: int
    name: str
    description: str
    avatar: str
    type: int
    chat_role: int
    archive: bool
    mute: bool
    last_message: dict
    unread_messages: int
    users: list[str]
    blocked_for_me: bool
    blocked_by_me: bool


class Seen(BaseModel):
    mes_id: int
    user_id: str
    chat_id: int


class ChangeChatUser(BaseModel):
    change: bool
    chat_id: int
