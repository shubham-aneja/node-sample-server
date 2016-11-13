var MongoClient = require('mongodb');
var ObjectID = MongoClient.ObjectID;

const mongoFind = (db, collectionName, query, projection, limit,sort)=> {
    return new Promise((resolve, reject)=> {
        limit = limit || 0;
        db.collection(collectionName).find(getParsedQuery(query)).project(projection).sort(sort).limit(limit).toArray(function (err, docs) {
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

module.exports = {
    getMongoConnection,
    getParsedQuery,
    getObjectId,
    mongoFind,
    mongoUpdate,
    mongoRemove,
    mongoInsert
};