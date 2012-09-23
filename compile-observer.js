
var Observers = require("./observers");

module.exports = compile;
function compile(syntax) {
    return compile.semantics.compile(syntax);
}

compile.semantics = {

    compilers: {
        property: Observers.makePropertyObserver,
        content: identity,
        map: Observers.makeMapObserver,
        reversed: Observers.makeReversedObserver,
        flatten: Observers.makeFlattenObserver,
        sum: Observers.makeSumObserver,
        has: Observers.makeHasObserver,
        average: Observers.makeAverageObserver,
        tuple: Observers.makeTupleObserver
    },

    compile: function (syntax) {
        var compilers = this.compilers;
        if (syntax.type === 'literal') {
            return Observers.makeLiteralObserver(syntax.value);
        } else if (syntax.type === 'value') {
            return Observers.observeValue;
        } else if (syntax.type === 'parameters') {
            return Observers.observeParameters;
        } else if (syntax.type === 'record') {
            var observers = {};
            var args = syntax.args;
            for (var name in args) {
                observers[name] = this.compile(args[name]);
            }
            return Observers.makeRecordObserver(observers);
        } else if (compilers.hasOwnProperty(syntax.type)) {
            var argObservers = syntax.args.map(this.compile, this);
            return compilers[syntax.type].apply(null, argObservers);
        } else {
            throw new Error("Can't compile observer for " + JSON.stringify(syntax));
        }
    }

};

function identity(x) { return x; }

