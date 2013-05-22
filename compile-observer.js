
var Observers = require("./observers");
var Operators = require("./operators");

module.exports = compile;
function compile(syntax) {
    return semantics.compile(syntax);
}

var semantics = compile.semantics = {

    compilers: {
        property: Observers.makePropertyObserver,
        get: Observers.makeGetObserver,
        path: Observers.makePathObserver,
        "with": Observers.makeWithObserver,
        "if": Observers.makeConditionalObserver,
        parent: Observers.makeParentObserver,
        not: Observers.makeNotObserver,
        and: Observers.makeAndObserver,
        or: Observers.makeOrObserver,
        "default": Observers.makeDefaultObserver,
        defined: Observers.makeDefinedObserver,
        rangeContent: Function.identity,
        mapContent: Function.identity,
        keys: Observers.makeKeysObserver,
        values: Observers.makeValuesObserver,
        items: Observers.makeItemsObserver,
        toMap: Observers.makeToMapObserver,
        mapBlock: Observers.makeMapBlockObserver,
        filterBlock: Observers.makeFilterBlockObserver,
        everyBlock: Observers.makeEveryBlockObserver,
        someBlock: Observers.makeSomeBlockObserver,
        sortedBlock: Observers.makeSortedBlockObserver,
        // TODO sortedSetBlock: Observers.makeSortedSetBlockObserver,
        groupBlock: Observers.makeGroupBlockObserver,
        groupMapBlock: Observers.makeGroupMapBlockObserver,
        minBlock: Observers.makeMinBlockObserver,
        maxBlock: Observers.makeMaxBlockObserver,
        enumerate: Observers.makeEnumerationObserver,
        reversed: Observers.makeReversedObserver,
        flatten: Observers.makeFlattenObserver,
        view: Observers.makeViewObserver,
        sum: Observers.makeSumObserver,
        average: Observers.makeAverageObserver,
        has: Observers.makeHasObserver,
        // TODO zip
        tuple: Observers.makeArrayObserver,
        range: Observers.makeRangeObserver,
        startsWith: Observers.makeStartsWithObserver,
        endsWith: Observers.makeEndsWithObserver,
        contains: Observers.makeContainsObserver
    },

    compile: function (syntax) {
        var compilers = this.compilers;
        if (syntax.type === "literal") {
            return Observers.makeLiteralObserver(syntax.value);
        } else if (syntax.type === "value") {
            return Observers.observeValue;
        } else if (syntax.type === "parameters") {
            return Observers.observeParameters;
        } else if (syntax.type === "element") {
            return Observers.makeElementObserver(syntax.id);
        } else if (syntax.type === "component") {
            return Observers.makeComponentObserver(syntax.label, syntax);
        } else if (syntax.type === "record") {
            var observers = {};
            var args = syntax.args;
            for (var name in args) {
                observers[name] = this.compile(args[name]);
            }
            return Observers.makeObjectObserver(observers);
        } else {
            if (!compilers.hasOwnProperty(syntax.type)) {
                compilers[syntax.type] = Observers.makeMethodObserverMaker(syntax.type);
            }
            var argObservers = syntax.args.map(this.compile, this);
            return compilers[syntax.type].apply(null, argObservers);
        }
    }

};

var compilers = semantics.compilers;
Object.keys(Operators).forEach(function (name) {
    if (!compilers[name]) {
        compilers[name] = Observers.makeOperatorObserverMaker(Operators[name]);
    }
});

