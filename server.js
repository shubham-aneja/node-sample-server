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
            var user = undefined;
            getMergedParameters(req)
                .then((mergedParams)=> {
                    // console.log('Welcome to login .....merged params are :-- -- !' + JSON.stringify(mergedParams));
                    var userName = mergedParams.username;
                    var password = mergedParams.password;
                    if (!userName || !password) {
                        throw new Error('Username and password are mandatory')
                    }
                    return find(db, usersTable, {username: mergedParams.username, password: mergedParams.password})
                }).then((docs)=> {
                    if (docs.length === 0) {
                        console.log('login -- no user found .....!');
                        throw new Error('Username password did not match');
                    } else {
                        user = docs[0];
                        return insert(db, tokenTable, {user: docs[0]}, {res: res})
                    }
                }).then((result)=> {
                    var responseToReturn = {
                        user: user
                    }
                    responseToReturn.user.token = result.insertedIds[0];
                    sendResponse(res, {data: responseToReturn});
                }).catch((e)=> {
                    console.log('Login Error :- ' + e.stack)
                    sendError(res, e.message)
                })
        });


        app.all('/signup', function (req, res) {
            // console.log('Welcome to signup req.body ' + JSON.stringify(req.body));
            var recordToInsert = undefined;
            getMergedParameters(req)
                .then((mergedParams)=> {
                    var username = mergedParams.username;
                    var password = mergedParams.password;
                    recordToInsert = {
                        username: username,
                        password: password
                    }
                    if (!username || !password) {
                        throw new Error('Username and password are mandatory for Signup');
                    }

                    return checkUserExistence(db, username)
                }).then(()=> {
                    return insert(db, usersTable, recordToInsert, {res: res})
                }).then(()=> {
                    return sendResponse(res, {message: 'Signup Successfully'});
                }).catch((e)=> {
                    console.log('Signup Error :- ' + e.stack)
                    sendError(res, e.message)
                })

        });

        app.all('/logout', function (req, res) {
            getMergedParameters(req).
                then((mergedParams)=> {
                    console.log('Welcome to logout mergedParams ' + JSON.stringify(mergedParams));
                    var token = mergedParams.token;
                    var query = {_id: ObjectID(token)};
                    var options = {justOne: true};
                    return remove(db, tokenTable, query, options, {res: res})
                }).then(()=> {
                    sendResponse(res, {message: 'Successfully logged out'})
                }).catch((e)=> {
                    console.log('Error in logout ..' + e.stack);
                    sendError(res, e.message)
                })
        });


        app.all('/query', function (req, res) {
            var dataset = undefined;
            getMergedParameters(req).
                then((mergedParams)=> {
                    console.log('in /query call. >> .....mergedParams -- !' + JSON.stringify(mergedParams));
                    dataset = mergedParams.dataset;
                    // console.log('in /query call. >> .....dataset -- !' , dataset);

                    var token = mergedParams.token;
                    var args = mergedParams.args;
                    dataset = dataset && JSON.parse(dataset);
                    if (token && dataset && dataset.type) {
                        /*this parsing is error prone*/
                        // console.log('dataset' + JSON.stringify(dataset));
                        // {dataset,token,args:{limit:5}}
                        var query = {/*from  args.filter */};
                        var limit = {}
                        /*parse the aguments  */
                        return validateToken(db, token)
                    } else {
                        throw new Error('Token and dataset and dataset type are mandatory for Query');
                    }
                }).then(()=> {
                    console.log('token validation Success');
                    return find(db, dataset.type, {});
                }).then((docs)=> {
                    return sendResponse(res, {data: docs});
                }).catch((e)=> {
                    console.log('Error in query call ..' + e.stack);
                    sendError(res, e.message)
                })
        });

        app.listen(serverPort, function () {
            console.log(serverPort + ' port is ready to be listen')
        });
    }
});

/*network call related functions */
// returning promise since we want all our code to be written in then and catch to catch all the errors 
// in catch phrase .. so if one function is returning promise then other need not to return promise for 
// then and catch 
const getMergedParameters = (req)=> {
    var query = req.query;
    var params = req.params;
    var body = req.body;
    var mergedParams = {};
    for (var key in params) {
        mergedParams[key] = params[key];
    }
    for (var key in body) {
        if (mergedParams[key] === undefined) {
            mergedParams[key] = body[key];
        }
    }
    for (var key in query) {
        if (mergedParams[key] === undefined) {
            mergedParams[key] = query[key];
        }
    }
    return new Promise((resolve)=> {
        resolve(mergedParams)
    });
}

var checkUserExistence = (db, username)=> {
    return new Promise((resolve, reject)=> {

        find(db, usersTable, {username}).then((docs)=> {
            if (docs.length > 0) {
                reject(new Error('Username already taken'));
            } else {
                resolve({res: 'Username Available'});
            }
        });
    })
};
var validateToken = function (db, token) {
    return new Promise((resolve, reject)=> {
        find(db, tokenTable, {_id: ObjectID(token)}).then((docs)=> {
            if (docs.length === 1) {
                resolve({res: 'Token Validated'});
            } else {
                reject(new Error('Invalid Token'));
            }
        })
    })
};

var find = function (db, collectionName, query, options) {
    options = options || {};
    return new Promise((resolve, reject)=> {

        db.collection(collectionName).find(query).toArray(function (err, docs) {
            //console.log('find is executing .. Collection :- '+collectionName+'  and query :- '+JSON.stringify(query,null,' '));
            if (err) {
                reject(err);
            } else {
                resolve(docs);
            }

        });
    })
}


var insert = function (db, collectionName, recordToInsert, options) {
    return new Promise((resolve, reject)=> {
        db.collection(collectionName).insert(recordToInsert, function (err, result) {
            if (err) {
                reject(err)
            } else {
                resolve(result)
            }
        })
    })
}

var update = function (db, collectionName, query, updates, options, callback) {
    db.collection(collectionName).update(query, updates, options, callback)
    // > db.a.update({_id:2},{$set:{name:'b'}})
    // > db.a.update({_id:2},{$unset:{name:'b'}})

}

var remove = function (db, collectionName, query, removeOptions, options) {
    return new Promise((resolve, reject)=> {
        db.collection(collectionName).remove(query, removeOptions, function (err, result) {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        })
    })
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


//login ko get call se check karo
//  /invoke/* se start wala part kese lete h