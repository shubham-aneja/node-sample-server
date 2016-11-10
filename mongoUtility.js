const mongoFind = (db, collectionName, query)=> {
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
};


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
};
var mongoRemove = function (db, collectionName, query, removeOptions ) {
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
                resolve(result)
            }
        })
    })
};
var mongoUpdate = function (db, collectionName, query, updates, options, callback) {
    db.collection(collectionName).update(query, updates, options, callback);
    // > db.a.update({_id:2},{$set:{name:'b'}})
    // > db.a.update({_id:2},{$unset:{name:'b'}})

};

module.exports = {
    mongoFind,
    findAndModify,
    mongoRemove,
    mongoInsert,
    mongoUpdate
};