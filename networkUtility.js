/* functions dealing with response .. */
const sendError = (res, errorMessage)=> {
    //console.log('Error message in sendError ' + errorMessage);
    if (res) {
        var errorObj = typeof errorMessage == 'string' ? {message: errorMessage} : errorMessage;
        console.log('errorObj' + errorObj);
        res.write(JSON.stringify({error: errorObj}));
        res.status(401);
        res.end();
    }
};
const sendResponse = (res, responseToSend)=> {
    if (res) {

        responseToSend = typeof responseToSend == 'string' ? responseToSend : JSON.stringify(responseToSend);
        res.write(responseToSend);
        res.end();
    }
};

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

module.exports ={
    sendError,
    sendResponse,
    getMergedParameters
};