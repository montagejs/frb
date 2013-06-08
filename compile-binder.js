
var compileObserver = require("./compile-observer");
var Observers = require("./observers");
var Binders = require("./binders");
var solve = require("./algebra");

module.exports = compile;
function compile(syntax) {
    return compile.semantics.compile(syntax);
}

compile.semantics = {

    compilers: {
        property: Binders.makePropertyBinder,
        get: Binders.makeGetBinder,
        has: Binders.makeHasBinder,
        rangeContent: Binders.makeRangeContentBinder,
        mapContent: Binders.makeMapContentBinder,
        reversed: Binders.makeReversedBinder
    },

    compile: function (syntax) {
        var compilers = this.compilers;
        if (syntax.type === "equals") {
            var bindLeft = this.compile(syntax.args[0]);
            var observeRight = compileObserver(syntax.args[1]);
            return Binders.makeEqualityBinder(bindLeft, observeRight);
        } else if (syntax.type === "if") {
            var observeCondition = compileObserver(syntax.args[0]);
            var bindConsequent = this.compile(syntax.args[1]);
            var bindAlternate = this.compile(syntax.args[2]);
            return Binders.makeConditionalBinder(observeCondition, bindConsequent, bindAlternate);
        } else if (syntax.type === "everyBlock") {
            var observeCollection = compileObserver(syntax.args[0]);
            var args = solve(syntax.args[1], {type: "literal", value: true});
            var bindCondition = this.compile(args[0]);
            var observeValue = compileObserver(args[1]);
            return Binders.makeEveryBlockBinder(observeCollection, bindCondition, observeValue);
        } else if (syntax.type === "rangeContent") {
            var observeTarget = compileObserver(syntax.args[0]);
            var bindTarget;
            try {
                bindTarget = this.compile(syntax.args[0]);
            } catch (exception) {
                bindTarget = Function.noop;
            }
            return Binders.makeRangeContentBinder(observeTarget, bindTarget);
        } else if (compilers.hasOwnProperty(syntax.type)) {
            var argObservers = syntax.args.map(compileObserver, compileObserver.semantics);
            return compilers[syntax.type].apply(null, argObservers);
        } else {
            throw new Error("Can't compile binder for " + JSON.stringify(syntax.type));
        }
    }

};

