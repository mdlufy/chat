from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from login import get_current_user, authenticate_user, create_access_token
from router import router
from chatrouter import router as chatrouter
from folderrouter import router as folderrouter
from fastapi import APIRouter, Depends, FastAPI, HTTPException, status

app = FastAPI()

origins = [
    "http://localhost",
    "http://localhost:4200",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)
app.include_router(chatrouter)
app.include_router(folderrouter)

########################
# from fastapi import WebSocket, Depends
# import websockets
# import asyncio
# from sqlalchemy import select
# from models import chats, chatuser
# from schemas import Chat
# from sqlalchemy.ext.asyncio import AsyncSession
# from sqlalchemy.future import select
# from database import ws_async_session
#
# connected_clients = set()
#
#
# @app.websocket("/ws/{channel}")
# async def websocket_endpoint(websocket: WebSocket, channel: str):
#     await websocket.accept()
#     # Добавляем клиента в список подключенных
#     connected_clients.add(websocket)
#     async_db_connection = ws_async_session()
#     try:
#         while True:
#             data = await websocket.receive_text()
#             message = await get_cid(
#                 chat_id=19, session=async_db_connection
#             )
#             print(message)
#             for client in connected_clients:
#                 await client.send_text(message)
#     except websockets.exceptions.ConnectionClosedOK:
#         connected_clients.remove(websocket)
#         await websocket.close()
#
#
# async def get_cid(chat_id: int, session: AsyncSession):
#     query = select(chats).where(chats.c.id == chat_id)
#     result = await session.execute(query)
#     rc = result.mappings().all()[0]
#     return str(rc)

from datetime import timedelta
from typing import Annotated
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from models import users
from fastapi import APIRouter, Depends, FastAPI, HTTPException, status
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_async_session, async_session_maker
from sqlalchemy import insert, select
from schemas import User, Token

ACCESS_TOKEN_EXPIRE_MINUTES = 1440


@app.post("/token")
async def login_for_access_token(
        form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
) -> Token:
    async_db_connection = async_session_maker()
    user = await authenticate_user(form_data.username, form_data.password, session=async_db_connection)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user}, expires_delta=access_token_expires
    )
    return Token(access_token=access_token, token_type="Bearer")


@app.get("/users/me/", response_model=User)
async def read_users_me(
        current_user: Annotated[User, Depends(get_current_user)],
):
    return current_user


@app.get("/users/get_users_by_name/", response_model=list[User])
async def get_users_by_name(name: str, current_user: Annotated[User, Depends(get_current_user)],
                            session: AsyncSession = Depends(get_async_session)):
    query = select(users).where((users.c.surname.contains(name)) | (users.c.name.contains(name)))
    results = await session.execute(query)
    data = results.mappings().all()
    users_data = []
    for u in data:
        users_data.append(User(id=u.id, username=u.name + ' ' + u.surname, email=u.email,
                               avatar=str(u.avatar)))
    return users_data


@app.get("/users/get_users_by_name/{user_id}", response_model=User, responses={404: {"description": "User not found"},
                                                                               200: {"content": {
                                                                                   "application/json": {}}}})
async def get_user_by_id(user_id: str, current_user: Annotated[User, Depends(get_current_user)],
                         session: AsyncSession = Depends(get_async_session)):
    query = select(users).where(users.c.id == user_id)
    results = await session.execute(query)
    u = results.mappings().all()
    if u:
        u = u[0]
        return User(id=u.id, username=u.name + ' ' + u.surname, email=u.email, avatar=str(u.avatar))
    else:
        return JSONResponse(status_code=404, content={"message": "User not found"})


@app.get("/create_users/")
async def read_own_items(session: AsyncSession = Depends(get_async_session)):
    nm = insert(users).values(id='a', email='a@mail.ru', name='First', surname='User',
                              hashed_password='$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW')
    await session.execute(nm)
    await session.commit()
    nm = insert(users).values(id='b', email='b@mail.ru', name='Second', surname='User',
                              hashed_password='$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW')
    await session.execute(nm)
    await session.commit()
    nm = insert(users).values(id='c', email='c@mail.ru', name='Third', surname='User',
                              hashed_password='$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW')
    await session.execute(nm)
    await session.commit()
    nm = insert(users).values(id='d', email='d@mail.ru', name='Fourth', surname='User',
                              hashed_password='$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW')
    await session.execute(nm)
    await session.commit()
    nm = insert(users).values(id='e', email='e@mail.ru', name='Fifth', surname='User',
                              hashed_password='$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW')
    await session.execute(nm)
    await session.commit()
    nm = insert(users).values(id='f', email='f@mail.ru', name='Sixth', surname='User',
                              hashed_password='$2b$12$EixZaYVK1fsbw1ZfbX3OXePaWxn96p36WQoeG6Lruj3vjPGga31lW')
    await session.execute(nm)
    await session.commit()
    return JSONResponse(status_code=200, content={"message": "Success"})
