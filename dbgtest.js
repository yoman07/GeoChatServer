var app = require('express')()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server);

server.listen(8080);

var usernames = {};


io.sockets.on('connection', function (socket) {
  socket.emit('news', { hello: 'world' });
 
 socket.on('my other event', function (data) {
    console.log(data);
  });

  socket.on('sendchat', function (data) {
     io.sockets.emit('updatechat',{ nick:socket.username, message:data});
  });	

  socket.on('adduser', function(username) {
     socket.username = username.nick;
     usernames[username.nick] = username.nick;
     socket.emit('updatechat', {nick:'SERVER',message:'you have connected'});
     socket.broadcast.emit('updatechat', {nick:'SERVER',message:username.nick+' has connected'});
     io.sockets.emit('updateusers', {nicknames:usernames});
  });

  

  socket.on('private message', function (from, msg) {
    console.log('I received a private message by ', from, ' saying ', msg);
  });
  
   socket.on('disconnect', function () {
    delete usernames[socket.username];
    io.sockets.emit('updateusers',{nicknames:usernames});
    socket.broadcast.emit('updatechat', {nick:'SERVER',message:socket.username + 'has disconnected'});

    io.sockets.emit('user disconnected');
  });


});


