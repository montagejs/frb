
var compileObserver = require("./compile-observer");
var Observers = require("./observers");

module.exports = compile;
function compile(syntax) {
    return compile.semantics.compile(syntax);
}

compile.semantics = {

    compilers: {

        property: function (observeObject, observeKey) {
            return function (observeValue, source, target, parameters) {
                return observeObject(Observers.autoCancelPrevious(function (object) {
                    return observeKey(Observers.autoCancelPrevious(function (key) {
                        return observeValue(Observers.autoCancelPrevious(function (value) {
                            object[key] = value;
                        }), source, parameters);
                    }), target, parameters);
                }), target, parameters);
            };
        }

    },

    compile: function (syntax) {
        var compilers = this.compilers;
        if (compilers.hasOwnProperty(syntax.type)) {
            var argObservers = syntax.args.map(compileObserver, compileObserver.semantics);
            return compilers[syntax.type].apply(null, argObservers);
        } else {
            throw new Error("Can't compile binder for " + JSON.stringify(syntax));
        }
    }

};

