var app = require('express')()
  , server = require('http').createServer(app)
  , io = require('socket.io').listen(server);

server.listen(8081);



var redis = require("redis"),
    redisClient = redis.createClient();

// if you'd like to select database 3, instead of 0 (default), call
// client.select(3, function() { /* ... */ });

redisClient.on("error", function (err) {
    console.log("Error " + err);
});






var dbReq = require('./database')
	, db = dbReq(redisClient);


var users = {};
var usersSockets = {};

function MessageObject(user, message) {
	this.user = user;
	this.message = message;
}

io.sockets.on('connection', function (socket) {




  socket.on('validateUser', function (data) {

	  if(!data.email || !data.password) {
		  return;
	  }
	  db.validateUser(data.email , data.password, function(result) {
	  		if(result != null && result.success == 1) {
	  			var userId = result.data.id;
	  			var userData = result;
	  			users[userId] = result.data;
	  			usersSockets[userId] = socket;
	  			
	  			
	  			db.getFriendsUser(userId, function(friendsResult) {
	  				userData.data.friends = friendsResult.data;
					
	  				db.getSentInvitationsUsers(userId, function(sentInvitationResult) {
	  					userData.data.sentInvitations = sentInvitationResult.data;
	  					
	  					db.getInvitationsUsers(userId, function(getInvitationData) {
	  						userData.data.invitations = getInvitationData.data
	  						socket.user = userData.data;
							
							console.log('users online stringify' + users);
							
							socket.broadcast.emit('userConnected', result);
	  						console.log('users:' + users);
	  						socket.emit('validateUserResult', userData);
	  						socket.emit('usersOnline', {"data" : users,
												"success" : 1
												});	
	  					});
	  				});
	  			});
	  		} else {
	  			socket.emit('validateUserResult', result);
	  		}
	  });
  });	
  
  
  socket.on('signUpUser', function (data) {
	  console.log(data);
	  if(!data.email || !data.password) {
		  socket.emit('signUpUserResult', null);
		  return;
	  }

	  db.registerUser(db.userObject(data.email, data.password, data.nick, data.age, data.gender), function(result) {
		  delete result['password'];
		  socket.emit('signUpUserResult', result);
		  
		  if ( result != null && result.success == 1) {
			  socket.user = result.data;
			  users[result.data.id] = result.data;
			  usersSockets[result.data.id] = socket;
			  socket.emit('usersOnline', {"data" : users,
												"success" : 1
												});
			  socket.broadcast.emit('userConnected', result );	
		  }								
	  });
  });	
  
  socket.on('sendMessage', function(data) {
	 console.log(data);
	 if(data.id && data.message) {
		 
		 var socketUser = usersSockets[data.id];
		 console.log('socketUster ' + socketUser);
		 if(socketUser) { 
		 	var msgObj = new MessageObject(socket.user, data.message);
		 	console.log('gotMessage ' + JSON.stringify(msgObj));
		 	socketUser.emit('gotMessage',  msgObj);
		 } else {
		 	console.log('ERROR: Problem with userssocket');
		 }
	 } 
  });
  
  socket.on('sendPosition', function(data) {
	 console.log(data);
	 if(data.x && data.y) {
		 
		 var socketUser = socket.user;
		 
		 console.log('socketUster ' + socketUser);
		 if(socketUser) { 
		 	socket.broadcast.emit('gotPosition', { "user" : socket.user,
		 										   "success" : 1,
		 										   "position" : {
		 										   		"x" : data.x,
		 										   		"y" : data.y
		 										   }
		 										     } );

		 } else {
		 	console.log('ERROR: Problem with userssocket');
		 }
	 } 
  });
  
  socket.on('sendInvitation', function(data) {
  	 var toId = data.id;
 	 var myUser = socket.user;
 	 var socketUser = usersSockets[data.id];
 	 db.sendInvitation(socket.user.id, toId, function(result) {
 	 	socket.emit('sendInvitationResult', result);	
 	 	if(result.success == 1) {
 	 		socketUser.emit('gotInvitation',{ "user" : myUser,
		 										   "success" : 1 } );
 	 	}
 	 });
  });
  
  socket.on('acceptInvitation', function(data) {
  	 var toId = data.id;
 	 var myUser = socket.user;
 	 var socketUser = usersSockets[data.id];
 	 db.addFriend(socket.user.id, toId, function(result) {
 	 	socket.emit('acceptInvitationResult', result);	
 	 	if(socketUser != null) {
 	 		socketUser.emit('acceptedInvitation', { "user" : myUser,
		 										   "success" : 1 });
 	 	}
 	 });
  });  
  
  socket.on('rejectInvitation', function(data) {
  	 var toId = data.id;
 	 var myUser = socket.user;
 	 var socketUser = usersSockets[data.id];
 	 db.clearInvitation(socket.user.id, toId, function(result) {
 	 	socket.emit('rejectInvitationResult', result);		
 	 	socketUser.emit('rejectInvitation', myUser);
 	 });
  }); 
  
  
  

  
  socket.on('disconnect', function () {
	socket.broadcast.emit('userDisconnected',  { "data" : socket.user,
												 "success" :1 } );
	
	console.log('users in disc ' + JSON.stringify(users));
	console.log('Socket user ' +socket.user);
	console.log('Socket user object ' + JSON.stringify(socket.user) );

    if(socket.user != null) {
		var userId = socket.user['id'];
		delete users[userId];
		console.log('users in disc after delete' + JSON.stringify(users));
	}

    io.sockets.emit('user disconnected  ');
  });


});


