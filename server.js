import {serverPort ,mongoUrl ,dbName ,usersTable ,tokenTable, accountsTable, transactionsTable } from './config.js';
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({extended: true})); // support encoded bodies

import {mongoFind ,uploadFiles ,downloadFile ,mongoRemove ,mongoInsert,getObjectId,getMongoConnection,mongoUpdate} from './mongoUtility';

import {sendError,sendResponse ,getMergedParameters} from './networkUtility';

import {validateToken ,checkUserExistence ,getParsedObject}from './utility';

var MongoClient = require('mongodb');
var ObjectID = MongoClient.ObjectID;

getMongoConnection(mongoUrl, dbName, function (err, db) {
  if (err) {
    console.log('connection to mongo failed ');
  } else {
    console.log(' Successfully connected to mongo ');

    app.use(express.static('./shubham/images'));

    /*todo do something before actual code of a url executes*/
    app.use('*', (req, res, next)=> {
      res.setHeader("Access-Control-Allow-Origin", "*");
      next();
    });


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
          };
          responseToReturn.user.token = result[0]._id;
          sendResponse(res, {data: responseToReturn});
        }).catch((e)=> {
          console.log('Login Error :- ' + e);
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
          };
          if (!username || !password) {
            throw new Error('Username and password are mandatory for Signup');
          }

          return checkUserExistence(db, username)
        }).then(()=> {
          return mongoInsert(db, usersTable, recordToInsert, {res: res})
        }).then(()=> {
          return sendResponse(res, {message: 'Signup Successfully'});
        }).catch((e)=> {
          console.log('Signup Error :- ' + e);
          sendError(res, e.message)
        })

    });

    app.all('/addAccount', function (req, res) {
      var data = undefined;
      getMergedParameters(req)
        .then((mergedParams)=> {
          console.log('Welcome to insert Merged params are :- ' + JSON.stringify(mergedParams));
          data = mergedParams.data;
          var token = mergedParams.token;
          data = getParsedObject(data);
          /*data can be array and Object*/
          if (!token || !data) {
            throw new Error('token and data are mandatory for insert');
          }
          return validateToken(db, token);
        }).then(()=> {
          return mongoInsert(db, accountsTable, data);
        }).then((insertedRecords)=> {
          return sendResponse(res, {data: insertedRecords});
        }).catch((e)=> {
          console.log('Insert Account Error :- ' + e);
          sendError(res, e.message)
        })
    });

    app.all('/getAllAccounts', function (req, res) {
      getMergedParameters(req).
        then((mergedParams)=> {
          var token = mergedParams.token;
          if (token) {
            return validateToken(db, token)
          } else {
            throw new Error('Token is mandatory for Query');
          }
        }).then(()=> {
          return mongoFind(db, accountsTable, {});
        }).then((docs)=> {
          return sendResponse(res, {data: docs});
        }).catch((e)=> {
          console.log('Error in fething accounts' + e);
          sendError(res, e.message)
        })
    });

    app.all('/addTransaction', function (req, res) {
      var data = undefined;
      let accountId = undefined;
      let currentAccountDetails = undefined;
      let date = undefined;
      getMergedParameters(req)
        .then((mergedParams)=> {
          data = mergedParams.data;
          var token = mergedParams.token;
          data = getParsedObject(data);
          /*data can be array and Object*/
          if (!token || !data) {
            throw new Error('token and data are mandatory for insert');
          }
          return validateToken(db, token);
        }).then(()=> {
          accountId = data.account;
          date = data.date;
          if (!accountId) {
            throw new Error('Account id is mandatory to add a transaction')
          }
          if (!date) {
            throw new Error('date is mandatory to add a transaction')
          }
          return mongoFind(db, accountsTable, {_id: accountId});
        }).then((accountDetails) => {
          /*throw error if no account found*/
          currentAccountDetails = accountDetails[0];
          if (!currentAccountDetails) {
            throw new Error('No account found with provided account id')
          }
          const update = {$set: {available_balance: currentAccountDetails.available_balance - data.amount}};
          /*delete the amount from the account*/
          return mongoUpdate(db, accountsTable, {_id: accountId}, update);
        }).then(()=> {
          /*add a new transaction with prev_bal   == currentAccountDetails.available_balance*/
          let recordToUpdate = {...data};
          recordToUpdate.account_info = {
            _id: currentAccountDetails._id,
            label: currentAccountDetails.label,
            available_balance: currentAccountDetails.available_balance - data.amount,
            previous_balance: currentAccountDetails.available_balance
          }
          recordToUpdate.date = new Date(date);
          return mongoInsert(db, transactionsTable, recordToUpdate);
        }).then((insertedRecords)=> {
          return sendResponse(res, {data: insertedRecords});
        }).catch((e)=> {
          sendError(res, e.message)
        })
    });

    /*todo under construction*/
    app.all('/getAllTransactions', function (req, res) {
      var fromDate = undefined;
      var toDate = undefined;
      var fromAccount = undefined;

      getMergedParameters(req).
        then((mergedParams)=> {
          var token = mergedParams.token;
          fromDate = mergedParams.from_date;
          toDate = mergedParams.to_date;
          fromAccount = mergedParams.from_account;

          if (token) {
            return validateToken(db, token)
          } else {
            throw new Error('Token is mandatory to fetch transactions');
          }
        }).then(()=> {
          var query = {};
          if (fromAccount) {
            query["account_info._id"] = ObjectID(fromAccount);
          }

          if (fromDate || toDate) {
            query["date"] = {};
            if (fromDate) {
              query.date.$gte = new Date(fromDate)
            }
            if (toDate) {
              query.date.$lte = new Date(toDate)
            }
          }

          /*{"filter":{"name":"Laptop"},"fields":{"name":1},"limit":1}*/
          return mongoFind(db, transactionsTable, query);
        }).then((docs)=> {
          return sendResponse(res, {data: docs});
        }).catch((e)=> {
          console.log('Error in fetching transactions ..' + e);
          sendError(res, e.message)
        })
    });

    app.all('/logout', function (req, res) {
      getMergedParameters(req).
        then((mergedParams)=> {
          console.log('Welcome to logout mergedParams ' + JSON.stringify(mergedParams));
          var token = mergedParams.token;
          var query = {_id: getObjectId(token)};
          var options = {justOne: true};
          return mongoRemove(db, tokenTable, query, options, {res: res})
        }).then(()=> {
          sendResponse(res, {message: 'Successfully logged out'})
        }).catch((e)=> {
          console.log('Error in logout ..' + e);
          sendError(res, e.message)
        })
    });

    app.all('/update', (req, res) => {
      //collectionName, query, sort, updates, options
      var dataset = undefined;
      var query = undefined;
      var updates = undefined;
      var sort = undefined;
      var options = undefined;
      getMergedParameters(req)
        .then((mergedParams)=> {
          dataset = mergedParams.dataset;
          query = mergedParams.query;
          updates = mergedParams.updates;
          sort = mergedParams.sort;
          options = mergedParams.options;
          var token = mergedParams.token;
          dataset = getParsedObject(dataset);
          query = getParsedObject(query);
          updates = getParsedObject(updates);
          sort = getParsedObject(sort);
          options = getParsedObject(options);
          if (!token || !dataset || !dataset.type || !query || !updates) {
            throw new Error('token , query , updates ,dataset and dataset type are mandatory for update');
          }
          return validateToken(db, token);
        }).then(()=> {
          return mongoUpdate(db, dataset.type, query, updates, sort, options);
        }).then((updatedRecords)=> {
          return sendResponse(res, {data: updatedRecords});
        }).catch((e)=> {
          console.log('Insert Error :- ' + e);
          sendError(res, e.message)
        })
    });

    app.all('*', (req, res)=> {
      sendResponse(res, '404 Page not found');
    });

    app.listen(process.env.PORT || serverPort, function () {
      console.log((process.env.PORT || serverPort) + ' port is ready to be listen')
    });
  }
});
