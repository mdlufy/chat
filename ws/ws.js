import ws, { WebSocketServer } from 'ws'
import Redis from "ioredis";
const redis = new Redis({
    host: 'redis',
    port: 6379
});

const wsServer = new WebSocketServer({ port: 3000 })

let chats = {}
let clients = {}


redis.subscribe('new', (err) => {
    if (err) console.error(err.message);
    console.log(`Subscribed to channel of new`);
});


wsServer.on("connection", (ws) => {
    ws.on("message", (data) => {
        console.log(`received: ${data}`);
        data = JSON.parse(data);
        switch (data.event) {
            case "connection":
                addclient(data, ws);
                break;
        }
    });
});


function addclient(data, ws) {
    clients[data.id] = ws
    let chats_of_user = data.chats;
    let chats_ids = Object.keys(chats)
    for (let i = 0; i < chats_of_user.length; i++){
        if (chats_ids.includes(chats_of_user[i].toString())){
            chats[chats_of_user[i]].push(ws);
        } else{
            chats[chats_of_user[i]]=[]
            chats[chats_of_user[i]].push(ws);
            redis.subscribe(chats_of_user[i], (err) => {
                if (err) console.error(err.message);
                console.log(`Subscribed to channel`, chats_of_user[i]);
            });
        }
    }
}


function send(message, channel) {
    for (let i = 0; i < chats[channel].length; i++){
        if (chats[channel][i].readyState === ws.OPEN) {
            console.log('send')
            chats[channel][i].send(JSON.stringify(message));
        }
    }
}


function addChatUser(message, channel) {
    if (clients.hasOwnProperty(message.added_user_id)){
        if (!(chats.hasOwnProperty(channel))) {
            chats[channel]=[]
            redis.subscribe(channel, (err) => {
                if (err) console.error(err.message);
                console.log(`Subscribed to channel`, channel);
            });
        }
        chats[channel].push(clients[message.added_user_id]);
        if (clients[message.added_user_id].readyState === ws.OPEN){
            clients[message.added_user_id].send(JSON.stringify(message));
        }
    }
}


function newChat(message, channel) {
    let cur_users = Object.keys(clients).filter((user) => message.users.includes(user))
    if (cur_users){
        if (!(chats.hasOwnProperty(channel))) {
            redis.subscribe(channel, (err) => {
                if (err) console.error(err.message);
                console.log(`Subscribed to channel`, channel);
            });
        chats[channel]=[]
        }
        for (let i = 0; i < cur_users.length; i++){
            chats[channel].push(clients[cur_users[i]]);
            if (clients[cur_users[i]].readyState === ws.OPEN)
                clients[cur_users[i]].send(JSON.stringify(message));
        }
    }
}


function deleteChatUser(message, channel) {
    if (clients.hasOwnProperty(message.payload.second_user_id)){
        let index = chats[channel].indexOf(clients[message.payload.second_user_id]);
        if (index !== -1)
            chats[channel].splice(index, 1)
        if (clients[message.payload.second_user_id].readyState === ws.OPEN)
            clients[message.payload.second_user_id].send(JSON.stringify(message));
    }
    for (let i = 0; i < chats[channel].length; i++){
        if (chats[channel][i].readyState === ws.OPEN) {
            chats[channel][i].send(JSON.stringify(message));
        }
    }
}


function leaveChatUser(message, channel) {
    if (clients.hasOwnProperty(message.payload.user_id)){
        let index = chats[channel].indexOf(clients[message.payload.user_id]);
        if (index !== -1)
            chats[channel].splice(index, 1)
        if (clients[message.payload.user_id].readyState === ws.OPEN)
            clients[message.payload.user_id].send(JSON.stringify(message));
    }
    for (let i = 0; i < chats[channel].length; i++){
        if (chats[channel][i].readyState === ws.OPEN) {
            chats[channel][i].send(JSON.stringify(message));
        }
    }
}


function deleteChat(message, channel) {
    for (let i = 0; i < chats[channel].length; i++){
        if (chats[channel][i].readyState === ws.OPEN) {
            console.log('send')
            chats[channel][i].send(JSON.stringify(message));
        }
    }
    delete chats[channel]
}


redis.on("message", (channel, message) => {
    console.log(`received: ${message}`);
    message = JSON.parse(message);
    channel = channel.toString()
    switch (message.event) {
        case "new_chat":
            newChat(message, message.payload.id)
            break
        case "add_chatuser":
            addChatUser(message, message.payload.id)
            break
        case "delete_chatuser":
            deleteChatUser(message, channel)
            break
        case "user_left":
            leaveChatUser(message, channel)
            break
        case "delete_chat":
            deleteChat(message, channel)
            break
        default:
            send(message, channel)
            break
    }
});