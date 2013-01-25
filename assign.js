
var parse = require("./parse");
var compile = require("./compile-assigner");

module.exports = assign;
function assign(source, path, value, parameters) {
    var syntax;
    if (typeof path === "string") {
        syntax = parse(path);
    } else {
        syntax = path;
    }
    var assign = compile(syntax);
    return assign(value, source, parameters);
}

