const Promise = require('bluebird');
const opts = require('yargs').argv
const fs = require('fs');
const csv = require('csv');

const allById = {};

Promise.each(opts._, f => {
    return new Promise((resolve, reject) => {
        csv.parse(fs.readFileSync(f), {columns: true}, (err, data) => {
            if (err) {
                return reject(err);
            }

            data.forEach(d => allById[d.id] = d);
            resolve();
        })

    })
}).then(() => {
    const values = Object.keys(allById).map(k => allById[k]).sort((a, b) => b.time.localeCompare(a.time))
    csv.stringify(values, {header: true}, 
        (err, str) => {
            if (err) {
                throw err;
            }

            process.stdout.write(str)
        })
})


