
var parse = require("./parse");
var compile = require("./compile-observer");
var Observers = require("./observers");
var autoCancelPrevious = Observers.autoCancelPrevious;
var Scope = require("./scope");

module.exports = observe;
function observe(source, expression, descriptorOrFunction) {
    var descriptor;
    if (typeof descriptorOrFunction === "function") {
        descriptor = {change: descriptorOrFunction};
    } else {
        descriptor = descriptorOrFunction;
    }

    descriptor = descriptor || empty;
    descriptor.source = source;
    descriptor.sourcePath = expression;
    var parameters = descriptor.parameters = descriptor.parameters || source;
    var document = descriptor.document;
    var components = descriptor.components;
    var beforeChange = descriptor.beforeChange;
    var contentChange = descriptor.contentChange;
    var sourceScope = new Scope(
        source,
        null,
        parameters,
        document,
        components,
        beforeChange
    );


    var syntax = parse(expression);
    var observe = compile(syntax);

    // decorate for content change observations
    if (contentChange === true) {
        observe = Observers.makeRangeContentObserver(observe);
    }

    return observe(autoCancelPrevious(function (value) {
        if (!value) {
        } else if (typeof contentChange !== "function") {
            return descriptor.change.apply(source, arguments);
        } else if (typeof contentChange === "function") {
            value.addRangeChangeListener(contentChange);
            return function () {
                value.removeRangeChangeListener(contentChange);
            };
        }
    }), sourceScope);
}

var empty = {};

