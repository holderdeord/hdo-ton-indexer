#!/usr/bin/env node

const csv = require('csv');
const path = require('path');
const Promise = require('bluebird');
const fs = require('fs');

const es = require('elasticsearch');
const ess = require('elasticsearch-streams');
const AgentKeepAlive = require('agentkeepalive');
const transform = require('stream-transform');
const yargs = require('yargs');

const indexConfig = require('./indexConfig.js');

const argv = yargs
    .option('recreate', {
        alias: 'r',
        describe: 'Recreate the index w/mappings',
        type: 'boolean'
    })
    .option('elasticsearch-url', {
        alias: 'e',
        describe: 'Use this elasticsearch instance'
    })
    .argv;

const client = new es.Client({
    host: argv.elasticsearchUrl || 'localhost:9200',
    debug: 'info',
    createNodeAgent: (connection, config) => new AgentKeepAlive(connection.makeAgentConfig(config))
});

const indexName = 'talk-of-norway';
const indexType = 'transcript';

setupIndex(argv)
    .then(indexData)
    .catch(err => console.log(err.stack))


function indexData() {
    let count = 0;

    const ws = new ess.WritableBulk((cmds, callback) => {
        console.log(`indexed ${count} documents`);
        count += (cmds.length / 2);

        client.bulk({
            index: indexName,
            type: indexType,
            body: cmds
        }, callback);
    });

    const toBulk = new ess.TransformToBulk(doc => ({
        _id: doc.id
    }));

    const parser = csv.parse({
        columns: true,
        delimiter: ','
    });

    const transformer = transform((row) => {
        const res = {};

        Object.keys(row).forEach(key => {
            const value = row[key];

            if (value.trim() === "NA") {
                res[key] = null;
            } else {
                res[key] = value.trim();
            }
        })

        return res;
    });

    return new Promise((resolve, reject) => {
        fs.createReadStream(path.resolve(__dirname, '../data/ton.csv'), 'utf-8')
            .pipe(parser)
            .pipe(transformer)
            .pipe(toBulk)
            .pipe(ws)
            .on('error', reject)
            .on('finish', resolve);
    });
}

function setupIndex(opts) {
    const create = () => client.indices.create({
        index: indexName,
        type: indexType,
        body: indexConfig
    });

    if (opts.recreate) {
        return client.indices
            .delete({
                index: indexName,
                ignore: [404]
            })
            .then(create)
    } else {
        return client.indices
            .exists({
                index: indexName
            })
            .then(exists => exists ? null : create());
    }

}