const crypto = require('crypto'); 
const passwordHashAlgorithm = 'sha1';

module.exports = function(client) {	

var computeSHA1 = function(str) { return crypto.createHash(passwordHashAlgorithm).update(str).digest('hex'); };

function position(x,y) {
	this.x = x;
	this.y = y;
}

function userObject(email, password, nick, age, gender) {
	this.email = email;
	this.password = password;
	this.nick = nick;
	this.age = age;
	this.gender = gender;
}

function errorObject(message) {
	this.success = 0;
	this.message = message;
}

function successMessageObject(message) {
	this.success = 1;
	this.data = {
		"message" : message
	};
}

function successObject(data) {
	this.success = 1;
	this.data = data;
}
    
var user = {
		userObject: function(email, password, nick, age, gender) {
			return new userObject(email, password, nick, age, gender);
		},
		nextUserId: function(callback) {
			client.incr("next_user_id", function(err, result)  {
				callback(result);
			});
		},
		isEmailAllow : function(email, callback) {
			client.exists("username:"+email, function(err,result) {
				callback(result);
			});
		},
		isNickAllow : function(nick, callback) {
			client.exists("username:"+nick, function(err,result) {
				callback(result);
			});
		},
		existsUserById : function(userId, callback) {
			client.exists("user:"+userId, function(err,result) {
				if(result == 1) {
					callback(new successObject("User exists in database"));
				} else {
					callback(new errorObject("User not exists in database"));
				}
			});
		},
		exitsUserByEmail : function(email, callback) {
			client.exists("username:"+email, function(err,result) {
				if(result == 1) {
					callback(new successObject("User exists in database"));
				} else {
					callback(new errorObject("User not exists in database"));
				}
			});
		},
		registerUser: function(data, callback) {
			var email = data.email;
			var password = data.password;
			var nick = data.nick;
			var age = data.age;
			var gender = data.gender;
			
			user.isEmailAllow(email, function(emailResult) {
				var isAllow = emailResult;
				if(emailResult == 1) {
					callback(new errorObject("User exists in database"));
					return;
				} else if(!(email.length > 6 && email.length < 64 &&
						password.length >4 && password.length < 64 &&
						nick.length > 2 && nick.length < 64 &&
						age.length == 4 && age >= 1900 && age <= 2012)
					
					) {
				
					callback(new errorObject("Invalid regiser data"));
					return;
				}
				else {
					user.isNickAllow(nick, function(nickResult) {
						if(nickResult == 1) {
							callback(new errorObject("User nick exists in database"));
							return;
						} else {
							user.nextUserId(function(resultId) {
								data.id = resultId;
								register();
							});
					
							function register() {
								client.set("username:" + email, data.id, function(err, result) {
									console.log("setUsername " + result + "id:" + data.id);
								
								});
								client.set("username:" + nick, data.id);
								console.log('Data in register ' + data);
								console.log('Data in register ' + JSON.stringify(data));
								client.hmset(
									["user:" + data.id,
										"id", data.id,
										"email", data.email,
										"password", computeSHA1(data.password),
										"nick", data.nick,
										"age", data.age,
										"gender", data.gender
										], 
										function (err, res) {
											console.log('hmset value ' + res);	
								   			 callback(new successObject(data));
											client.save();
										}
										
								);

							}
						}
					});
				}
			});
		},
		getUserId: function(email, callback) {
			client.get("username:"+email, function(err, result) {
				if(err == null) {
					if(result == null) {
						callback(new errorObject("This user does not exist"));
					} else {
						callback(new successObject(result));
					}
				} else {
					callback(new errorObject(errorMessage));
				}
			});
		},
		getUserById: function(userId, callback) {
			client.hgetall("user:"+userId, function(err, result) {
				if(err == null) {
					if(result != null) {
						callback(new successObject(result));
					} else {
						callback(new errorObject("This user does not exist"));
					}
				} else {
					callback(new errorObject(errorMessage));
				}
			});
		},
		getUserByEmail: function(email, callback) {
			user.getUserId(email, function(result) {
				
				if(result.success == 1) {
					userId = result.data;
					
					user.getUserById(userId, function(result) {
						callback(result);
					});
				} else {
					callback(result);
				}
			
			});
		},
		
		validateUser: function(email, validatePassword, callback) {
			user.getUserByEmail(email, function(result) {
			
				var errorMessage = "Wrong login or password";
				if(result.success == 0) {
					callback(new errorObject(errorMessage));
					return;
				}
				
				data = result.data;
				validatePassword = computeSHA1(validatePassword);
				var password = data.password;
				if(validatePassword == password) {
					callback(result);
				} else {
					callback(new errorObject(errorMessage));
				}
			});
		},
		getFriends : function(userId, callback) {
			client.smembers("user:"+userId+":friends_ids", function(err, result) {
				if(err != null) {
					callback(new errorObject("Problem with get data"));
					return;
				}
				
				callback(new successObject(result));
			});	
		},
		isFriend : function(userId, user2Id, callback) {
			client.sismember("user:"+userId+":friends_ids",user2Id, function(err, result) {
				if(err != null) {
					callback(new errorObject("Problem with get data"));
					return;
				} 
				var data = {};
				
				if(result == 1) {
					data.isFriend = true;
					callback(new successObject(data));	
				} else {
					data.isFriend = false;
					callback(new successObject(data));		
				}
			});
		},
		addFriend : function(myId, userId, callback) {
			user.isFriend(myId, userId, function(result) {
				if(result.data.isFriend) {
					callback(new errorObject("Users are already friends"));
					user.clearInvitation(myId, userId);
				} else {
					client.sadd("user:"+myId+":friends_ids",userId, function(err, result) {
						if(err != null) {
							callback(new errorObject("Problem with get data"));
							return;
						} else {
							client.sadd("user:"+userId+":friends_ids",myId, function(err, result) {
								var data = {};
								data.firstUserId = myId;
								data.secondUserId = userId;
								
								user.clearInvitation(myId, userId);
								client.save();
								callback(new successObject(data));
								
							});
						
						}
					});
				
				}
			
			});
		},
		
		
		
		
		
		clearInvitation : function(userId, user2Id) {
			console.log("clear invitations");
			
			
			client.srem("user:"+userId+":sent_invitations_ids", user2Id);
			client.srem("user:"+user2Id+":sent_invitations_ids", userId);
			client.srem("user:"+userId+":invitations_ids", user2Id);
			client.srem("user:"+user2Id+":invitations_ids", userId);			
			client.save();
		},
		getSentInvitations : function(userId, callback) {
			client.smembers("user:"+userId+":sent_invitations_ids", function(err, result) {
				if(err != null) {
					callback(new errorObject("Problem with get data"));
					return;
				}
				callback(new successObject(result));
			});	
		},
		
		getSentInvitationsUsers : function(userId, callback) {
				client.smembers("user:"+userId+":sent_invitations_ids", function(err, result) {
			
				if(err != null) {
					callback(new errorObject("Problem with get data"));
					return;
				}
				
				multi = client.multi();
				for (var i = 0; i < result.length; i++) {
					multi.hgetall("user:"+ result[i]);
				}
				
	
			    multi.exec(function (err, replies) {
			    	console.log("Multi exec result" + replies);
			        callback(new successObject(replies));
			    });
				
				
			});	
		},
		
		isSentUserInvitations: function(userId, userInvitationsId, callback) {
			client.sismember("user:"+userId+":sent_invitations_ids",userInvitationsId, function(err, result) {
				if(err != null) {
					callback(new errorObject("Problem with get data"));
					return;
				} 
				var data = {};
				
				if(result == 1) {
					data.invited = true;
					callback(new successObject(data));	
				} else {
					data.invited = false;
					callback(new successObject(data));		
				}
				
				
			});
		},
		
		sendInvitation: function(myId, userId, callback) {
			user.isSentUserInvitations(myId, userId, function(result) {
				if(result.data.invited == 1) {
					callback(new errorObject("You already invited this user."));
					return;
				} else {
					
					user.isSentUserInvitations(userId, myId, function(result) {
						if(result.data.invited == 1) {
							user.addFriend(myId, userId, function(result) {
								callback(result);
								return;
							});
						} else {
							user.addInvitations(myId, userId, callback);
						}
					
					});
				}
			
			});

		},
		
		addInvitations: function(fromId, toId, callback) {
			client.sadd("user:"+toId+":invitations_ids",fromId, function(err, result) {
				if(result) {
					client.sadd("user:"+fromId+":sent_invitations_ids",toId);
					callback(new successMessageObject("Invitation has been sent."));
					client.save();
				} else {
					callback(new errorObject("Invitations has already been sent."));
				}
			});
		},
		
		getInvitations: function(userId, callback) {
			client.smembers("user:"+userId+":invitations_ids", function(err, result) {
				if(err != null) {
					callback(new errorObject("Problem with get data"));
					return;
				}
				

				callback(new successObject(result));
			});	
		},
		
		getInvitationsUsers : function(userId, callback) {

			client.smembers("user:"+userId+":invitations_ids", function(err, result) {
			
				if(err != null) {
					callback(new errorObject("Problem with get data"));
					return;
				}
				
				multi = client.multi();
				for (var i = 0; i < result.length; i++) {
					multi.hgetall("user:"+ result[i]);
				}
				
	
			    multi.exec(function (err, replies) {
			    	console.log("Multi exec result" + replies);
			        callback(new successObject(replies));
			    });
				
				
			});	
		},
		
		getFriendsUser : function(userId, callback) {
			client.smembers("user:"+userId+":friends_ids", function(err, result) {
				if(err != null) {
					callback(new errorObject("Problem with get data"));
					return;
				}
				
				multi = client.multi();
				for (var i = 0; i < result.length; i++) {
					multi.hgetall("user:"+ result[i]);
				}
				
	
			    multi.exec(function (err, replies) {
			    	console.log("Multi exec result" + replies);
			        callback(new successObject(replies));
			    });
			});	
		},

}

return user;

}

//var user1 = new userObject("testowy5@o2.pl", "testoweHaslo");
//user.addUser(user1, function(result) {
//	console.log(result);
//});
//
//user.validateUser('testowy5@o2.pl', 'testoweHasl2o', function(result) {
//	console.log(result);
//});
//user.validateUser('testowy5@o2.pl');