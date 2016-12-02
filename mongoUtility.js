var MongoClient = require('mongodb');
var ObjectID = MongoClient.ObjectID;
var GridStore = require('mongodb').GridStore;
var uuid = require('uuid');

var downloadFile = (fileKey, db) => {
    if (!fileKey) {
        throw new Error("fileKey not found ");
    }
    return new Promise((resolve, reject)=> {
        var gridStore = new GridStore(db, fileKey, fileKey, "r");
        gridStore.open(function (err) {
            if (err) {
                reject(err);
                return;
            }
            gridStore.seek(0, 0, function (err) {
                if (err) {
                    reject(err);
                    return;
                }
                gridStore.read(function (err, data) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve({fileName: gridStore.filename, contentType: gridStore.contentType, data: data});
                });
            });
        });


    })
}

var getUniqueId = ()=> {
    var id = uuid.v4();
    return id;
};


var uploadFiles = (files, db) => {
    var fileKeys = [];
    //files = JSON.parse(files);
    return iterator(files, (index, file) => {
        file.fileKey = getUniqueId();
        return uploadFileInMongo(file.filename, file.fileKey, file.data, file.type, db).then(_ => {
            fileKeys.push({key: file.fileKey, name: file.filename});
        });
    }).then(_=>fileKeys);
}

var uploadFileInMongo = (fileName, fileKey, dataArray, content_type, db) => {
    return new Promise((resolve, reject)=> {
        var gridStore = new GridStore(db, fileKey, fileName, "w", {content_type,chunk_size: 1024*4});
        gridStore.open(function (err) {
            if (err) {
                console.log("errro in write>>>", err);

                reject(err);
                return;
            }
            return iterator(dataArray, (index, buffer) => {
                return new Promise((res, rej)=> {
                    gridStore.write(buffer, function (err, result) {
                        if (err) {
                            rej(err);
                        } else {
                            res(result);
                        }
                    });
                });
            }).then(_=> {
                console.log("closing");
                gridStore.close(function (err) {
                    if (err) {
                        console.log("err in closing");
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            }).catch((err)=> {
                reject(err);
            })
        });
    })
}


const mongoFind = (db, collectionName, query, projection, limit, sort, skip)=> {
    return new Promise((resolve, reject)=> {
        limit = limit || 0;
        skip = skip || 0;
        db.collection(collectionName).find(getParsedQuery(query)).project(projection).sort(sort).limit(limit).skip(skip).toArray(function (err, docs) {
            if (err) {
                reject(err);
            } else {
                resolve(docs);
            }

        });
    })
};
/*
 * mongoUpdate(db,'temp',{name:'name5'},{name:1},{$set:{name:'nameNew55'}},{new:true}).then((res)=>{
 console.log('response of find and modify ... ', res);
 })
 * */
var mongoUpdate = function (db, collectionName, query, updates, sort, options) {
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
    options = options || {};
    if (!('new' in options)) {
        options.new = true;
    }
    //console.log('Find and modify   query, updates', query, updates);
    return new Promise((resolve, reject)=> {
        db.collection(collectionName).findAndModify(getParsedQuery(query), sort, updates, options, function (err, result) {
            if (err) {
                reject(err);
            } else {
                //console.log('Find and modify result .. ',result);
                /*{
                 lastErrorObject: { updatedExisting: true, n: 1 },
                 value: { _id: 5827153738f834fc22d0bfe6, name: 'Jhullu2' },
                 ok: 1
                 }*/
                resolve(result.value);
            }
        })
    })
};
var mongoRemove = function (db, collectionName, query, removeOptions) {
    return new Promise((resolve, reject)=> {
        db.collection(collectionName).remove(query, removeOptions, function (err, result) {
            if (err) {
                reject(err);
            } else {
                resolve(result);
            }
        })
    })
};
var mongoInsert = function (db, collectionName, recordToInsert) {
    return new Promise((resolve, reject)=> {
        db.collection(collectionName).insert(recordToInsert, function (err, result) {
            if (err) {
                reject(err)
            } else {
                var insertedRecords = result.ops;
                console.log('insert result.. ', insertedRecords);
                /*>>>>>>>>>.Insert result
                 {
                 result: { ok: 1, n: 1 },
                 ops: [ { username: 'qss', password: 'q', _id: 58270ffb84cf23aa1f2011fc } ],
                 insertedCount: 1,
                 insertedIds: [ 58270ffb84cf23aa1f2011fc ]
                 }*/
                resolve(insertedRecords);
            }
        })
    })
};
var getParsedQuery = (query)=> {
    var parsedQuery = query || {};
    if ('_id' in parsedQuery) {
        parsedQuery._id = ObjectID(parsedQuery._id);
    }
    return parsedQuery;
};
var getObjectId = (id)=> {
    return ObjectID(id);
};
var getMongoConnection = (mongoUrl, dbName, callBack)=> {
    MongoClient.connect('mongodb://' + mongoUrl + '/' + dbName, callBack)
};

const iterator = (array, task) => {
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
    getMongoConnection,
    getParsedQuery,
    getObjectId,
    mongoFind,
    mongoUpdate,
    mongoRemove,
    mongoInsert,
    uploadFiles,
    downloadFile
};