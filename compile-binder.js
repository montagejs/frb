
var compileObserver = require("./compile-observer");
var Observers = require("./observers");
var Binders = require("./binders");
var solve = require("./algebra");

var valueSyntax = {type: "value"};
var trueSyntax = {type: "literal", value: true};

module.exports = compile;
function compile(syntax) {
    return compile.semantics.compile(syntax);
}

compile.semantics = {

    compilers: {
        property: Binders.makePropertyBinder,
        get: Binders.makeGetBinder,
        has: Binders.makeHasBinder,
        only: Binders.makeOnlyBinder,
        one: Binders.makeOneBinder,
        rangeContent: Binders.makeRangeContentBinder,
        mapContent: Binders.makeMapContentBinder,
        reversed: Binders.makeReversedBinder,
        and: Binders.makeAndBinder,
        or: Binders.makeOrBinder
    },

    compile: function (syntax) {
        var compilers = this.compilers;
        if (syntax.type === "default") {
            return this.compile(syntax.args[0]);
        } else if (syntax.type === "literal") {
            if (syntax.value == null) {
                return Function.noop;
            } else {
                throw new Error("Can't bind to literal: " + syntax.value);
            }
        } else if (syntax.type === "equals") {
            var bindLeft = this.compile(syntax.args[0]);
            var observeRight = compileObserver(syntax.args[1]);
            return Binders.makeEqualityBinder(bindLeft, observeRight);
        } else if (syntax.type === "if") {
            var observeCondition = compileObserver(syntax.args[0]);
            var bindConsequent = this.compile(syntax.args[1]);
            var bindAlternate = this.compile(syntax.args[2]);
            return Binders.makeConditionalBinder(observeCondition, bindConsequent, bindAlternate);
        } else if (syntax.type === "and" || syntax.type === "or") {
            var leftArgs = solve(syntax.args[0], valueSyntax);
            var rightArgs = solve(syntax.args[1], valueSyntax);
            var bindLeft = this.compile(leftArgs[0]);
            var bindRight = this.compile(rightArgs[0]);
            var observeLeftBind = compileObserver(leftArgs[1]);
            var observeRightBind = compileObserver(rightArgs[1]);
            var observeLeft = compileObserver(syntax.args[0]);
            var observeRight = compileObserver(syntax.args[1]);
            return this.compilers[syntax.type](
                bindLeft,
                bindRight,
                observeLeft,
                observeRight,
                observeLeftBind,
                observeRightBind
            );
        } else if (syntax.type === "everyBlock") {
            var observeCollection = compileObserver(syntax.args[0]);
            var args = solve(syntax.args[1], trueSyntax);
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
        } else if (syntax.type === "defined") {
            var bindTarget = this.compile(syntax.args[0]);
            return Binders.makeDefinedBinder(bindTarget);
        } else if (syntax.type === "parent") {
            var bindTarget = this.compile(syntax.args[0]);
            return Binders.makeParentBinder(bindTarget);
        } else if (syntax.type === "with") {
            var observeTarget = compileObserver(syntax.args[0]);
            var bindTarget = this.compile(syntax.args[1]);
            return Binders.makeWithBinder(observeTarget, bindTarget);
        } else if (compilers.hasOwnProperty(syntax.type)) {
            var argObservers = syntax.args.map(compileObserver, compileObserver.semantics);
            return compilers[syntax.type].apply(null, argObservers);
        } else {
            throw new Error("Can't compile binder for " + JSON.stringify(syntax.type));
        }
    }

};

