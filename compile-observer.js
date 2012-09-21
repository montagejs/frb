
var Observers = require("./observers");

module.exports = compile;
function compile(syntax) {
    return compile.semantics.compile(syntax);
}

compile.semantics = {

    compilers: {
        property: Observers.makePropertyObserver,
        map: Observers.makeMapObserver,
        reversed: Observers.makeReversedObserver,
        flatten: Observers.makeFlattenObserver,
        sum: Observers.makeSumObserver,
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
        } else if (compilers.hasOwnProperty(syntax.type)) {
            var argObservers = syntax.args.map(this.compile, this);
            return compilers[syntax.type].apply(null, argObservers);
        } else {
            throw new Error("Can't compile observer for " + JSON.stringify(syntax));
        }
    }

};

