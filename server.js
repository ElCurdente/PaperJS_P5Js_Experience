const path = require('path');
const express = require('express');
const http = require("http");
const socketio = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketio(server);

app.get('/', (req, res) => {
    res.send('Express is up and running!');
})

const port = process.env.PORT || 3000;
const publicDirectoryPath = path.join(__dirname, '/public');

app.use(express.static(publicDirectoryPath));

io.on("connection",(client)=>{
    console.log('New websocket connection');
 client.on('messageFromClient', msg => {
    io.emit('messageFromServer', msg);
  });
   client.on('disconnect', () => {
    console.log('New websocket disconnected');
  });
})

app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});