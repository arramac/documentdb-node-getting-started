﻿"use strict";

var documentClient = require("documentdb").DocumentClient;
var config = require("./config");
var url = require('url');

var client = new documentClient(config.endpoint, { "masterKey": config.authKey });

var HttpStatusCodes = { NOTFOUND: 404 };
var databaseUrl = `dbs/${config.database.id}`;
var collectionUrl = `${databaseUrl}/colls/${config.collection.id}`;

/**
 * Get the database by ID, or create if it doesn't exist.
 * @param {string} database - The database to get or create
 */
function getDatabase() {
    console.log(`Getting database:\n${config.database.id}\n`);

    return new Promise((resolve, reject) => {
        client.readDatabase(databaseUrl, (err, result) => {
            if (err) {
                if (err.code == HttpStatusCodes.NOTFOUND) {
                    client.createDatabase(config.database, (err, created) => {
                        if (err) reject(err)
                        else resolve(created);
                    });
                } else {
                    reject(err);
                }
            } else {
                resolve(result);
            }
        });
    });
}

/**
 * Get the collection by ID, or create if it doesn't exist.
 */
function getCollection() {
    console.log(`Getting collection:\n${config.collection.id}\n`);

    return new Promise((resolve, reject) => {
        client.readCollection(collectionUrl, (err, result) => {
            if (err) {
                if (err.code == HttpStatusCodes.NOTFOUND) {
                    client.createCollection(databaseUrl, config.collection, { offerThroughput: 400 }, (err, created) => {
                        if (err) reject(err)
                        else resolve(created);
                    });
                } else {
                    reject(err);
                }
            } else {
                resolve(result);
            }
        });
    });
}

/**
 * Get the document by ID, or create if it doesn't exist.
 * @param {function} callback - The callback function on completion
 */
function getFamilyDocument(document) {
    let documentUrl = `${collectionUrl}/docs/${document.id}`;
    console.log(`Getting document:\n${document.id}\n`);

    return new Promise((resolve, reject) => {
        client.readDocument(documentUrl, { partitionKey: document.district }, (err, result) => {
            if (err) {
                if (err.code == HttpStatusCodes.NOTFOUND) {
                    client.createDocument(collectionUrl, document, (err, created) => {
                        if (err) reject(err)
                        else resolve(created);
                    });
                } else {
                    reject(err);
                }
            } else {
                resolve(result);
            }
        });
    });
};

/**
 * Query the collection using SQL
 */
function queryCollection() {
    console.log(`Querying collection through index:\n${config.collection.id}`);

    return new Promise((resolve, reject) => {
        client.queryDocuments(
            collectionUrl,
            'SELECT VALUE r.address.city FROM root r WHERE r.lastName = "Andersen"',
            { enableCrossPartitionQuery: true }
        ).toArray((err, results) => {
            if (err) reject(err)
            else {
                for (var queryResult of results) {
                    console.log(`\tQuery returned ${queryResult}`);
                }
                console.log();
                resolve(results);
            }
        });
    });
};


/**
 * Cleanup the database and collection on completion
 */
function cleanup() {
    console.log(`Cleaning up by deleting database ${config.database.id}`);

    return new Promise((resolve, reject) => {
        client.deleteDatabase(databaseUrl, (err) => {
            if (err) reject(err)
            else resolve(null);
        });
    });
}

/**
 * Exit the app with a prompt
 * @param {message} message - The message to display
 */
function exit(message) {
    console.log(message);
    console.log('Press any key to exit');
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.on('data', process.exit.bind(process, 0));
}

getDatabase()
    .then(() => getCollection())
    .then(() => getFamilyDocument(config.documents.Andersen))
    .then(() => getFamilyDocument(config.documents.Wakefield))
    .then(() => queryCollection())
    .then(() => cleanup())
    .then(() => { exit(`Completed successfully`); })
    .catch((error) => { exit(`Completed with error ${JSON.stringify(error)}`) });

