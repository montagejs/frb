
var parse = require("./parse");
var compile = require("./compile-evaluator");
var Scope = require("./scope");

module.exports = evaluate;
function evaluate(path, value, parameters, document, components) {
    var syntax;
    if (typeof path === "string") {
        syntax = parse(path);
    } else {
        syntax = path;
    }
    var evaluate = compile(syntax);
    return evaluate(new Scope(value, null, parameters, document, components));
}

