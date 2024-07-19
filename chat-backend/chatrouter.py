from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from typing import Union
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased
from database import get_async_session, async_session_maker
from sqlalchemy import insert, delete, update, select
from models import messages, chats, chatuser, chatevent, files, reactions, blocked, seen, users, chatfolder
from datetime import datetime
from schemas import Chat, CreateChat, ChangeChat, ChatMes, CreateChatUser, \
    ChangeChatUser, User, CreateChatfolder, ChatUser
from router import check_chatuser
import redis
from login import get_current_user
from typing import Annotated

r = redis.Redis(host='redis', port=6379)
router = APIRouter(
    prefix='/chats',
    tags=['chats']
)


@router.get('/{chat_id}/messages', response_model=list[dict],
            responses={404: {"description": "Chat not found"}, 403: {"description": "User not in chat"},
                       200: {"content": {"application/json": {}}}})
async def get_messages_by_chat(chat_id: int, current_user: Annotated[User, Depends(get_current_user)],
                               session: AsyncSession = Depends(get_async_session)):
    query = select(chats).where(chats.c.id == chat_id)
    result = await session.execute(query)
    result = result.mappings().all()
    if result:
        query = select(chatuser.c.user_id).where(chatuser.c.chat_id == chat_id)
        result = await session.execute(query)
        rcu = list(map(lambda cu: cu.user_id, result.mappings().all()))
        if current_user.id not in rcu:
            return JSONResponse(status_code=403, content={"message": "User not in chat"})
    else:
        return JSONResponse(status_code=404, content={"message": "Chat not found"})
    query = select(messages).where(messages.c.chat_id == chat_id).order_by(messages.c.time_created)
    result = await session.execute(query)
    rm = result.mappings().all()
    messages_of_chat = []
    for i in rm:
        query = select(files).where((files.c.mes_id == i.id))
        result = await session.execute(query)
        rf = result.mappings().all()
        files_of_mes = []
        for file in rf:
            files_of_mes.append(dict(file))
        query = select(users).where(users.c.id == i.user_id)
        result = await session.execute(query)
        author = result.mappings().all()[0]
        query = select(reactions).where((reactions.c.mes_id == i.id))
        result = await session.execute(query)
        rp = result.mappings().all()
        reactions_of_mes = []
        for reaction in rp:
            reaction = dict(reaction)
            query = select(users).where(users.c.id == i.user_id)
            result = await session.execute(query)
            react_author = result.mappings().all()[0]
            reaction['avatar'] = react_author.avatar
            reactions_of_mes.append(reaction)
        m = dict()
        m['type'] = 'message'
        m['payload'] = dict(ChatMes(id=i.id, user_id=i.user_id, chat_id=i.chat_id, text=i.text,
                                    time_created=str(i.time_created), files=files_of_mes,
                                    reactions=reactions_of_mes, userAvatar=author.avatar,
                                    username=author.name + ' ' + author.surname))
        messages_of_chat.append(m)
    query = select(chatevent).where(chatevent.c.chat_id == chat_id).order_by(chatevent.c.time_created)
    result = await session.execute(query)
    rce = result.mappings().all()
    for i in rce:
        i = dict(i)
        query = select(users).where(users.c.id == i['user_id'])
        result = await session.execute(query)
        u = result.mappings().all()[0]
        i['user_id_username'] = u.name + ' ' + u.surname
        i['time_created'] = str(i['time_created'])
        if i['second_user_id'] is not None:
            query = select(users).where(users.c.id == i['second_user_id'])
            result = await session.execute(query)
            u = result.mappings().all()[0]
            i['second_user_id_username'] = u.name + ' ' + u.surname
        m = dict()
        m['type'] = 'event'
        m['payload'] = i
        messages_of_chat.append(m)
    messages_of_chat.sort(key=lambda element: element['payload']['time_created'])
    return messages_of_chat


@router.post("/", response_model=Chat, responses={404: {"description": "User not found"},
                                                  403: {"description": "User blocked"},
                                                  200: {"content": {"application/json": {}}}})
async def create_chat(chat: CreateChat, current_user: Annotated[User, Depends(get_current_user)],
                      session: AsyncSession = Depends(get_async_session)):
    global nce_id
    if len(chat.users) == 1:
        query = select(users).where(users.c.id == chat.users[0])
        result = await session.execute(query)
        user = result.mappings().all()
        if not user:
            return JSONResponse(status_code=404, content={"message": "User not found"})
    else:
        for user in chat.users:
            query = select(users).where(users.c.id == user)
            result = await session.execute(query)
            exists = result.mappings().all()
            if exists:
                query = select(blocked).where(
                    (blocked.c.user_id == exists[0].id) & (blocked.c.blocked_user_id == current_user.id))
                result = await session.execute(query)
                if result.mappings().all():
                    chat.users.remove(user)
            else:
                chat.users.remove(user)
    if len(chat.users) > 1:
        nc = insert(chats).values(name=chat.name, description=chat.description, avatar=chat.avatar, type=1) \
            .returning(chats.c.id)
        res = await session.execute(nc)
        nc_id = res.fetchone()._mapping.id
        await session.commit()
        for user in chat.users:
            ncu = insert(chatuser).values(chat_id=nc_id, user_id=user, chat_role=1, archive=False, mute=False)
            await session.execute(ncu)
            await session.commit()
        nce = insert(chatevent).values(user_id=current_user.id, chat_id=nc_id, chatevent='создал(а) чат',
                                       new_chatname=chat.name, time_created=datetime.now()).returning(chatevent.c.id)
        res = await session.execute(nce)
        nce_id = res.fetchone()._mapping.id
        await session.commit()

        ncu = insert(chatuser).values(chat_id=nc_id, user_id=current_user.id, chat_role=0, archive=False, mute=False)
        await session.execute(ncu)
        await session.commit()

        new_event = dict()
        new_event['type'] = 'event'
        new_event['payload'] = dict(user_id=current_user.id, chat_id=nc_id, chatevent='создал(а) чат',
                                    new_chatname=chat.name, time_created=str(datetime.now()),
                                    user_id_username=current_user.username)

        users_of_chat = chat.users
        users_of_chat.append(current_user.id)

        new_chat = Chat(id=nc_id, name=chat.name, description=chat.description, avatar=chat.avatar, type=1,
                        chat_role=0, archive=False, mute=False, last_message=new_event, unread_messages=1,
                        users=users_of_chat, blocked=False, blocked_for_me=False, blocked_by_me=False)
        rmes = dict()
        rmes['event'] = 'new_chat'
        rmes['payload'] = dict(new_chat)
        rmes['users'] = chat.users
        r.publish('new', str(rmes).replace("'", '"').replace("False", 'false'))
        return new_chat

    elif chat.users:
        u1 = aliased(chatuser)
        query = select(chats, chatuser, u1).where((chatuser.c.chat_id == u1.c.chat_id) &
                                                  (chatuser.c.chat_id == chats.c.id) &
                                                  (chatuser.c.user_id != u1.c.user_id) &
                                                  (chatuser.c.user_id == current_user.id) &
                                                  (u1.c.user_id == chat.users[0]) &
                                                  (chats.c.type == 0))
        rc = await session.execute(query)
        rc = rc.mappings().all()
        print(rc)
        if rc:
            rc = rc[0]
            async_db_connection = async_session_maker()
            result = await get_chat_by_id(rc.id, current_user=current_user, session=async_db_connection)
            return result
        else:
            chat_type = 0
            nc = insert(chats).values(name=chat.name, description=chat.description, avatar=chat.avatar, type=chat_type) \
                .returning(chats.c.id)
            res = await session.execute(nc)
            nc_id = res.fetchone()._mapping.id
            await session.commit()
            ncu = insert(chatuser).values(chat_id=nc_id, user_id=chat.users[0], chat_role=0, archive=False, mute=False)
            await session.execute(ncu)
            await session.commit()

        ncu = insert(chatuser).values(chat_id=nc_id, user_id=current_user.id, chat_role=0, archive=False, mute=False)
        await session.execute(ncu)
        await session.commit()

        query = select(users).where(users.c.id == chat.users[0])
        result = await session.execute(query)
        u = result.mappings().all()[0]

        new_chat = Chat(id=nc_id, name=u.name + ' ' + u.surname, description='',
                        avatar=u.avatar, type=0, chat_role=0, archive=False, mute=False,
                        last_message={'msg': 'no messages'}, unread_messages=0, users=chat.users, blocked_for_me=False,
                        blocked_by_me=False)
        rmes = dict()
        rmes['event'] = 'new_chat'
        rmes['payload'] = dict(new_chat)
        rmes['users'] = [current_user.id]
        r.publish('new', str(rmes).replace("'", '"').replace("False", 'false'))

        new_chat_for_second_user = Chat(id=nc_id, name=current_user.username, description='',
                                        avatar=current_user.avatar, type=0, chat_role=0, archive=False, mute=False,
                                        last_message={'msg': 'no messages'}, unread_messages=0, users=[current_user.id],
                                        blocked_for_me=False,
                                        blocked_by_me=False)
        rmes = dict()
        rmes['event'] = 'new_chat'
        rmes['payload'] = dict(new_chat_for_second_user)
        rmes['users'] = chat.users
        r.publish('new', str(rmes).replace("'", '"').replace("False", 'false'))
        return new_chat
    else:
        return JSONResponse(status_code=404, content={"message": "Users not found"})


@router.get('/{chat_id}', response_model=Chat, responses={404: {"description": "Chat not found"},
                                                          403: {"description": "User not in chat"},
                                                          200: {"content": {"application/json": {}}}})
async def get_chat_by_id(chat_id: int, current_user: Annotated[User, Depends(get_current_user)],
                         session: AsyncSession = Depends(get_async_session)):
    query = select(chats).where(chats.c.id == chat_id)
    result = await session.execute(query)
    result = result.mappings().all()
    blocked_for_me = False
    blocked_by_me = False
    if result:
        rc = result[0]
        query = select(chatuser.c.user_id).where(chatuser.c.chat_id == chat_id)
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
    query = select(chats).where(chats.c.id == chat_id)
    result = await session.execute(query)
    rc = result.mappings().all()[0]
    query = select(chatuser).where((chatuser.c.chat_id == chat_id) & (chatuser.c.user_id == current_user.id))
    result = await session.execute(query)
    rcu = result.mappings().all()[0]
    query = select(seen).where((seen.c.chat_id == chat_id) & (seen.c.user_id == current_user.id)) \
        .order_by(seen.c.mes_time.desc())
    result = await session.execute(query)
    ls = result.mappings().all()
    if rc.type == 1:
        query = select(chatuser).where(chatuser.c.chat_id == chat_id)
        result = await session.execute(query)
        rcus = result.mappings().all()
        users_of_chat = [ru.user_id for ru in rcus]
        if ls:
            ls = ls[0]
            query = select(messages).where((messages.c.chat_id == rc.id) & (messages.c.time_created > ls.mes_time)) \
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
            query = select(chatevent).where(chatevent.c.chat_id == rc.id).order_by(chatevent.c.time_created.desc())
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
                return Chat(id=rc.id, name=rc.name, description=rc.description, avatar=rc.avatar, type=rc.type,
                            chat_role=rcu.chat_role, archive=rcu.archive, mute=rcu.mute, last_message=lm,
                            unread_messages=mes_count, users=users_of_chat, blocked_for_me=False, blocked_by_me=False)

        last_message = dict(result2[0])
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
        return Chat(id=rc.id, name=rc.name, description=rc.description, avatar=rc.avatar, type=rc.type,
                    chat_role=rcu.chat_role, archive=rcu.archive, mute=rcu.mute, last_message=lm,
                    unread_messages=mes_count, users=users_of_chat, blocked_for_me=False, blocked_by_me=False)
    else:
        if ls:
            ls = ls[0]
            query = select(messages).where((messages.c.chat_id == rc.id) & (messages.c.time_created > ls.mes_time)) \
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
        return Chat(id=rc.id, name=u.name + ' ' + u.surname, avatar=u.avatar, description='',
                    type=rc.type, archive=rcu.archive,
                    mute=rcu.mute, chat_role=0, last_message=last_message, unread_messages=mes_count,
                    users=users_of_chat, blocked_for_me=blocked_for_me, blocked_by_me=blocked_by_me)


@router.get('/{chat_id}/users/', response_model=list[ChatUser], responses={404: {"description": "Chat not found"},
                                                                           403: {"description": "User not in chat"},
                                                                           200: {"content": {"application/json": {}}}})
async def get_users_by_chat_id(chat_id: int, current_user: Annotated[User, Depends(get_current_user)],
                               session: AsyncSession = Depends(get_async_session)):
    query = select(chats).where(chats.c.id == chat_id)
    result = await session.execute(query)
    result = result.mappings().all()
    if result:
        rc = result[0]
        query = select(chatuser).where(chatuser.c.chat_id == chat_id)
        result = await session.execute(query)
        rcu = result.mappings().all()
        if current_user.id in list(map(lambda cu: cu.user_id, rcu)):
            users_of_chat = list()
            if rc.type == 0:
                rcu = list(filter(lambda x: x.user_id != current_user.id, rcu))
            for cu in rcu:
                query = select(users).where(users.c.id == cu.user_id)
                print(cu)
                results = await session.execute(query)
                u = results.mappings().all()
                if u:
                    u = u[0]
                    users_of_chat.append(
                        ChatUser(id=u.id, username=u.name + ' ' + u.surname, email=u.email, avatar=str(u.avatar),
                                 chat_role=cu.chat_role))
            return users_of_chat
        else:
            return JSONResponse(status_code=403, content={"message": "User not in chat"})
    else:
        return JSONResponse(status_code=404, content={"message": "Chat not found"})


@router.put('/{chat_id}', response_model=Chat, responses={404: {"description": "Chat not found"},
                                                          403: {"description": "User not in chat"},
                                                          405: {"description": "Can't change one on one chat"},
                                                          200: {"content": {"application/json": {}}}})
async def change_chat(chat_id: int, new_chat: ChangeChat, current_user: Annotated[User, Depends(get_current_user)],
                      session: AsyncSession = Depends(get_async_session)):
    async_db_connection = async_session_maker()
    result = await check_chatuser(chat_id, current_user.id, session=async_db_connection)
    if result == 'in chat':
        query = select(chats).where(chats.c.id == chat_id)
        rc = await session.execute(query)
        rc = rc.mappings().all()[0]
        if rc.type == 0:
            return JSONResponse(status_code=405, content={"message": "Can't change one on one chat"})
        else:
            nc = chats.update().where(chats.c.id == chat_id).values(**dict(new_chat))
            await session.execute(nc)
            await session.commit()
            if rc.name != new_chat.name:
                time_created = datetime.now()
                nce = insert(chatevent).values(user_id=current_user.id, chat_id=chat_id,
                                               chatevent='поменял(a) название чата на',
                                               new_chatname=new_chat.name, time_created=time_created) \
                    .returning(chatevent.c.id)
                res = await session.execute(nce)
                nce_id = res.fetchone()._mapping.id
                await session.commit()
                rmes = dict()
                rmes['event'] = 'change_chat'
                mes_payload = dict()
                mes_payload['type'] = 'event'
                mes_payload['payload'] = dict(id=nce_id, user_id=current_user.id,
                                              user_id_username=current_user.username,
                                              chat_id=chat_id, chatevent='поменял(a) название чата на',
                                              new_chatname=new_chat.name, time_created=str(time_created))
                rmes['payload'] = mes_payload
                r.publish(chat_id, str(rmes).replace("'", '"'))
            if rc.avatar != new_chat.avatar:
                time_created = datetime.now()
                nce = insert(chatevent).values(user_id=current_user.id, chat_id=chat_id,
                                               chatevent='поменял(a) аватар чата',
                                               new_avatar=new_chat.avatar, time_created=time_created) \
                    .returning(chatevent.c.id)
                res = await session.execute(nce)
                nce_id = res.fetchone()._mapping.id
                await session.commit()
                rmes = dict()
                rmes['event'] = 'change_chat'
                mes_payload = dict()
                mes_payload['type'] = 'event'
                mes_payload['payload'] = dict(id=nce_id, user_id=current_user.id, chat_id=chat_id,
                                              user_id_username=current_user.username,
                                              chatevent='поменял(a) аватар чата',
                                              new_avatar=new_chat.avatar, time_created=str(time_created))
                rmes['payload'] = mes_payload
                r.publish(chat_id, str(rmes).replace("'", '"'))
            result = await get_chat_by_id(chat_id, current_user=current_user, session=async_db_connection)
            return result
    else:
        return result


@router.delete("/{chat_id}/", responses={404: {"description": "Chat not found"},
                                         403: {"description": "User not allowed"},
                                         406: {"description": "New admin not chosen"},
                                         200: {"content": {"application/json": {}}}})
async def delete_chat(current_user: Annotated[User, Depends(get_current_user)],
                      chat_id: int, forall: Union[bool, None] = None, new_admin: Union[str, None] = None,
                      session: AsyncSession = Depends(get_async_session)):
    async_db_connection = async_session_maker()
    query = select(chats).where(chats.c.id == chat_id)
    result = await session.execute(query)
    result = result.mappings().all()
    if result:
        rc = result[0]
        query = select(chatuser.c.user_id).where(chatuser.c.chat_id == chat_id)
        result = await session.execute(query)
        rcu = list(map(lambda cu: cu.user_id, result.mappings().all()))
        if current_user.id in rcu:
            if rc.type == 0:
                query = select(chatuser.c.user_id).where(chatuser.c.chat_id == chat_id)
                result = await session.execute(query)
                users_of_chat = list(map(lambda cu: cu.user_id, result.mappings().all()))
                stmt = (delete(chats).where(chats.c.id == chat_id))
                await session.execute(stmt)
                await session.commit()
                rmes = dict()
                rmes['event'] = 'delete_chat'
                rmes['payload'] = dict()
                rmes['payload']['id'] = chat_id
                rmes['users'] = users_of_chat
                r.publish(chat_id, str(rmes).replace("'", '"'))
                return JSONResponse(status_code=200, content={"status": "Success"})
            else:
                query = select(chatuser).where(
                    (chatuser.c.chat_id == chat_id) & (chatuser.c.user_id == current_user.id))
                result = await session.execute(query)
                rcu = result.mappings().all()[0]
                if rcu.chat_role == 0:
                    if forall:
                        query = select(chatuser.c.user_id).where(chatuser.c.chat_id == chat_id)
                        result = await session.execute(query)
                        users_of_chat = list(map(lambda cu: cu.user_id, result.mappings().all()))
                        stmt = (delete(chats).where(chats.c.id == chat_id))
                        await session.execute(stmt)
                        await session.commit()
                        rmes = dict()
                        rmes['event'] = 'delete_chat'
                        rmes['payload'] = dict()
                        rmes['payload']['id'] = chat_id
                        rmes['users'] = users_of_chat
                        r.publish(chat_id, str(rmes).replace("'", '"'))
                        return JSONResponse(status_code=200, content={"status": "Success"})
                    elif new_admin is not None:
                        result = await check_chatuser(chat_id, new_admin, session=async_db_connection)
                        if result == 'in chat':
                            stmt = (update(chatuser).where((chatuser.c.chat_id == chat_id) &
                                                           (chatuser.c.user_id == new_admin)).values(chat_role=0))
                            await session.execute(stmt)
                            await session.commit()
                            stmt = (delete(chatuser).where(chatuser.c.id == rcu.id))
                            await session.execute(stmt)
                            await session.commit()
                            nce = insert(chatevent).values(user_id=current_user.id, chat_id=chat_id,
                                                           chatevent='покинул(а) чат',
                                                           time_created=datetime.now()).returning(chatevent.c.id)
                            res = await session.execute(nce)
                            nce_id = res.fetchone()._mapping.id
                            await session.commit()
                            rmes = dict()
                            rmes['event'] = 'user_left'
                            mes_payload = dict()
                            mes_payload['type'] = 'event'
                            mes_payload['payload'] = dict(id=nce_id, user_id=current_user.id,
                                                          user_id_username=current_user.username,
                                                          chat_id=chat_id, chatevent='покинул(а) чат',
                                                          time_created=str(datetime.now()))
                            rmes['payload'] = mes_payload
                            r.publish(chat_id, str(rmes).replace("'", '"'))
                            return JSONResponse(status_code=200, content={"status": "Success"})
                        else:
                            return JSONResponse(status_code=403, content={"message": "Chosen user not in chat"})
                    elif new_admin is None:
                        return JSONResponse(status_code=406, content={"message": "New admin not chosen"})
                else:
                    if forall:
                        return JSONResponse(status_code=403, content={"message": "User not admin"})
                    else:
                        stmt = (delete(chatuser).where(chatuser.c.id == rcu.id))
                        await session.execute(stmt)
                        await session.commit()

                        nce = insert(chatevent).values(user_id=current_user.id, chat_id=chat_id,
                                                       chatevent='покинул(а) чат',
                                                       time_created=datetime.now()).returning(chatevent.c.id)
                        res = await session.execute(nce)
                        nce_id = res.fetchone()._mapping.id
                        await session.commit()
                        rmes = dict()
                        rmes['event'] = 'user_left'
                        mes_payload = dict()
                        mes_payload['type'] = 'event'
                        mes_payload['payload'] = dict(id=nce_id, user_id=current_user.id,
                                                      user_id_username=current_user.username,
                                                      chat_id=chat_id, chatevent='покинул(а) чат',
                                                      time_created=str(datetime.now()))
                        rmes['payload'] = mes_payload
                        r.publish(chat_id, str(rmes).replace("'", '"'))
                        return JSONResponse(status_code=200, content={"status": "Success"})
        else:
            return JSONResponse(status_code=403, content={"message": "User not in chat"})
    else:
        return JSONResponse(status_code=404, content={"message": "Chat not found"})


@router.post("/chatuser", responses={404: {"description": "Chat not found"},
                                     403: {"description": "User not allowed"},
                                     405: {"description": "Can't add users to one on one chat"},
                                     200: {"content": {"application/json": {}}}})
async def add_chatuser(create_chatuser: CreateChatUser, current_user: Annotated[User, Depends(get_current_user)],
                       session: AsyncSession = Depends(get_async_session)):
    async_db_connection = async_session_maker()
    result = await check_chatuser(create_chatuser.chat_id, current_user.id, session=async_db_connection)
    if result == 'in chat':
        query = select(chats).where(chats.c.id == create_chatuser.chat_id)
        rc = await session.execute(query)
        rc = rc.mappings().all()[0]
        if rc.type == 0:
            return JSONResponse(status_code=405, content={"message": "Can't add users to one on one chat"})
        else:
            query = select(blocked).where((blocked.c.user_id == create_chatuser.user_id) &
                                          (blocked.c.blocked_user_id == current_user.id))
            result = await session.execute(query)
            if result.mappings().all():
                return JSONResponse(status_code=403, content={"message": "User blocked"})
            else:
                query = select(chatuser).where(chatuser.c.chat_id == create_chatuser.chat_id)
                result = await session.execute(query)
                rcus = result.mappings().all()
                users_of_chat = [ru.user_id for ru in rcus]
                if create_chatuser.user_id not in users_of_chat:
                    ncu = insert(chatuser).values(chat_id=create_chatuser.chat_id, user_id=create_chatuser.user_id,
                                                  chat_role=1, archive=False, mute=False)
                    await session.execute(ncu)
                    await session.commit()
                    nce = insert(chatevent).values(user_id=current_user.id, chat_id=create_chatuser.chat_id,
                                                   chatevent='добавил(а)', second_user_id=create_chatuser.user_id,
                                                   time_created=datetime.now()).returning(chatevent.c.id)
                    res = await session.execute(nce)
                    nce_id = res.fetchone()._mapping.id
                    await session.commit()
                    query = select(users).where(users.c.id == create_chatuser.user_id)
                    result = await session.execute(query)
                    u = result.mappings().all()[0]
                    rmes = dict()
                    rmes['event'] = 'new_user'
                    mes_payload = dict()
                    mes_payload['type'] = 'event'
                    mes_payload['payload'] = dict(id=nce_id, user_id=current_user.id,
                                                  user_id_username=current_user.username,
                                                  chat_id=create_chatuser.chat_id, chatevent='добавил(а)',
                                                  second_user_id=create_chatuser.user_id,
                                                  second_user_id_username=(u.name + ' ' + u.surname),
                                                  time_created=str(datetime.now()))
                    rmes['payload'] = mes_payload
                    r.publish(create_chatuser.chat_id, str(rmes).replace("'", '"'))

                    users_of_chat.append(create_chatuser.user_id)
                    lm = dict()
                    lm['type'] = 'event'
                    lm['payload'] = rmes['payload']
                    new_chat = Chat(id=rc.id, name=rc.name, description=rc.description, avatar=rc.avatar, type=rc.type,
                                    chat_role=1, archive=False, mute=False, last_message=lm,
                                    unread_messages=1, users=users_of_chat, blocked_for_me=False, blocked_by_me=False)
                    rmes = dict()
                    rmes['event'] = 'add_chatuser'
                    rmes['payload'] = dict(new_chat)
                    rmes['added_user_id'] = create_chatuser.user_id
                    r.publish('new', str(rmes).replace("'", '"').replace("False", 'false'))
                    return JSONResponse(status_code=200, content={"status": "Success"})
                else:
                    return JSONResponse(status_code=403, content={"msg": "User already in chat"})
    else:
        return result


@router.delete("/chatuser", responses={404: {"description": "Chat not found"},
                                       403: {"description": "User not allowed"},
                                       405: {"description": "Can't delete users from one on one chat"},
                                       200: {"content": {"application/json": {}}}})
async def delete_chatuser(deletechatuser: CreateChatUser, current_user: Annotated[User, Depends(get_current_user)],
                          session: AsyncSession = Depends(get_async_session)):
    async_db_connection = async_session_maker()
    result = await check_chatuser(deletechatuser.chat_id, current_user.id, session=async_db_connection)
    if result == 'in chat':
        query = select(chats).where(chats.c.id == deletechatuser.chat_id)
        rc = await session.execute(query)
        rc = rc.mappings().all()[0]
        if rc.type == 0:
            return JSONResponse(status_code=405, content={"message": "Can't delete users from one on one chat"})
        else:
            query = select(chatuser).where(
                (chatuser.c.user_id == current_user.id) & (chatuser.c.chat_id == deletechatuser.chat_id))
            rcu = await session.execute(query)
            rcu = rcu.mappings().all()[0]
            if rcu.chat_role == 0:
                stmt = (delete(chatuser).where((chatuser.c.chat_id == deletechatuser.chat_id) &
                                               (chatuser.c.user_id == deletechatuser.user_id)))
                await session.execute(stmt)
                await session.commit()
                nce = insert(chatevent).values(user_id=current_user.id, chat_id=deletechatuser.chat_id,
                                               chatevent='удалил(а) из чата', second_user_id=deletechatuser.user_id,
                                               time_created=datetime.now()).returning(chatevent.c.id)
                res = await session.execute(nce)
                nce_id = res.fetchone()._mapping.id
                await session.commit()
                query = select(users).where(users.c.id == deletechatuser.user_id)
                result = await session.execute(query)
                u = result.mappings().all()[0]
                rmes = dict()
                rmes['event'] = 'delete_chatuser'
                mes_payload = dict()
                mes_payload['type'] = 'event'
                mes_payload['payload'] = dict(id=nce_id, user_id=current_user.id,
                                              user_id_username=current_user.username,
                                              chat_id=deletechatuser.chat_id, chatevent='удалил(а) из чата',
                                              second_user_id=deletechatuser.user_id,
                                              second_user_id_username=(u.name + ' ' + u.surname),
                                              time_created=str(datetime.now()))
                rmes['payload'] = mes_payload
                r.publish(deletechatuser.chat_id, str(rmes).replace("'", '"'))
                return JSONResponse(status_code=200, content={"status": "Success"})
            else:
                return JSONResponse(status_code=403, content={"message": "User not admin"})
    else:
        return result


@router.get('/chats_of_user/', response_model=list[Chat],
            responses={200: {"content": {"application/json": {}}}})
async def get_chats_of_user(current_user: Annotated[User, Depends(get_current_user)],
                            session: AsyncSession = Depends(get_async_session)):
    global mes_count, last_message
    query = select(chatuser).where((chatuser.c.user_id == current_user.id) & (chatuser.c.archive == False))
    result = await session.execute(query)
    rcu = result.mappings().all()
    chats_of_user = []
    for i in rcu:
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
                query = select(messages).where((messages.c.chat_id == rc.id) & (messages.c.time_created > ls.mes_time)) \
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
                query = select(chatevent).where(chatevent.c.chat_id == rc.id).order_by(chatevent.c.time_created.desc())
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
                    chats_of_user.append(
                        Chat(id=rc.id, name=rc.name, description=rc.description, avatar=rc.avatar, type=rc.type,
                             chat_role=rcu.chat_role, archive=rcu.archive, mute=rcu.mute, last_message=lm,
                             unread_messages=mes_count, users=users_of_chat, blocked_for_me=False, blocked_by_me=False))
                else:
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
                    chats_of_user.append(
                        Chat(id=rc.id, name=rc.name, description=rc.description, avatar=rc.avatar, type=rc.type,
                             chat_role=rcu.chat_role, archive=rcu.archive, mute=rcu.mute, last_message=lm,
                             unread_messages=mes_count, users=users_of_chat, blocked_for_me=False, blocked_by_me=False))
            else:
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
                chats_of_user.append(
                    Chat(id=rc.id, name=rc.name, description=rc.description, avatar=rc.avatar, type=rc.type,
                         chat_role=rcu.chat_role, archive=rcu.archive, mute=rcu.mute, last_message=lm,
                         unread_messages=mes_count, users=users_of_chat, blocked_for_me=False, blocked_by_me=False))
        else:
            if ls:
                ls = ls[0]
                query = select(messages).where((messages.c.chat_id == rc.id) & (messages.c.time_created > ls.mes_time)) \
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
                # else:
                #     last_message = {'msg': 'no messages'}
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
                chats_of_user.append(
                    Chat(id=rc.id, name=u.name + ' ' + u.surname, avatar=u.avatar, description='',
                         type=rc.type, archive=rcu.archive,
                         mute=rcu.mute, chat_role=0, last_message=last_message, unread_messages=mes_count,
                         users=users_of_chat, blocked_for_me=blocked_for_me, blocked_by_me=blocked_by_me))
    chats_of_user.sort(key=lambda element: element.last_message['payload']['time_created'], reverse=True)
    return chats_of_user


@router.get('/archived_chats_of_user/', response_model=list[Chat],
            responses={200: {"content": {"application/json": {}}}})
async def get_archived_chats_of_user(current_user: Annotated[User, Depends(get_current_user)],
                                     session: AsyncSession = Depends(get_async_session)):
    global mes_count, last_message
    query = select(chatuser).where((chatuser.c.user_id == current_user.id) & (chatuser.c.archive == True))
    result = await session.execute(query)
    rcu = result.mappings().all()
    chats_of_user = []
    for i in rcu:
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
                query = select(messages).where((messages.c.chat_id == rc.id) & (messages.c.time_created > ls.mes_time)) \
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
                query = select(chatevent).where(chatevent.c.chat_id == rc.id).order_by(chatevent.c.time_created.desc())
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
                    lm['type'] = 'event'
                    lm['payload'] = dict(text=result1[0].text, time_created=str(result1[0].time_created),
                                         files=files_of_mes, username=(author.name + ' ' + author.surname))
                    chats_of_user.append(
                        Chat(id=rc.id, name=rc.name, description=rc.description, avatar=rc.avatar, type=rc.type,
                             chat_role=rcu.chat_role, archive=rcu.archive, mute=rcu.mute, last_message=lm,
                             unread_messages=mes_count, users=users_of_chat, blocked_for_me=False, blocked_by_me=False))
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
            chats_of_user.append(
                Chat(id=rc.id, name=rc.name, description=rc.description, avatar=rc.avatar, type=rc.type,
                     chat_role=rcu.chat_role, archive=rcu.archive, mute=rcu.mute, last_message=last_message,
                     unread_messages=mes_count, users=users_of_chat, blocked_for_me=False, blocked_by_me=False))
        else:
            if ls:
                ls = ls[0]
                query = select(messages).where((messages.c.chat_id == rc.id) & (messages.c.time_created > ls.mes_time)) \
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
                last_message['type'] = 'event'
                last_message['payload'] = dict(text=result1[0].text, time_created=str(result1[0].time_created),
                                               files=files_of_mes)
                # else:
                #     last_message = {'msg': 'no messages'}
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
                chats_of_user.append(
                    Chat(id=rc.id, name=u.name + ' ' + u.surname, avatar=u.avatar, description='',
                         type=rc.type, archive=rcu.archive,
                         mute=rcu.mute, chat_role=0, last_message=last_message, unread_messages=mes_count,
                         users=users_of_chat, blocked_for_me=blocked_for_me, blocked_by_me=blocked_by_me))
        chats_of_user.sort(key=lambda element: element.last_message['payload']['time_created'], reverse=True)
        return chats_of_user


@router.put('/mute_chat/', responses={404: {"description": "Chat not found"},
                                      403: {"description": "User not allowed"},
                                      200: {"content": {"application/json": {}}}})
async def mute_chat(mutechat: ChangeChatUser, current_user: Annotated[User, Depends(get_current_user)],
                    session: AsyncSession = Depends(get_async_session)):
    query = select(chats).where(chats.c.id == mutechat.chat_id)
    result = await session.execute(query)
    result = result.mappings().all()
    if result:
        query = select(chatuser.c.user_id).where(chatuser.c.chat_id == mutechat.chat_id)
        result = await session.execute(query)
        rcu = list(map(lambda cu: cu.user_id, result.mappings().all()))
        if current_user.id not in rcu:
            return JSONResponse(status_code=403, content={"message": "User not in chat"})
    else:
        return JSONResponse(status_code=404, content={"message": "Chat not found"})
    query = select(chatuser).where((chatuser.c.chat_id == mutechat.chat_id) &
                                   (chatuser.c.user_id == current_user.id))
    rcu = await session.execute(query)
    rcu = rcu.mappings().all()[0]
    if mutechat.change != rcu.mute:
        nc = (update(chatuser).where((chatuser.c.chat_id == mutechat.chat_id) &
                                     (chatuser.c.user_id == current_user.id))
              .values(mute=mutechat.change))
        await session.execute(nc)
        await session.commit()
    return JSONResponse(status_code=200, content={"status": "Success"})


@router.put('/archive_chat/', responses={404: {"description": "Chat not found"},
                                         403: {"description": "User not allowed"},
                                         200: {"content": {"application/json": {}}}})
async def archive_chat(archivechat: ChangeChatUser, current_user: Annotated[User, Depends(get_current_user)],
                       session: AsyncSession = Depends(get_async_session)):
    query = select(chats).where(chats.c.id == archivechat.chat_id)
    result = await session.execute(query)
    result = result.mappings().all()
    if result:
        query = select(chatuser.c.user_id).where(chatuser.c.chat_id == archivechat.chat_id)
        result = await session.execute(query)
        rcu = list(map(lambda cu: cu.user_id, result.mappings().all()))
        if current_user.id not in rcu:
            return JSONResponse(status_code=403, content={"message": "User not in chat"})
    else:
        return JSONResponse(status_code=404, content={"message": "Chat not found"})
    query = select(chatuser).where((chatuser.c.chat_id == archivechat.chat_id) &
                                   (chatuser.c.user_id == current_user.id))
    rcu = await session.execute(query)
    rcu = rcu.mappings().all()[0]
    if archivechat.change != rcu.archive:
        nc = (update(chatuser).where((chatuser.c.chat_id == archivechat.chat_id) &
                                     (chatuser.c.user_id == current_user.id))
              .values(archive=archivechat.change))
        await session.execute(nc)
        await session.commit()
    return JSONResponse(status_code=200, content={"status": "Success"})


@router.post('/block/', responses={404: {"description": "User not found"},
                                   200: {"content": {"application/json": {}}}})
async def block(current_user: Annotated[User, Depends(get_current_user)],
                blocked_user_id: str, session: AsyncSession = Depends(get_async_session)):
    query = select(users).where(users.c.id == blocked_user_id)
    result = await session.execute(query)
    user = result.mappings().all()
    if not user:
        return JSONResponse(status_code=404, content={"message": "User not found"})
    rb = select(blocked).where((blocked.c.user_id == current_user.id) & (blocked.c.blocked_user_id == blocked_user_id))
    rb = await session.execute(rb)
    rb = rb.mappings().all()
    if not rb:
        nb = insert(blocked).values(user_id=current_user.id, blocked_user_id=blocked_user_id)
        await session.execute(nb)
        await session.commit()
        u1 = aliased(chatuser)
        query = select(chats, chatuser, u1).where((chatuser.c.chat_id == u1.c.chat_id) &
                                                  (chatuser.c.chat_id == chats.c.id) &
                                                  (chatuser.c.user_id != u1.c.user_id) &
                                                  (chatuser.c.user_id == current_user.id) &
                                                  (u1.c.user_id == blocked_user_id) &
                                                  (chats.c.type == 0))
        rc = await session.execute(query)
        rc = rc.mappings().all()
        if rc:
            rmes = dict()
            rmes['event'] = 'block'
            rmes['payload'] = dict()
            rmes['payload']['user_id'] = current_user.id
            rmes['payload']['blocked_user_id'] = blocked_user_id
            r.publish(rc[0].id, str(rmes).replace("'", '"'))
    return JSONResponse(status_code=200, content={"status": "Success"})


@router.delete("/block", responses={404: {"description": "User not found"},
                                    200: {"content": {"application/json": {}}}})
async def unblock(blocked_user_id: str, current_user: Annotated[User, Depends(get_current_user)],
                  session: AsyncSession = Depends(get_async_session)):
    query = select(users).where(users.c.id == blocked_user_id)
    result = await session.execute(query)
    user = result.mappings().all()
    if not user:
        return JSONResponse(status_code=404, content={"message": "User not found"})
    rb = select(blocked).where((blocked.c.user_id == current_user.id) & (blocked.c.blocked_user_id == blocked_user_id))
    rb = await session.execute(rb)
    rb = rb.mappings().all()
    if rb:
        nb = delete(blocked).where(
            (blocked.c.user_id == current_user.id) & (blocked.c.blocked_user_id == blocked_user_id))
        await session.execute(nb)
        await session.commit()
        u1 = aliased(chatuser)
        query = select(chats, chatuser, u1).where((chatuser.c.chat_id == u1.c.chat_id) &
                                                  (chatuser.c.chat_id == chats.c.id) &
                                                  (chatuser.c.user_id != u1.c.user_id) &
                                                  (chatuser.c.user_id == current_user.id) &
                                                  (u1.c.user_id == blocked_user_id) &
                                                  (chats.c.type == 0))
        rc = await session.execute(query)
        rc = rc.mappings().all()
        if rc:
            rmes = dict()
            rmes['event'] = 'unblock'
            rmes['payload'] = dict()
            rmes['payload']['user_id'] = current_user.id
            rmes['payload']['blocked_user_id'] = blocked_user_id
            r.publish(rc[0].id, str(rmes).replace("'", '"'))
    return JSONResponse(status_code=200, content={"status": "Success"})


@router.post("/chatfolder/{chat_id}", responses={404: {"description": "Chat not found"},
                                                 403: {"description": "User not allowed"},
                                                 200: {"content": {"application/json": {}}}})
async def add_chat_to_folders(add_folders: CreateChatfolder, chat_id: int,
                              current_user: Annotated[User, Depends(get_current_user)],
                              session: AsyncSession = Depends(get_async_session)):
    async_db_connection = async_session_maker()
    result = await check_chatuser(chat_id, current_user.id, session=async_db_connection)
    if result == 'in chat':
        stmt = select(chatfolder.c.folder_id).where(chatfolder.c.chat_id == chat_id)
        cf = await session.execute(stmt)
        cf = cf.mappings().all()
        cf = [c.folder_id for c in cf]
        for folder in add_folders.add:
            if folder not in cf:
                stmt = insert(chatfolder).values(chat_id=chat_id, folder_id=folder)
                await session.execute(stmt)
                await session.commit()
        return JSONResponse(status_code=200, content={"status": "Success"})
    else:
        return result
