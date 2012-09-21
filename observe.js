
var parse = require("./parse");
var compile = require("./compile-observer");

module.exports = observe;
function observe(object, path, callback, parameters) {
    var syntax = parse(path);
    var observe = compile(syntax);
    return observe(callback, object, parameters);
}

