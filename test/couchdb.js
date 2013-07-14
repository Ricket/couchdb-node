"use strict";

var couchdb = require("../src/couchdb")(),
        _ = require("lodash");

exports.testRoot = function (test) {
    couchdb.root().then(function (root) {
        test.ok(root);
        test.equal(root.couchdb, "Welcome");
        test.ok(root.version);
        test.done();
    }, function (error) {
        test.ifError(error);
        test.done();
    });
};

exports.testDbDoesNotExist = function (test) {
    couchdb.dbExists("asdfasdfasdfasdfasdf").then(function (exists) {
        test.equal(exists, false);
        test.done();
    });
};

exports.testDbExists = function (test) {
    couchdb.dbExists("_users").then(function (exists) {
        test.equal(exists, true);
        test.done();
    });
};

exports.testCreateDbNoName = function (test) {
    test.throws(function () {
        couchdb.createDb();
    }, "Must specify name");
    test.done();
};

exports.testCreateDb = function (test) {
    couchdb.createDb("test").then(function () {
        test.done();
    }, function (error) {
        test.ifError(error);
        test.done();
    });
};

exports.testGetUUIDs = function (test) {
    couchdb.getUUIDs(5).then(function (uuids) {
        test.ok(uuids);
        test.equal(uuids.length, 5);
        test.equal(uuids[0].length, 32);
        test.equal(uuids[1].length, 32);
        test.equal(_.unique(uuids).length, 5);
        test.done();
    });
};

exports.testGetLotsOfUUIDs = function (test) {
    couchdb.getUUIDs(500).then(function (uuids) {
        test.ok(uuids);
        test.equal(uuids.length, 500);
        test.equal(uuids[0].length, 32);
        test.equal(uuids[20].length, 32);
        test.equal(_.unique(uuids).length, 500);
        test.done();
    });
};

exports.testGetUUID = function (test) {
    couchdb.getUUID().then(function (uuid) {
        test.ok(uuid);
        test.equal(uuid.length, 32);
        test.done();
    });
};

var fooId, fooRev;

exports.testCreateDoc = function (test) {
    couchdb.createDoc("test", { "foo": "bar" }).then(function (response) {
        test.equal(response.id.length, 32);
        test.ok(response.rev);
        test.equal(typeof response.rev, "string");

        fooId = response.id;
        fooRev = response.rev;

        test.done();
    }, function (error) {
        test.ifError(error);
        test.done();
    });
};

exports.testGetDoc = function (test) {
    couchdb.getDoc("test", fooId).then(function (response) {
        test.equal(response._id, fooId);
        test.equal(response._rev, fooRev);
        test.equal(response.foo, "bar");
        test.done();
    }, function (error) {
        test.ifError(error);
        test.done();
    });
};

exports.testDeleteDoc = function (test) {
    couchdb.deleteDoc("test", fooId, fooRev).then(function (deletionRev) {
        test.ok(deletionRev);
        test.equal(typeof deletionRev, "string");
        test.done();
    }, function (error) {
        test.ifError(error);
        test.done();
    });
};

exports.testDeleteNonexistentDoc = function (test) {
    couchdb.deleteDoc("test", fooId, fooRev).fail(function () {
        test.done();
    });
};

exports.testDeleteDb = function (test) {
    couchdb.deleteDb("test").then(function (data) {
        test.ok(data.ok);
        test.done();
    });
};
