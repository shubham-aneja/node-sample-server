import {usersTable ,tokenTable} from './config.js';
import {mongoFind ,getObjectId} from './mongoUtility';

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

var iterator = (array, task) => {
    return new Promise((resolve, reject)=> {
        var length = array ? array.length : 0;
        if (length == 0) {
            resolve();
            return;
        }
        var index = 0;
        var loop = (index)=> {
            try {
                var onResolve = function () {
                    index = index + 1;
                    if (index == array.length) {
                        resolve();
                    } else {
                        loop(index);
                    }
                }
                try {
                    var p = task(index, array[index]);
                    if (!p) {
                        onResolve();
                        return;
                    }
                    p.then(onResolve)
                        .catch(function (err) {
                            reject(err)
                        })
                } catch (e) {
                    reject(e)
                }
            } catch (e) {
                reject(e)
            }
        }
        loop(index);
    })
}
module.exports = {
    validateToken,
    checkUserExistence,
    getParsedObject,
    iterator
};