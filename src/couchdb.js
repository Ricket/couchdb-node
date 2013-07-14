"use strict";

var _ = require("lodash"),
    q = require("q"),
    http = require("http"),
    nodeUrl = require("url"),
    util = require("util"),
    assert = require("assert"),
    DEFAULT_URL = "http://localhost:5984/";

function normalizeUrl(url) {
    return nodeUrl.resolve(url, "/");
}

function CouchDB(url) {
    this.url = url;
}

module.exports = function (url) {
    if (url) {
        return new CouchDB(normalizeUrl(url));
    } else {
        return new CouchDB(DEFAULT_URL);
    }
};

function makeHttpHandler(deferred) {
    var data = "";
    return function (res) {
        res.setEncoding("utf8");
        res.on("data", function (chunk) {
            data += chunk;
        });
        res.on("end", function () {
            deferred.resolve({ data: data, statusCode: res.statusCode });
        });
    };
}

function makeHttpErrorHandler(deferred) {
    return function (error) {
        deferred.reject(error);
    };
}

function makeHttpPromise(options, data) {
    assert.ok(data == null || typeof data === "string");

    var deferred = q.defer();

    var request = http.request(options, makeHttpHandler(deferred))
        .on("error", makeHttpErrorHandler(deferred));

    if (data != null) {
        request.write(data);
    }

    request.end();

    return deferred.promise;
}

CouchDB.prototype.root = function () {
    var options = nodeUrl.parse(this.url);
    options.method = "GET";

    return makeHttpPromise(options).then(function (response) {
        return JSON.parse(response.data);
    });
};

CouchDB.prototype.createDb = function (name) {
    if (name == null) {
        throw new Error("Must specify name");
    }

    var options = nodeUrl.parse(this.url);
    options.method = "PUT";
    options.path = "/" + name + "/";

    return makeHttpPromise(options).then(function (response) {
        if (response.statusCode === 201) {
            // success
            return JSON.parse(response.data);
        } else {
            throw new Error(response.statusCode + ": " + response.data);
        }
    });
};

CouchDB.prototype.deleteDb = function (name) {
    if (name == null) {
        throw new Error("Must specify name");
    }

    var options = nodeUrl.parse(this.url);
    options.method = "DELETE";
    options.path = "/" + name + "/";

    return makeHttpPromise(options).then(function (response) {
        if (response.statusCode === 200) {
            // success
            return JSON.parse(response.data);
        } else {
            throw new Error(response.statusCode + ": " + response.data);
        }
    });
};

CouchDB.prototype.dbExists = function (name) {
    if (name == null) {
        throw new Error("Must specify name");
    }

    var options = nodeUrl.parse(this.url);
    options.method = "GET";
    options.path = "/" + name + "/";

    return makeHttpPromise(options).then(function (response) {
        return response.statusCode !== 404;
    });
};

var uuids = [];

function ensureUUIDs(url, numUUIDs) {
    if (typeof numUUIDs !== "number") {
        throw new Error("ensureUUIDs: non-numeric numUUIDs");
    }
    numUUIDs = Math.floor(numUUIDs);
    if (numUUIDs <= 0) {
        throw new Error("ensureUUIDs: negative numUUIDs");
    }

    if (uuids.length >= numUUIDs) {
        return q.fulfill();
    } else {
        var additionalUUIDs = numUUIDs - uuids.length + 100;

        var options = nodeUrl.parse(url);
        options.method = "GET";
        options.path = "/_uuids?count=" + additionalUUIDs;

        return makeHttpPromise(options).then(function (response) {
            if (response.statusCode === 200) {
                uuids = _.union(uuids, JSON.parse(response.data).uuids);
            } else {
                throw new Error("Could not generate UUIDs: " + response);
            }
        });
    }
}

CouchDB.prototype.getUUIDs = function (num) {
    return ensureUUIDs(this.url, num).then(function () {
        return uuids.splice(0, num);
    });
};

CouchDB.prototype.getUUID = function () {
    return this.getUUIDs(1).then(function (uuids) {
        return uuids[0];
    });
};

CouchDB.prototype.createDoc = function (db, doc) {
    if (db == null) {
        throw new Error("Must specify name of database");
    } else if (doc == null) {
        throw new Error("Must specify document to create");
    }

    return this.getUUID().then(_.bind(function (uuid) {
        var options = nodeUrl.parse(this.url);
        options.method = "PUT";
        options.path = "/" + db + "/" + uuid;
        return makeHttpPromise(options, JSON.stringify(doc)).then(function (response) {
            if (response.statusCode === 201) {
                return JSON.parse(response.data);
            } else {
                throw new Error("Could not create doc: " + util.inspect(response));
            }
        });
    }, this));
};

CouchDB.prototype.deleteDoc = function (db, docId, docRev) {
    if (db == null) {
        throw new Error("Must specify name of database");
    } else if (docId == null) {
        throw new Error("Must specify document id");
    } else if (docRev == null) {
        throw new Error("Must specify document revision");
    }

    var options = nodeUrl.parse(this.url);
    options.method = "DELETE";
    options.path = "/" + db + "/" + docId + "?rev=" + docRev;
    return makeHttpPromise(options).then(function (response) {
        if (response.statusCode === 200) {
            return JSON.parse(response.data).rev;
        } else {
            throw new Error("Could not delete doc: " + util.inspect(response));
        }
    });
};

CouchDB.prototype.getDoc = function (db, docId, rev) {
    if (db == null) {
        throw new Error("Must specify name of database");
    } else if (docId == null) {
        throw new Error("Must specify document id");
    }

    var options = nodeUrl.parse(this.url);
    options.method = "GET";
    options.path = "/" + db + "/" + docId;
    if (rev != null) {
        options.path += "?rev=" + rev;
    }
    return makeHttpPromise(options).then(function (response) {
        if (response.statusCode === 200) {
            return JSON.parse(response.data);
        } else {
            throw new Error("Could not get doc: " + util.inspect(response));
        }
    });
};
