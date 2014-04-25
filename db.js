const crypto = require('crypto'); 
const passwordHashAlgorithm = 'sha1';


    
module.exports = function(client) {
	
var computeSHA1 = function(str) { return crypto.createHash(passwordHashAlgorithm).update(str).digest('hex'); };
	
var user = {
		addUser: function(email, password, callback) {
			client.incr('global:userId', function(error, id) {
				if(error) {
					
					callback(false);
					
					return;
				};
				id --;
				console.log('Dodaje user z id ' + id);
				client.setnx('user:' + email + ':id', id, function(error, set) {
	                 if (error) {
	                	    console.log('Error ' + error);
	                        callback(false);
	                        return;
	                    };
               	     console.log('Set ' + set);
	                 if (set == 0) {
	                        callback(false, 'User ' + email + ' is registred');
	                        return;
	                  };
	                 client
	                 	.multi()
	                 	.set('user:'+id+':email', email)
	                 	.set('user:' + id + ':password', computeSHA1(password))
	                 	.exec(function(error, results) {
	                        if (error) {
                                callback(false);
                                return;
                            };
                            callback(true);
                            return;
	                 	});
				});
			});
		},
		getUserWithEmail: function(email, callback) {
			client.get('user:' + email.toLowerCase() + ':id', function(error,id) {
				if(error) {
					callback(null);
					return;
				}
				if (id == null) {
					callback(null);
					return;
				}
				user.getUserWithId(id, callback);
			});
		},
		getUserWithId: function(id, callback) {
			client
				.multi()
				.get('user:' + id + ':email')
				.exec(function(error, results) {
					if (error) {
						callback(null);
						return;
					}
					callback({
						id: id,
						email: results[0]
					});
				});
		},
			
		validateUser: function(email, password, callback) {
			user.getUserWithEmail(email, function(user) {
				if(user == null) {
					callback(false);
					return;
				}
				client.get('user:' + user.id + ':password', function(error, passwordF) {
					if(error) {
						callback(false);
						return;
					}
					callback(computeSHA1(password) == passwordF);
				});
			});
		},
};    
    

return user;
};
//
//user.addUser('test2@o2.pl', 'test', function(result, msg) {
//	if(result) {
//		console.log('jest ok');
//	} else {
//		console.log('Error: ' + msg);
//	}
//});
//
//user.validateUser('test3@o2.pl', 'test', function(result) {
//	console.log('Validate: ' + result);
//});
//    client.set("string key", "string val", redis.print);
//    client.hset("hash key", "hashtest 1", "some value", redis.print);
//    client.hset(["hash key", "hashtest 2", "some other value"], redis.print);
//    client.hkeys("hash key", function (err, replies) {
//        console.log(replies.length + " replies:");
//        replies.forEach(function (reply, i) {
//            console.log("    " + i + ": " + reply);
//        });
//        client.quit();
//    });