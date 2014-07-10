
require("collections/shim");
var grammar = require("./grammar");

var memo = {}; // could be Dict

module.exports = parse;
function parse(text, options) {
    if (Array.isArray(text)) {
        return {
            type: "tuple",
            args: text.map(function (text) {
                return parse(text, options);
            })
        };
    } else if (!options && Object.prototype.hasOwnProperty.call(memo, text)) {
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

