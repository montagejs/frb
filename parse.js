
require("collections/shim");
var grammar = require("./grammar");

module.exports = parse;
function parse(text, options) {
    if (Array.isArray(text)) {
        return {
            type: "tuple",
            args: text.map(function (text) {
                return parse(text, options);
            })
        };
    } else {
        try {
            return grammar.parse(text, options || Object.empty);
        } catch (error) {
            error.message = (
                error.message.replace(/[\s\.]+$/, "") + " " +
                " on line " + error.line + " column " + error.column
            );
            throw error;
        }
    }
}

