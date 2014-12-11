
require("collections/shim");
var grammar = require("./grammar");

var memo = Object.create(null); // could be Dict

module.exports = parse;
function parse(text, options) {
    if (Array.isArray(text)) {
        return {
            type: "tuple",
            args: text.map(function (text) {
                return parse(text, options);
            })
        };
    } else if (!options && (text in memo)) {
        return memo[text];
    } else {
        try {
            var syntax = grammar.parse(text, options || Object.empty);
            if (!options) {
                memo[text] = syntax;
            }
            return syntax;
        } catch (error) {
            error.message = (
                error.message.replace(/[\s\.]+$/, "") + " " +
                " on line " + error.line + " column " + error.column
            );
            throw error;
        }
    }
}

