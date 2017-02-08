const Promise = require('bluebird');
const fs = require('fs');
const path = require('path');
const es = require('elasticsearch');
const ess = require('elasticsearch-streams');
const csv = require('csv');
const transform = require('stream-transform');
const yargs = require('yargs');

const opts = yargs.argv;

const roles = {
    Opposition: 'opposisjon',
    Cabinet: 'posisjon',
    Support: 'støtte'
};

const client = new es.Client();

function search(query) {
    console.log(query);

    return new Promise((resolve, reject) => {
        const body = {
            query: {
                query_string: {
                    query: `(date:>=2004-01-01 AND date:<=2016-12-31) AND text:(${query})`
                }
            },

            sort: { date: 'desc' }
        }

        const rs = new ess.ReadableSearch((from, callback) => {
            client.search({
                index: 'talk-of-norway',
                from: from,
                size: 20,
                body: body
            }, callback);
        });

        const transformer = transform(hit => ({
            id: hit._source.id,
            session: hit._source.session,
            time: hit._source.time,
            name: hit._source.rep_name,
            party: hit._source.party_name,
            speaker_role: hit._source.speaker_role,
            party_role: roles[hit._source.party_role],
            debate_type: hit._source.debate_type,
            committee_name: hit._source.subject_committee_name,
            keyword: hit._source.keyword,
            keywords: (hit._source.keywords || '').replace(/ ; /g, ';'),
            subject_names: (hit._source.subject_names || '').replace(/ ; /g, ';'),
            text: hit._source.text
        }));

        rs
            .pipe(transformer)
            .pipe(csv.stringify({header: true, delimiter: ','}))
            .pipe(fs.createWriteStream(path.resolve(__dirname, `../data/results.${query.replace(/\W/g, '').toLowerCase()}.csv`)))
            .on('finish', () => resolve())
            .on('error', err => reject(err));
    });

}

function getRole(str) {
    const r = roles[str];

    if (!r) {
        throw new Error(`unknown role: ${str}`);
    } else {
        return r;
    }
}

Promise.each(opts._, q => search(q).then(() => console.log(`done: ${q}`)))