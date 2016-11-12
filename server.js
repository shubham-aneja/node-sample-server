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
var mongoUtility = require('./mongoUtility')
var mongoFind = mongoUtility.mongoFind;
var mongoRemove = mongoUtility.mongoRemove;
var mongoInsert = mongoUtility.mongoInsert;
var networkUtility = require('./networkUtility');
const getMergedParameters = networkUtility.getMergedParameters;
const sendResponse = networkUtility.sendResponse;
const sendError = networkUtility.sendError;
var utility = require('./utility');
const validateToken = utility.validateToken;
const checkUserExistence = utility.checkUserExistence;
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
                    return mongoFind(db, usersTable, {username: mergedParams.username, password: mergedParams.password})
                }).then((docs)=> {
                    if (docs.length === 0) {
                        console.log('login -- no user found .....!');
                        throw new Error('Username password did not match');
                    } else {
                        user = docs[0];
                        return mongoInsert(db, tokenTable, {user: docs[0]}, {res: res})
                    }
                }).then((result)=> {
                    var responseToReturn = {
                        user: user
                    }
                    responseToReturn.user.token = result.insertedIds[0];
                    sendResponse(res, {data: responseToReturn});
                }).catch((e)=> {
                    console.log('Login Error :- ' + e)
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
                    return mongoInsert(db, usersTable, recordToInsert, {res: res})
                }).then(()=> {
                    return sendResponse(res, {message: 'Signup Successfully'});
                }).catch((e)=> {
                    console.log('Signup Error :- ' + e)
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
                    return mongoRemove(db, tokenTable, query, options, {res: res})
                }).then(()=> {
                    sendResponse(res, {message: 'Successfully logged out'})
                }).catch((e)=> {
                    console.log('Error in logout ..' + e);
                    sendError(res, e.message)
                })
        });


        app.all('/query', function (req, res) {
            var dataset = undefined;
            var args = undefined;
            getMergedParameters(req).
                then((mergedParams)=> {
                    dataset = mergedParams.dataset;
                    var token = mergedParams.token;
                    args = mergedParams.args;
                    dataset = dataset && JSON.parse(dataset);
                    args = args === undefined ? {} : JSON.parse(args);
                    if (token && dataset && dataset.type) {
                        // {dataset,token,args:{limit:5}}
                        var query = {/*from  args.filter */};
                        var limit = {}
                        /*parse the aguments  */
                        return validateToken(db, token)
                    } else {
                        throw new Error('Token and dataset and dataset type are mandatory for Query');
                    }
                }).then(()=> {
                    var query = args.filter;
                    var projection = args.fields;
                    var limit = args.limit;
                    /*{"filter":{"name":"Laptop"},"fields":{"name":1},"limit":1}*/
                    return mongoFind(db, dataset.type, query, projection, limit);
                }).then((docs)=> {
                    return sendResponse(res, {data: docs});
                }).catch((e)=> {
                    console.log('Error in query call ..' + e);
                    sendError(res, e.message)
                })
        });

        app.listen(serverPort, function () {
            console.log(serverPort + ' port is ready to be listen')
        });
    }
});


// query me aai _id ko kese parse kare
//mongo cliecnt connect .. into seprate function 
// merged params promise na de to acha h 

// update ka function jo return me new object return kare 
//  /invoke/* se start wala part kese lete h
// config ki file banao
// when to connect to db
// insert wala b insertedObj return kare
