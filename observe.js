
var parse = require("./parse");
var compile = require("./compile-observer");

module.exports = observe;

function observe(object, path, set, parameters) {
    var syntax = parse(path);
    var observe = compile(syntax);
    return observe(set, object, parameters);
}

