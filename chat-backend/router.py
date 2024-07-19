from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession
from database import get_async_session, async_session_maker
from sqlalchemy import insert, delete, update, select
from models import messages, files, reactions, chats, chatuser, blocked, chatevent, update, seen, users
from datetime import datetime
from schemas import CreateMessage, CreateReaction, ChatMes, Reaction, Seen, User, ChatMesWrap
import redis
from login import get_current_user
from typing import Annotated

r = redis.Redis(host='redis', port=6379)

router = APIRouter(
    prefix='/messages',
    tags=['messages']
)


@router.post("/", response_model=ChatMesWrap, responses={404: {"description": "Chat not found"},
                                                         403: {"description": "User not in chat or blocked"},
                                                         200: {"content": {"application/json": {}}}})
async def send_message(mes: CreateMessage, current_user: Annotated[User, Depends(get_current_user)],
                       session: AsyncSession = Depends(get_async_session)):
    async_db_connection = async_session_maker()
    result = await check_chatuser(mes.chat_id, current_user.id, session=async_db_connection)
    if result == 'in chat':
        time_created = datetime.now()
        nm = insert(messages).values(user_id=current_user.id, chat_id=mes.chat_id, text=mes.text,
                                     time_created=time_created).returning(messages.c.id)
        res = await session.execute(nm)
        nm_id = res.fetchone()._mapping.id
        await session.commit()
        files_of_mes = []
        if mes.files:
            for file in mes.files:
                nf = insert(files).values(mes_id=nm_id, url=file.url, name=file.name, type=file.type, size=file.size,
                                          caption=file.caption, as_file=file.as_file)
                await session.execute(nf)
                await session.commit()
                files_of_mes.append(
                    dict(url=file.url, name=file.name, type=file.type, size=file.size, caption=file.caption,
                         as_file=file.as_file))
        chatmes = ChatMes(id=nm_id, user_id=current_user.id, chat_id=mes.chat_id, text=mes.text,
                          time_created=str(time_created), files=mes.files, reactions=[],
                          userAvatar=current_user.avatar, username=current_user.username)
        rmes = dict()
        rmes['event'] = 'new_message'
        mes_payload = dict()
        mes_payload['type'] = 'message'
        mes_payload['payload'] = dict(chatmes)
        mes_payload['payload']['files'] = files_of_mes
        rmes['payload'] = mes_payload
        r.publish(mes.chat_id, str(rmes).replace("'", '"').replace("False", 'false').replace("True", 'true'))
        return ChatMesWrap(type='message', payload=chatmes)
    else:
        return result


@router.put("/{mes_id}/", responses={404: {"description": "Not found"},
                                     403: {"description": "Forbidden"},
                                     200: {"content": {"application/json": {}}}})
async def change_message(mes_id: int, new_text: str, current_user: Annotated[User, Depends(get_current_user)],
                         session: AsyncSession = Depends(get_async_session)):
    query = select(messages).where(messages.c.id == mes_id)
    result = await session.execute(query)
    result = result.mappings().all()
    if not result:
        return JSONResponse(status_code=404, content={"message": "Message not found"})
    elif result[0].user_id == current_user.id:
        mes = result[0]
        async_db_connection = async_session_maker()
        result = await check_chatuser(mes.chat_id, mes.user_id, session=async_db_connection)
        if result == 'in chat':
            nm = messages.update().where(messages.c.id == mes_id).values(text=new_text)
            await session.execute(nm)
            await session.commit()
            rmes = dict()
            rmes['event'] = 'change_message'
            rmes['payload'] = dict()
            rmes['payload']['id'] = mes_id
            rmes['payload']['new_text'] = new_text
            r.publish(mes.chat_id, str(rmes).replace("'", '"').replace("False", 'false').replace("True", 'true'))
            return JSONResponse(status_code=200, content={"status": "Success"})
        else:
            return result
    else:
        return JSONResponse(status_code=403, content={"message": "User not author"})


@router.delete("/{mes_id}/", responses={404: {"description": "Not found"},
                                        403: {"description": "Forbidden"},
                                        200: {"description": "Success"}})
async def delete_message(mes_id: int, current_user: Annotated[User, Depends(get_current_user)],
                         session: AsyncSession = Depends(get_async_session)):
    query = select(messages).where(messages.c.id == mes_id)
    result = await session.execute(query)
    result = result.mappings().all()
    if not result:
        return JSONResponse(status_code=404, content={"message": "Message not found"})
    elif result[0].user_id == current_user.id:
        mes = result[0]
        async_db_connection = async_session_maker()
        result = await check_chatuser(mes.chat_id, mes.user_id, session=async_db_connection)
        if result == 'in chat':
            nm = (delete(messages).where(messages.c.id == mes_id))
            await session.execute(nm)
            await session.commit()
            rmes = dict()
            rmes['event'] = 'delete_message'
            rmes['payload'] = dict()
            rmes['payload']['id'] = mes_id
            r.publish(mes.chat_id, str(rmes).replace("'", '"').replace("False", 'false').replace("True", 'true'))
            return JSONResponse(status_code=200, content={"status": "Success"})
        else:
            return result
    else:
        return JSONResponse(status_code=403, content={"message": "User not author"})


@router.post("/reactions/", response_model=Reaction, responses={404: {"description": "Not found"},
                                                                403: {"description": "Forbidden"},
                                                                200: {"description": "Success"}})
async def create_reaction(reaction: CreateReaction, current_user: Annotated[User, Depends(get_current_user)],
                          session: AsyncSession = Depends(get_async_session)):
    query = select(messages).where(messages.c.id == reaction.mes_id)
    result = await session.execute(query)
    result = result.mappings().all()
    if not result:
        return JSONResponse(status_code=404, content={"message": "Message not found"})
    else:
        mes = result[0]
        async_db_connection = async_session_maker()
        result = await check_chatuser(mes.chat_id, current_user.id, session=async_db_connection)
        if result == 'in chat':
            query = select(reactions).where(
                (reactions.c.mes_id == reaction.mes_id) & (reactions.c.user_id == current_user.id))
            exists = await session.execute(query)
            exists = exists.mappings().all()
            if exists:
                rr = exists[0]
                nr = reactions.update().where(reactions.c.id == rr.id).values(name=reaction.name,
                                                                              time_created=datetime.now())
                await session.execute(nr)
                await session.commit()
                new_reaction = Reaction(id=rr.id, user_id=current_user.id, mes_id=reaction.mes_id, name=reaction.name,
                                        avatar=current_user.avatar)
                rmes = dict()
                rmes['event'] = 'change_reaction'
                rmes['payload'] = dict(new_reaction)
                r.publish(mes.chat_id, str(rmes).replace("'", '"').replace("False", 'false').replace("True", 'true'))
                return new_reaction
            else:
                nr = insert(reactions).values(user_id=current_user.id, mes_id=reaction.mes_id, name=reaction.name,
                                              time_created=datetime.now()).returning(reactions.c.id)
                res = await session.execute(nr)
                nr_id = res.fetchone()._mapping.id
                await session.commit()
                new_reaction = Reaction(id=nr_id, user_id=current_user.id, mes_id=reaction.mes_id, name=reaction.name,
                                        avatar=current_user.avatar)
                rmes = dict()
                rmes['event'] = 'new_reaction'
                rmes['payload'] = dict(new_reaction)
                r.publish(mes.chat_id, str(rmes).replace("'", '"').replace("False", 'false').replace("True", 'true'))
                return new_reaction
        else:
            return result


@router.delete("/reactions/{reaction_id}/", responses={404: {"description": "Reaction not found"},
                                                       403: {"description": "Forbidden"},
                                                       200: {"description": "Success"}})
async def delete_reaction(reaction_id: int, current_user: Annotated[User, Depends(get_current_user)],
                          session: AsyncSession = Depends(get_async_session)):
    query = select(reactions).where(reactions.c.id == reaction_id)
    result = await session.execute(query)
    result = result.mappings().all()
    if not result:
        return JSONResponse(status_code=404, content={"message": "Reaction not found"})
    elif result[0].user_id == current_user.id:
        reaction = result[0]
        async_db_connection = async_session_maker()
        query = select(messages).where(messages.c.id == reaction.mes_id)
        result = await session.execute(query)
        result = result.mappings().all()
        mes = result[0]
        result = await check_chatuser(mes.chat_id, current_user.id, session=async_db_connection)
        if result == 'in chat':
            stmt = (delete(reactions).where(reactions.c.id == reaction_id))
            await session.execute(stmt)
            await session.commit()
            rmes = dict()
            rmes['event'] = 'delete_reaction'
            rmes['payload'] = dict()
            rmes['payload']['id'] = reaction_id
            r.publish(mes.chat_id, str(rmes).replace("'", '"').replace("False", 'false').replace("True", 'true'))
            return JSONResponse(status_code=200, content={"status": "Success"})
        else:
            return result
    else:
        return JSONResponse(status_code=403, content={"message": "User not author"})


@router.get('/update')
async def get_update(last_update: datetime, current_user: Annotated[User, Depends(get_current_user)],
                     session: AsyncSession = Depends(get_async_session)):
    query = select(chatuser).where(chatuser.c.user_id == current_user.id)
    result = await session.execute(query)
    rcu = result.mappings().all()
    updates = {}
    for cu in rcu:
        updates_of_chat = {}
        query = select(messages).where((messages.c.chat_id == cu.chat_id) &
                                       (messages.c.time_created > last_update)).order_by(messages.c.time_created)
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
            messages_of_chat.append(ChatMes(id=i.id, user_id=i.user_id, chat_id=i.chat_id, text=i.text,
                                            time_created=str(i.time_created), files=files_of_mes,
                                            reactions=reactions_of_mes, userAvatar=str(author.avatar),
                                            username=(author.name + ' ' + author.surname)))
        query = select(chatevent).where(chatevent.c.chat_id == cu.chat_id).order_by(chatevent.c.time_created)
        result = await session.execute(query)
        rce = result.mappings().all()
        for i in rce:
            query = select(users).where(users.c.id == i.user_id)
            result = await session.execute(query)
            u = result.mappings().all()[0]
            i['user_id_username'] = u.name + ' ' + u.surname
            if i.second_user_id:
                query = select(users).where(users.c.id == i.user_id)
                result = await session.execute(query)
                u = result.mappings().all()[0]
                i['second_user_id_username'] = u.name + ' ' + u.surname
            messages_of_chat.append(i)
        messages_of_chat.sort(key=lambda element: element.time_created)

        query = select(reactions, messages).where((messages.c.chat_id == cu.chat_id) &
                                                  (reactions.c.time_created > last_update))
        result = await session.execute(query)
        rp = result.mappings().all()
        reactions_of_chat = []
        for reaction in rp:
            reaction = dict(reaction)
            query = select(users).where(users.c.id == reaction['user_id'])
            result = await session.execute(query)
            react_author = result.mappings().all()[0]
            reaction['avatar'] = react_author.avatar
            reactions_of_chat.append(reaction)

        query = select(update).where((update.c.chat_id == cu.chat_id) & (update.c.time_created > last_update))
        result = await session.execute(query)
        new_of_chat = list(result.mappings().all())

        updates_of_chat['messages'] = messages_of_chat
        updates_of_chat['reactions'] = reactions_of_chat
        updates_of_chat['updates'] = new_of_chat
        updates[cu.chat_id] = updates_of_chat
    return updates


@router.post("/seen", response_model=Seen, responses={404: {"description": "Message not found"},
                                                      403: {"description": "User not in chat"},
                                                      200: {"content": {"application/json": {}}}})
async def add_seen(mes_id: int, current_user: Annotated[User, Depends(get_current_user)],
                   session: AsyncSession = Depends(get_async_session)):
    query = select(messages).where(messages.c.id == mes_id)
    message = await session.execute(query)
    message = message.mappings().all()
    if message:
        message = message[0]
        query = select(chatuser.c.user_id).where(chatuser.c.chat_id == message.chat_id)
        result = await session.execute(query)
        rcu = list(map(lambda cu: cu.user_id, result.mappings().all()))
        if current_user.id not in rcu:
            return JSONResponse(status_code=403, content={"message": "User not in chat"})

        query = select(seen).where((seen.c.chat_id == message.chat_id) & (seen.c.user_id == current_user.id))
        last_seen = await session.execute(query)
        last_seen = last_seen.mappings().all()
        if last_seen:
            last_seen = last_seen[0]
            ls = seen.update().where(seen.c.id == last_seen.id).values(mes_time=message.time_created,
                                                                       user_id=current_user.id, chat_id=message.chat_id)
            await session.execute(ls)
            await session.commit()
            newseen = Seen(mes_id=mes_id, user_id=current_user.id, chat_id=message.chat_id)
            rmes = dict()
            rmes['event'] = 'new_seen'
            rmes['payload'] = dict(newseen)
            r.publish(message.chat_id, str(rmes).replace("'", '"'))
            return newseen
        else:
            ns = insert(seen).values(mes_time=message.time_created, user_id=current_user.id,
                                     chat_id=message.chat_id)
            await session.execute(ns)
            await session.commit()
            newseen = Seen(mes_id=mes_id, user_id=current_user.id, chat_id=message.chat_id)
            rmes = dict()
            rmes['event'] = 'new_seen'
            rmes['payload'] = dict(newseen)
            r.publish(message.chat_id, str(rmes).replace("'", '"'))
            return newseen
    else:
        return JSONResponse(status_code=404, content={"message": "Message not found"})


async def check_chatuser(chat_id: int, user_id: str, session: AsyncSession):
    query = select(chats).where(chats.c.id == chat_id)
    result = await session.execute(query)
    result = result.mappings().all()
    if result:
        rc = result[0]
        query = select(chatuser.c.user_id).where(chatuser.c.chat_id == chat_id)
        result = await session.execute(query)
        rcu = list(map(lambda cu: cu.user_id, result.mappings().all()))
        if user_id in rcu:
            if rc.type == 0:
                rcu.remove(user_id)
                query = select(blocked).where((blocked.c.user_id == rcu[0]) & (blocked.c.blocked_user_id == user_id))
                result = await session.execute(query)
                if result.mappings().all():
                    return JSONResponse(status_code=403, content={"message": "User blocked"})
        else:
            return JSONResponse(status_code=403, content={"message": "User not in chat"})
    else:
        return JSONResponse(status_code=404, content={"message": "Chat not found"})
    return 'in chat'
