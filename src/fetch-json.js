const es = require('elasticsearch');
const client = new es.Client();

client.search({
    index: 'talk-of-norway',
    body: {
        query: {
            query_string: {
                query: '(date:>=2004-01-01 AND date:<=2016-12-31) AND "Kontroll- og konstitusjonskomiteen"'
                // query: '_id:tale242119'
            }
            // match_all: {}
        },

        sort: { date: 'desc' },
        size: 1,

        aggs: {
            committee: {
                terms: {
                    field: 'subject_committee_name',
                    size: 50
                }
            },

            missing_committee: {
                missing: { field: 'subject_committee_name' }
            },

            role: {
                terms: {
                    field: 'party_role'
                }
            },

            debateType: {
                terms: {
                    field: 'debate_type'
                }
            }
        }
    }
})
.then(res => console.log(JSON.stringify(res, null, 2)))
.catch(err => console.error(err, err.stack));