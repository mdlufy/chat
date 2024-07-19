from datetime import datetime
from sqlalchemy import MetaData, Table, Column, ForeignKey, Integer, String, TIMESTAMP, Boolean

metadata = MetaData()

messages = Table(
    "messages",
    metadata,
    Column('id', Integer, primary_key=True),
    Column('user_id', String, ForeignKey('users.id', ondelete="CASCADE")),
    Column('chat_id', Integer, ForeignKey('chats.id', ondelete="CASCADE"), nullable=False),
    Column('text', String),
    Column('time_created', TIMESTAMP, default=datetime.utcnow)
)

folders = Table(
    "folders",
    metadata,
    Column('id', Integer, primary_key=True),
    Column('user_id', String, ForeignKey('users.id', ondelete="CASCADE")),
    Column('name', String, nullable=False),
    Column('description', String, default=''),
)

chats = Table(
    "chats",
    metadata,
    Column('id', Integer, primary_key=True),
    Column('name', String, default=''),
    Column('description', String, default=''),
    Column('avatar', String, default=''),
    Column('type', Integer, nullable=False)
)

chatproject = Table(
    "chatproject",
    metadata,
    Column('id', Integer, primary_key=True),
    Column('chat_id', Integer, ForeignKey('chats.id', ondelete="CASCADE"), nullable=False),
    Column('project_id', Integer, nullable=False),
    Column('user_id', String, nullable=False)
)

chatuser = Table(
    "chatuser",
    metadata,
    Column('id', Integer, primary_key=True),
    Column('chat_id', Integer, ForeignKey('chats.id', ondelete="CASCADE"), nullable=False),
    Column('user_id', String, nullable=False),
    Column('chat_role', Integer, nullable=False),
    Column('archive', Boolean, default=0),
    Column('mute', Boolean, default=0)
)

chatfolder = Table(
    "chatfolder",
    metadata,
    Column('id', Integer, primary_key=True),
    Column('chat_id', Integer, ForeignKey('chats.id', ondelete="CASCADE"), nullable=False),
    Column('folder_id', Integer, ForeignKey('folders.id', ondelete="CASCADE"), nullable=False)
)

files = Table(
    "files",
    metadata,
    Column('id', Integer, primary_key=True),
    Column('mes_id', Integer, ForeignKey('messages.id', ondelete="CASCADE"), nullable=False),
    Column('url', String, nullable=False),
    Column('name', String, nullable=False),
    Column('type', String, nullable=False),
    Column('size', Integer, nullable=False),
    Column('caption', String, nullable=False),
    Column('as_file', Boolean)
)

replies = Table(
    "replies",
    metadata,
    Column('id', Integer, primary_key=True),
    Column('mes_id', Integer, ForeignKey('messages.id', ondelete="CASCADE"), nullable=False),
    Column('reply_mes_id', Integer, ForeignKey('messages.id'), nullable=False)
)

reactions = Table(
    "reactions",
    metadata,
    Column('id', Integer, primary_key=True),
    Column('mes_id', Integer, ForeignKey('messages.id', ondelete="CASCADE"), nullable=False),
    Column('user_id', String, ForeignKey('users.id', ondelete="CASCADE")),
    Column('name', String, nullable=False),
    Column('time_created', TIMESTAMP, default=datetime.now())
)

seen = Table(
    "seen",
    metadata,
    Column('id', Integer, primary_key=True),
    Column('mes_time', TIMESTAMP, nullable=False),
    Column('user_id', String, ForeignKey('users.id', ondelete="CASCADE")),
    Column('chat_id', Integer, ForeignKey('chats.id', ondelete="CASCADE"), nullable=False)
)

blocked = Table(
    "blocked",
    metadata,
    Column('id', Integer, primary_key=True),
    Column('user_id', String, ForeignKey('users.id', ondelete="CASCADE")),
    Column('blocked_user_id', ForeignKey('users.id', ondelete="CASCADE"))
)

chatevent = Table(
    "chatevent",
    metadata,
    Column('id', Integer, primary_key=True),
    Column('user_id', String, ForeignKey('users.id', ondelete="CASCADE")),
    Column('chat_id', Integer, ForeignKey('chats.id', ondelete="CASCADE"), nullable=False),
    Column('chatevent', String, nullable=False),
    Column('new_chatname', String),
    Column('new_avatar', String),
    Column('second_user_id', ForeignKey('users.id', ondelete="CASCADE")),
    Column('time_created', TIMESTAMP, default=datetime.utcnow)
)

update = Table(
    "update",
    metadata,
    Column('id', Integer, primary_key=True),
    Column('mes_id', String, nullable=False),
    Column('chat_id', Integer, ForeignKey('chats.id', ondelete="CASCADE"), nullable=False),
    Column('chatevent', String, nullable=False),
    Column('new_text', String),
    Column('time_created', TIMESTAMP, default=datetime.utcnow)
)

users = Table(
    "users",
    metadata,
    Column('id', String, primary_key=True),
    Column('email', String, nullable=False),
    Column('name', String, nullable=False),
    Column('surname', String, nullable=False),
    Column('hashed_password', String, nullable=False),
    Column('avatar', String, default='')
)
