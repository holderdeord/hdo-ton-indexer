module.exports = {
    settings: {
        index: {
            analysis: {
                analyzer: {
                    analyzer_standard: {
                        tokenizer: 'standard',
                        filter: ['standard', 'lowercase']
                    }
                }
            }
        }
    },

    mappings: {
        transcript: {
            dynamic_templates: [{
                notanalyzed: {
                    match: '*',
                    match_mapping_type: 'string',
                    mapping: {
                        type: 'string',
                        index: 'not_analyzed'
                    }
                }
            }],

            properties: {
                text: {
                    type: 'string',
                    index: 'analyzed',
                    analyzer: 'analyzer_standard'
                }
            }
        }
    }
}

