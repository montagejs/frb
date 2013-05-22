
var parse = require("./parse");
var compile = require("./compile-assigner");
var Scope = require("./scope");

module.exports = assign;
function assign(target, path, value, parameters, document, components) {
    var syntax;
    if (typeof path === "string") {
        syntax = parse(path);
    } else {
        syntax = path;
    }
    var assign = compile(syntax);
    return assign(value, new Scope(target, null, parameters, document, components));
}

