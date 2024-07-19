from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_async_session, async_session_maker
from sqlalchemy import insert, delete, update, select
from models import folders, chatfolder, chats, chatuser, files, messages, chatevent, seen, blocked, users
from schemas import Folder, CreateFolder, Chat, User, CreateChatfolder
from sqlalchemy.orm import aliased
from login import get_current_user
from typing import Annotated

router = APIRouter(
    prefix='/folders',
    tags=['folders']
)


@router.post("/", response_model=Folder, responses={200: {"content": {"application/json": {}}}})
async def create_folder(folder: CreateFolder, current_user: Annotated[User, Depends(get_current_user)],
                        session: AsyncSession = Depends(get_async_session)):
    nf = insert(folders).values(user_id=current_user.id, name=folder.name, description=folder.description) \
        .returning(folders.c.id)
    res = await session.execute(nf)
    nf_id = res.fetchone()._mapping.id
    await session.commit()
    if folder.chats:
        for chat in folder.chats:
            ncf = insert(chatfolder).values(chat_id=chat, folder_id=nf_id)
            await session.execute(ncf)
            await session.commit()
    return Folder(id=nf_id, user_id=current_user.id, name=folder.name, description=folder.description,
                  chats=folder.chats)


@router.put('/{folder_id}', response_model=Folder, responses={404: {"description": "Folder not found"},
                                                              403: {"description": "User not the owner"},
                                                              200: {"content": {"application/json": {}}}})
async def change_folder(folder_id: int, new_folder: CreateFolder,
                        current_user: Annotated[User, Depends(get_current_user)],
                        session: AsyncSession = Depends(get_async_session)):
    async_db_connection = async_session_maker()
    result = await check_folder(folder_id, current_user=current_user, session=async_db_connection)
    if result == 'ok':
        stmt = (update(folders).where(folders.c.id == folder_id).values(name=new_folder.name,
                                                                        description=new_folder.description))
        await session.execute(stmt)
        await session.commit()
        stmt = select(chatfolder.c.chat_id).where(chatfolder.c.folder_id == folder_id)
        cf = await session.execute(stmt)
        cf = cf.mappings().all()
        cf = set([c.chat_id for c in cf])
        if len(new_folder.chats.symmetric_difference(cf)):
            for old_chat in new_folder.chats.symmetric_difference(cf):
                stmt = delete(chatfolder).where(chatfolder.c.chat_id == old_chat)
                await session.execute(stmt)
                await session.commit()
        if len(cf.symmetric_difference(new_folder.chats)):
            for chat in cf.symmetric_difference(new_folder.chats):
                stmt = insert(chatfolder).values(chat_id=chat, folder_id=folder_id)
                await session.execute(stmt)
                await session.commit()
        return Folder(id=folder_id, user_id=current_user.id, name=new_folder.name, description=new_folder.description,
                      chats=new_folder.chats)
    else:
        return result


@router.put('/{folder_id}', response_model=Folder, responses={404: {"description": "Folder not found"},
                                                              403: {"description": "User not the owner"},
                                                              200: {"content": {"application/json": {}}}})
async def change_folder(folder_id: int, new_folder: CreateFolder,
                        current_user: Annotated[User, Depends(get_current_user)],
                        session: AsyncSession = Depends(get_async_session)):
    async_db_connection = async_session_maker()
    result = await check_folder(folder_id, current_user=current_user, session=async_db_connection)
    if result == 'ok':
        stmt = (update(folders).where(folders.c.id == folder_id).values(name=new_folder.name,
                                                                        description=new_folder.description))
        await session.execute(stmt)
        await session.commit()
        stmt = select(chatfolder.c.chat_id).where(chatfolder.c.folder_id == folder_id)
        cf = await session.execute(stmt)
        cf = cf.mappings().all()
        cf = set([c.chat_id for c in cf])
        if len(new_folder.chats.symmetric_difference(cf)):
            for old_chat in new_folder.chats.symmetric_difference(cf):
                stmt = delete(chatfolder).where(chatfolder.c.chat_id == old_chat)
                await session.execute(stmt)
                await session.commit()
        if len(cf.symmetric_difference(new_folder.chats)):
            for chat in cf.symmetric_difference(new_folder.chats):
                stmt = insert(chatfolder).values(chat_id=chat, folder_id=folder_id)
                await session.execute(stmt)
                await session.commit()
        return Folder(id=folder_id, user_id=current_user.id, name=new_folder.name, description=new_folder.description,
                      chats=new_folder.chats)
    else:
        return result


@router.delete("/{folder_id}/", responses={404: {"description": "Folder not found"},
                                           403: {"description": "User not the owner"},
                                           200: {"description": "Success"}})
async def delete_folder(folder_id: int, current_user: Annotated[User, Depends(get_current_user)],
                        session: AsyncSession = Depends(get_async_session)):
    async_db_connection = async_session_maker()
    result = await check_folder(folder_id, current_user=current_user, session=async_db_connection)
    if result == 'ok':
        stmt = (delete(folders).where(folders.c.id == folder_id))
        await session.execute(stmt)
        await session.commit()
        return JSONResponse(status_code=200, content={"status": "Success"})
    else:
        return result


@router.get('/folders_of_user/', response_model=list[Folder],
            responses={200: {"content": {"application/json": {}}}})
async def get_folders_of_user(current_user: Annotated[User, Depends(get_current_user)],
                                 session: AsyncSession = Depends(get_async_session)):
    query = select(folders).where(folders.c.user_id == current_user.id)
    result = await session.execute(query)
    rf = result.mappings().all()
    folders_of_user = []
    for i in rf:
        query = select(chatfolder).where(chatfolder.c.folder_id == i.id)
        result = await session.execute(query)
        rcf = result.mappings().all()
        rcf = [c.chat_id for c in rcf]
        folders_of_user.append(Folder(id=i.id, user_id=current_user.id, name=i.name, description=i.description, chats=rcf))
    return folders_of_user


@router.get('/{folder_id}', response_model=Folder,
            responses={200: {"content": {"application/json": {}}}})
async def get_folder_by_id(folder_id: int, current_user: Annotated[User, Depends(get_current_user)],
                           session: AsyncSession = Depends(get_async_session)):
    async_db_connection = async_session_maker()
    result = await check_folder(folder_id, current_user=current_user, session=async_db_connection)
    if result == 'ok':
        query = select(folders).where(folders.c.id == folder_id)
        result = await session.execute(query)
        rf = result.mappings().all()[0]
        query = select(chatfolder).where(chatfolder.c.folder_id == rf.id)
        result = await session.execute(query)
        rcf = result.mappings().all()
        rcf = [c.chat_id for c in rcf]
        return Folder(id=rf.id, user_id=current_user.id, name=rf.name, description=rf.description, chats=rcf)
    else:
        return result


@router.get('/chats_of_folder/{folder_id}', response_model=list[Chat],
            responses={200: {"content": {"application/json": {}}}})
async def get_chats_by_folder_id(folder_id: int, current_user: Annotated[User, Depends(get_current_user)],
                                 session: AsyncSession = Depends(get_async_session)):
    global mes_count, last_message
    async_db_connection = async_session_maker()
    result = await check_folder(folder_id, current_user=current_user, session=async_db_connection)
    if result == 'ok':
        query = select(chatfolder).where(chatfolder.c.folder_id == folder_id)
        result = await session.execute(query)
        rcf = result.mappings().all()
        chats_of_folder = []
        for i in rcf:
            query = select(chats).where(chats.c.id == i.chat_id)
            result = await session.execute(query)
            result = result.mappings().all()
            blocked_for_me = False
            blocked_by_me = False
            if result:
                rc = result[0]
                query = select(chatuser.c.user_id).where(chatuser.c.chat_id == i.chat_id)
                result = await session.execute(query)
                rcu = list(map(lambda cu: cu.user_id, result.mappings().all()))
                if current_user.id in rcu:
                    if rc.type == 0:
                        rcu.remove(current_user.id)
                        query = select(blocked).where((blocked.c.user_id == rcu[0]) &
                                                      (blocked.c.blocked_user_id == current_user.id))
                        result = await session.execute(query)
                        if result.mappings().all():
                            blocked_for_me = True
                        query = select(blocked).where((blocked.c.user_id == current_user.id) &
                                                      (blocked.c.blocked_user_id == rcu[0]))
                        result = await session.execute(query)
                        if result.mappings().all():
                            blocked_by_me = True
                else:
                    return JSONResponse(status_code=403, content={"message": "User not in chat"})
            else:
                return JSONResponse(status_code=404, content={"message": "Chat not found"})
            query = select(chats).where(chats.c.id == i.chat_id)
            result = await session.execute(query)
            rc = result.mappings().all()[0]
            query = select(chatuser).where((chatuser.c.chat_id == i.chat_id) & (chatuser.c.user_id == current_user.id))
            result = await session.execute(query)
            rcu = result.mappings().all()[0]
            query = select(seen).where((seen.c.chat_id == i.chat_id) & (seen.c.user_id == current_user.id)) \
                .order_by(seen.c.mes_time.desc())
            result = await session.execute(query)
            ls = result.mappings().all()
            if rc.type == 1:
                last_message = dict()
                query = select(chatuser).where(chatuser.c.chat_id == i.chat_id)
                result = await session.execute(query)
                rcus = result.mappings().all()
                users_of_chat = [ru.user_id for ru in rcus]
                if ls:
                    ls = ls[0]
                    query = select(messages).where(
                        (messages.c.chat_id == rc.id) & (messages.c.time_created > ls.mes_time)) \
                        .order_by(messages.c.time_created.desc())
                    result1 = await session.execute(query)
                    result1 = result1.mappings().all()
                    query = select(chatevent).where(
                        (chatevent.c.chat_id == rc.id) & (chatevent.c.time_created > ls.mes_time)) \
                        .order_by(chatevent.c.time_created.desc())
                    result2 = await session.execute(query)
                    result2 = result2.mappings().all()
                else:
                    query = select(messages).where(messages.c.chat_id == rc.id).order_by(messages.c.time_created.desc())
                    result1 = await session.execute(query)
                    result1 = result1.mappings().all()
                    query = select(chatevent).where(chatevent.c.chat_id == rc.id).order_by(
                        chatevent.c.time_created.desc())
                    result2 = await session.execute(query)
                    result2 = result2.mappings().all()
                mes_count = len(result1) + len(result2)
                if result1:
                    if result1[0].time_created > result2[0].time_created:
                        query = select(files).where((files.c.mes_id == result1[0].id))
                        result = await session.execute(query)
                        rf = result.mappings().all()
                        files_of_mes = []
                        for file in rf:
                            files_of_mes.append(dict(file))
                        query = select(users).where(users.c.id == result1[0].user_id)
                        result = await session.execute(query)
                        author = result.mappings().all()[0]
                        lm = dict()
                        lm['type'] = 'message'
                        lm['payload'] = dict(text=result1[0].text, time_created=str(result1[0].time_created),
                                             files=files_of_mes, username=(author.name + ' ' + author.surname))
                        chats_of_folder.append(
                            Chat(id=rc.id, name=rc.name, description=rc.description, avatar=rc.avatar, type=rc.type,
                                 chat_role=rcu.chat_role, archive=rcu.archive, mute=rcu.mute, last_message=lm,
                                 unread_messages=mes_count, users=users_of_chat, blocked_for_me=False,
                                 blocked_by_me=False))
                last_message = dict(result2[0])
                last_message['time_created'] = str(last_message['time_created'])
                query = select(users).where(users.c.id == last_message['user_id'])
                result = await session.execute(query)
                u = result.mappings().all()[0]
                last_message['user_id_username'] = u.name + ' ' + u.surname
                if last_message['second_user_id']:
                    query = select(users).where(users.c.id == last_message['second_user_id'])
                    result = await session.execute(query)
                    u = result.mappings().all()[0]
                    last_message['second_user_id_username'] = u.name + ' ' + u.surname
                lm = dict()
                lm['type'] = 'event'
                lm['payload'] = last_message
                chats_of_folder.append(
                    Chat(id=rc.id, name=rc.name, description=rc.description, avatar=rc.avatar, type=rc.type,
                         chat_role=rcu.chat_role, archive=rcu.archive, mute=rcu.mute, last_message=lm,
                         unread_messages=mes_count, users=users_of_chat, blocked_for_me=False, blocked_by_me=False))
            else:
                if ls:
                    ls = ls[0]
                    query = select(messages).where(
                        (messages.c.chat_id == rc.id) & (messages.c.time_created > ls.mes_time)) \
                        .order_by(messages.c.time_created.desc())
                    result1 = await session.execute(query)
                    result1 = result1.mappings().all()
                else:
                    query = select(messages).where(messages.c.chat_id == rc.id).order_by(messages.c.time_created.desc())
                    result1 = await session.execute(query)
                    result1 = result1.mappings().all()
                mes_count = len(result1)
                if result1:
                    query = select(files).where((files.c.mes_id == result1[0].id))
                    result = await session.execute(query)
                    rf = result.mappings().all()
                    files_of_mes = []
                    for file in rf:
                        files_of_mes.append(dict(file))
                    last_message = dict()
                    last_message['type'] = 'message'
                    last_message['payload'] = dict(text=result1[0].text, time_created=str(result1[0].time_created),
                                                   files=files_of_mes)
                else:
                    last_message = {'msg': 'no messages'}
                u1 = aliased(chatuser)
                query = select(chatuser, u1).where((chatuser.c.chat_id == rc.id) &
                                                   (chatuser.c.chat_id == u1.c.chat_id) &
                                                   (chatuser.c.user_id != u1.c.user_id) &
                                                   (chatuser.c.user_id == current_user.id))
                su = await session.execute(query)
                su = su.mappings().all()[0]
                users_of_chat = []
                users_of_chat.append(su.user_id_1)
                query = select(users).where(users.c.id == su.user_id_1)
                result = await session.execute(query)
                u = result.mappings().all()[0]
                chats_of_folder.append(
                    Chat(id=rc.id, name=u.name + ' ' + u.surname, avatar=u.avatar, description='',
                         type=rc.type, archive=rcu.archive,
                         mute=rcu.mute, chat_role=0, last_message=last_message, unread_messages=mes_count,
                         users=users_of_chat, blocked_for_me=blocked_for_me, blocked_by_me=blocked_by_me))
            chats_of_folder.sort(key=lambda element: element.last_message['time_created'], reverse=True)
            return chats_of_folder
    else:
        return result


@router.post("/chatfolder/{folder_id}", response_model=Folder, responses={404: {"description": "Chat not found"},
                                                                          403: {"description": "User not allowed"},
                                                                          200: {"content": {"application/json": {}}}})
async def add_chats_to_folder(add_chats: CreateChatfolder, folder_id: int,
                              current_user: Annotated[User, Depends(get_current_user)],
                              session: AsyncSession = Depends(get_async_session)):
    async_db_connection = async_session_maker()
    result = await check_folder(folder_id, current_user=current_user, session=async_db_connection)
    if result == 'ok':
        stmt = select(chatfolder.c.chat_id).where(chatfolder.c.folder_id == folder_id)
        cf = await session.execute(stmt)
        cf = cf.mappings().all()
        cf = [c.chat_id for c in cf]
        for chat in add_chats.add:
            if chat not in cf:
                stmt = insert(chatfolder).values(chat_id=chat, folder_id=folder_id)
                await session.execute(stmt)
                await session.commit()
        return await get_folder_by_id(folder_id, current_user=current_user, session=async_db_connection)
    else:
        return result


async def check_folder(folder_id: int, current_user: Annotated[User, Depends(get_current_user)], session: AsyncSession):
    query = select(folders).where(folders.c.id == folder_id)
    result = await session.execute(query)
    result = result.mappings().all()
    if result:
        rf = result[0]
        if rf.user_id == current_user.id:
            return 'ok'
        else:
            return JSONResponse(status_code=403, content={"message": "User not the owner"})
    else:
        return JSONResponse(status_code=404, content={"message": "Folder not found"})
