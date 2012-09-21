
var compileObserver = require("./compile-observer");
var Observers = require("./observers");

module.exports = compile;
function compile(syntax) {
    var args = syntax.args;
    if (syntax.type === "property") {
        var observeObject = compileObserver(args[0]);
        var observeKey = compileObserver(args[1]);
        return function (observeValue, source, target, parameters) {
            return observeObject(Observers.autoCancelPrevious(function (object) {
                return observeKey(Observers.autoCancelPrevious(function (key) {
                    return observeValue(Observers.autoCancelPrevious(function (value) {
                        object[key] = value;
                        return noop;
                    }), source, parameters);
                }), target, parameters);
            }), target, parameters);
        };
    } else {
        throw new Error("Can't compile setter for " + JSON.stringify(syntax));
    }
}

function noop() {}

