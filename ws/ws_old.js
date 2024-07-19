import ws, { WebSocketServer } from 'ws'
import Redis from "ioredis";

const redis = new Redis();
const wsServer = new WebSocketServer({ port: 3010 })

let wclients = []

redis.subscribe("messages", (err) => {
    if (err) console.error(err.message);
    console.log(`Subscribed to channel.`);
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
    let wc={
        id:data.id,
        wss:ws,
        chats: data.chats
    }
    wclients.push(wc);
    console.log('client ', data.id)
}

redis.on("message", (channel, message) => {
    message=JSON.parse(message)
    switch (message.event) {
        case "new_chat":
            addChatUser(message)
            break
        case "delete_chat":
            deleteChatUser(message)
            break
        default:
            send(message)
            break
    }
});

function send(message) {
    wclients.forEach((wc) => {
        if (wc.chats.includes(message.chat_id)) {
            if (wc.wss.readyState === ws.OPEN){
                wc.wss.send(JSON.stringify(message));
            }
        }
    });
}


function addChatUser(message) {
    wclients.forEach((wc) => {
        if (wc.id in message.users) {
            if (wc.wss.readyState === ws.OPEN)
                wc.wss.send(JSON.stringify(message));
            wc.chats.push(message.id)
        }
    });
}


function deleteChatUser(message) {
    wclients.forEach((wc) => {
        if (wc.id in message.users) {
            if (wc.wss.readyState === ws.OPEN)
                wc.wss.send(JSON.stringify(message));

            let index = wc.chats.indexOf(message.id);
            if (index !== -1) {
                wc.chats.splice(index, 1);
            }
        }
    });
}