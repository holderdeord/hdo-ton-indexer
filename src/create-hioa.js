#!/usr/bin/env node

const csv = require('csv');
const path = require('path');
const fs = require('fs');
const transform = require('stream-transform');
const filter = require('stream-filter');
const moment = require('moment');

const roles = {
    Opposition: 'opposisjon',
    Cabinet: 'posisjon',
    Support: 'støtte'
};

let count = 0;

const transformer = transform((row) => {
    if (count % 100 === 0) {
        console.log(count);
    }
    count++;

    const res = {};

    Object.keys(row).forEach(key => {
        const value = row[key];

        if (value.trim() === "NA") {
            res[key] = null;
        } else {
            res[key] = value.trim();
        }
    })

    return {
        id: res.id,
        session: res.session,
        time: res.time,
        name: res.rep_name,
        party: res.party_name,
        speaker_role: res.speaker_role,
        party_role: roles[res.party_role],
        debate_type: res.debate_type,
        committee_name: res.subject_committee_name,
        keyword: res.keyword,
        keywords: (res.keywords || '').replace(/ ; /g, ';'),
        subject_names: (res.subject_names || '').replace(/ ; /g, ';'),
        match_riksrevisjon: /riksrevisjon/i.test(res.text),
        match_forvaltningsrevisjon: /forvaltningsrevisjon/i.test(res.text),
        match_kkom: /kontroll- og konstitusjonskomiteen/i.test(res.text),
        match_revisjonsrapport: /revisjonsrapport/i.test(res.text),
        match_riksrevisjon_and_undersokelse: /riksrevisjon/i.test(res.text) && /undersøkelse/i.test(res.text),
        text: res.text,
    };
});

const start = moment('2004-01-01');
const end = moment('2016-12-31');

const timeFilter = filter.obj(data => {
    const m = moment(data.time);
    return m.isAfter(start) && m.isBefore(end);
})

const input = fs.createReadStream(path.resolve(__dirname, '../data/ton.csv'), 'utf-8');
const out = fs.createWriteStream(path.resolve(__dirname, '../data/full.csv'));

input
    .pipe(csv.parse({columns: true, delimiter: ','}))
    .pipe(timeFilter)
    .pipe(transformer)
    .pipe(csv.stringify({header: true, delimiter: ',', formatters: {bool: d => d.toString()}}))
    .pipe(out)
    .on('error', err => console.log(err, err.stack))
    .on('finish', () => console.log('done'));
