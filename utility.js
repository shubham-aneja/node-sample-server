var config =  require('./config.js');
var usersTable = config.usersTable;
var tokenTable = config.tokenTable;
var mongoUtility = require('./mongoUtility')
var mongoFind = mongoUtility.mongoFind;
var getObjectId = mongoUtility.getObjectId;
const getParsedObject = (obj)=> {
    return typeof obj == 'string' ? JSON.parse(obj) : obj;
};


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
        mongoFind(db, tokenTable, {_id: getObjectId(token)}).then((docs)=> {
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
    checkUserExistence,
    getParsedObject
};