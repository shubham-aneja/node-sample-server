var config =  require('./config.js');
var usersTable = config.usersTable;
var tokenTable = config.tokenTable;
var MongoClient = require('mongodb');
var ObjectID = MongoClient.ObjectID;
var mongoUtility = require('./mongoUtility')
var mongoFind = mongoUtility.mongoFind;

const checkUserExistence = (db, username)=> {
    return new Promise((resolve, reject)=> {

        mongoFind(db, usersTable, {username}).then((docs)=> {
            if (docs.length > 0) {
                reject(new Error('Username already taken'));
            } else {
                resolve({res: 'Username Available'});
            }
        });
    })
};
const validateToken = (db, token)=> {
    return new Promise((resolve, reject)=> {
        mongoFind(db, tokenTable, {_id: ObjectID(token)}).then((docs)=> {
            if (docs.length === 1) {
                resolve({res: 'Token Validated'});
            } else {
                reject(new Error('Invalid Token'));
            }
        })
    })
};
module.exports={
    validateToken,
    checkUserExistence
};