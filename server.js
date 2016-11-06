var serverPort = 5000;
var mongoUrl = 'localhost:27017';
// var mongoUrl = 'http://127.0.0.1:27017';/*???*/
var dbName = 'project';

var MongoClient = require('mongodb');
var ObjectID = MongoClient.ObjectID;
var app = require('express')();
var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var assert = require('assert');
var usersTable = 'users';
var tokenTable = 'Connections';
var q = require('q');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({extended: true})); // support encoded bodies


MongoClient.connect('mongodb://' + mongoUrl + '/' + dbName, function (err, db) {
    if (err) {
        console.log('connection to mongo failed ');
    } else {
        console.log(' Successfully connected to mongo ');

        app.all('/', (req, res)=> {
            console.log('A request is received in default url  ');

            sendResponse(res, 'Welcome  default url write');

            /*find and modify and get the updated record in callback ..
             this res.value  will be null if no record matched ..
             findAndModify(db,'temp',{name:'name5'},{name:1},{$set:{name:'nameNew55'}},{new:true},function(res){
             console.log('response of find and modify ... '+ JSON.stringify(res.value,null,' '))
             })*/

            /*
             unsetting a value from find and modify
             findAndModify(db, 'temp', {name: 'nameNew55'}, {name: 1}, {$unset: {name: ''}}, {new: true}, function (res) {
             console.log('response of find and modify ... ' + JSON.stringify(res.value, null, ' '))
             })*/
        });

        app.all('/login', function (req, res) {
            console.log('Welcome to login .....req.body is -- !' + JSON.stringify(req.body));
            var username = req.body.username;
            var password = req.body.password;
            if (username && password) {
                find(db, usersTable, {username: username, password: password}, {res: res}, function (docs) {
                    if (docs.length === 0) {
                        console.log('login -- no user found .....!');
                        sendError(res, 'Username password did not match');
                    } else {
                        /*create a token and return */
                        // console.log('Login :  user -->'+JSON.stringify(docs[0], null, ' '));
                        insert(db, tokenTable, {user: docs[0]}, {res: res}, function (result) {
                            var responseToReturn = {
                                user: docs[0]

                            }
                            responseToReturn.user.token = result.insertedIds[0];
                            sendResponse(res, {data: responseToReturn});
                        })
                    }
                })
            } else {
                sendError(res, 'Username and password are mandatory')
            }
        });

        app.all('/signup', function (req, res) {
            // console.log('Welcome to signup req.body ' + JSON.stringify(req.body));
            var username = req.body.username;
            var password = req.body.password;
            var recordToInsert = {
                username: username,
                password: password
            };
            if (username && password) {
                checkUserExistence(db, username).then(()=> {
                    insert(db, usersTable, recordToInsert, {res: res}, function (result) {
                        console.log(JSON.stringify(result, null, ' '));
                        sendResponse(res, {message: 'Signup Successfully'});
                    })
                }).catch((e)=> {
                    console.log('error in checkc user existence '+e);
                    sendError(res, e.message)
                });
            } else {
                sendError(res, 'Username password are mandatory for Signup')
            }
        });

        app.all('/logout', function (req, res) {
            console.log('Welcome to logout req.body ' + JSON.stringify(req.body));
            var token = req.body.token;

            if (token) {
                var query = {_id: ObjectID(token)};
                var options = {justOne: true};
                remove(db, tokenTable, query, options, {res: res}, function (result) {
                    console.log('Logout response -- ' + JSON.stringify(result, null, ' '));
                    sendResponse(res, {message: 'Successfully logged out'})
                })
            } else {
                //sendError(res, 'Token is mandatory for logout')
                /*dont why to throw error or not*/
            }
        });


        app.all('/query', function (req, res) {
            console.log('Query >> .....req.body is -- !' + JSON.stringify(req.body));
            var dataset = req.body.dataset;
            /*this parsing is error prone*/
            console.log('dataset' + JSON.stringify(dataset));
            dataset = JSON.parse(dataset);

            var token = req.body.token;
            var args = req.body.args;
            // {dataset,token,args:{limit:5}}
            var query = {/*from  args.filter */};
            var limit = {}
            /*parse the aguments  */


            if (token && dataset && dataset.type) {
                validateToken(db, token).then(()=> {
                    console.log('token validation Success');
                    find(db, dataset.type, {}, undefined, function (docs) {
                        sendResponse(res, {data: docs})

                    })
                }).catch((e)=> {
                    console.log('token validation failed' + e);
                    sendError(res, e)
                })

            } else {
                sendError(res, 'Token and dataset are mandatory for Query')
            }
        });


        app.listen(serverPort, function () {
            console.log(serverPort + ' port is ready to be listen')
        });
    }
});

// response :{
//     data:responseData,
//     error:error,
//     message:anyResponseMessage
// }
// error :{
//     message:errorMessag e,
//     other info 
// }
/* functions for mongo interactions---->>*/
var checkUserExistence = (db, username)=> {
    return new Promise((resolve, reject)=> {

        find(db, usersTable, {username}, undefined, (docs)=> {
            if (docs.length > 0) {
                /*success*/
                reject(new Error('Username already taken'));
            } else {
                resolve({res: 'Username Available'});
            }
        }, err=> reject(err));

    })
};
var validateToken = function (db, token) {
    return new Promise((resolve, reject)=> {

        find(db, tokenTable, {_id: ObjectID(token)}, undefined, function (docs) {
            if (docs.length === 1) {
                /*success*/
                resolve({res: 'Token Validated'});
            } else {
                reject(new Error('Invalid Token'));
            }
        }, function (err) {
            reject(err);
        });

    })
}
var validateToken1 = function (db, token) {
    var promise = q.defer();

    find(db, tokenTable, {_id: ObjectID(token)}, undefined, function (docs) {
        if (docs.length === 1) {
            /*success*/
            promise.resolve({res: 'Token Validated'});
        } else {
            promise.reject(new Error('Invalid Token'));

        }
    }, function (err) {
        promise.reject(err);
    })
}
var find = function (db, collectionName, query, options, onSuccess, onFailure) {
    options = options || {};
    return db.collection(collectionName).find(query).toArray(function (err, docs) {
        //console.log('find is executing .. Collection :- '+collectionName+'  and query :- '+JSON.stringify(query,null,' '));
        if (err) {
            onFailure ? onFailure(err) : sendError(options.res, err);
        } else {
            onSuccess(docs);
        }
    });
}


var insert = function (db, collectionName, recordToInsert, options, onSuccess) {
    db.collection(collectionName).insert(recordToInsert, function (err, result) {
        if (err) {
            console.log('insert :- error ' + err.message);
            sendError(options.res, err);
        } else {
            console.log('insert :- result ' + JSON.stringify(result));
            onSuccess(result)
        }
    })
}

var update = function (db, collectionName, query, updates, options, callback) {
    db.collection(collectionName).update(query, updates, options, callback)
    // > db.a.update({_id:2},{$set:{name:'b'}})
    // > db.a.update({_id:2},{$unset:{name:'b'}})

}

var remove = function (db, collectionName, query, removeOptions, options, onSuccess) {
    db.collection(collectionName).remove(query, removeOptions, function (err, result) {
        if (err) {
            sendError(options.res, err);
        } else {
            console.log('remove response -- ' + JSON.stringify(result, null, ' '));
            onSuccess(result);
        }
    })
    // db.collection(collectionName).remove(query,{justOne: <boolean>,writeConcern: <document>})
}


var findAndModify = function (db, collectionName, query, sort, updates, options, onSuccess) {
    /*options :{new:true}*/
    /*Options
     w, {Number/String, > -1 || ‘majority’ || tag name} the write concern for the operation where &lt; 1 is no acknowlegement of write and w >= 1, w = ‘majority’ or tag acknowledges the write
     wtimeout, {Number, 0} set the timeout for waiting for write concern to finish (combines with w option)

     fsync, (Boolean, default:false) write waits for fsync before returning, from MongoDB 2.6 on, fsync cannot be combined with journal

     j, (Boolean, default:false) write waits for journal sync before returning

     remove {Boolean, default:false}, set to true to remove the object before returning.

     upsert {Boolean, default:false}, perform an upsert operation.

     new {Boolean, default:false}, set to true if you want to return the modified object rather than the original. Ignored for remove.
     */
    db.collection(collectionName).findAndModify(query, sort, updates, options, function (err, result) {
        if (err) {
            sendError(options.res, err);
        } else {
            onSuccess(result);
        }
    })
}


/* functions dealing with response .. */
var sendError = function (res, errorMessage) {
    //console.log('Error message in sendError ' + errorMessage);
    if (res) {
        var errorObj = typeof errorMessage == 'string' ? {message: errorMessage} : errorMessage;
        console.log('errorObj' + errorObj);
        res.write(JSON.stringify({error: errorObj}));
        res.status(400);
        res.end();
    }
}
var sendResponse = function (res, responseToSend) {
    if (res) {

        responseToSend = typeof responseToSend == 'string' ? responseToSend : JSON.stringify(responseToSend);
        res.write(responseToSend);
        res.end();
    }
}


