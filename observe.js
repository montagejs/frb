
var parse = require("./parse");
var compile = require("./compile-observer");
var Observers = require("./observers");

module.exports = observe;
function observe(object, path, descriptor) {
    if (typeof descriptor === 'function') {
        descriptor = {set: descriptor};
    }

    descriptor = descriptor || empty;
    descriptor.source = object;
    descriptor.sourcePath = path;
    var parameters = descriptor.parameters = descriptor.parameters || object;
    var beforeChange = descriptor.beforeChange;
    var contentChange = descriptor.contentChange;

    var syntax = parse(path);
    var observe = compile(syntax);

    // decorate for content change observations
    if (contentChange) {
        observe = Observers.makeContentObserver(observe);
    }

    // cancel any previous observer on the descriptor
    if (descriptor.cancel) {
        descriptor.cancel();
    }

    var cancel = observe(function () {
        return descriptor.set.apply(object, arguments);
    }, object, parameters, beforeChange);

    descriptor.cancel = cancel;

    return cancel;
}

var empty = {};

