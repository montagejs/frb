
var compileEvaluator = require("./compile-evaluator");

module.exports = compile;
function compile(syntax) {
    return compile.semantics.compile(syntax);
}

compile.semantics = {

    compile: function (syntax) {
        var compilers = this.compilers;
        if (syntax.type === "equals") {
            var assignLeft = this.compile(syntax.args[0]);
            var evaluateRight = this.compileEvaluator(syntax.args[1]);
            return compilers.equals(assignLeft, evaluateRight);
        } else if (syntax.type === "if") {
            var evaluateCondition = this.compileEvaluator(syntax.args[0]);
            var assignConsequent = this.compile(syntax.args[1]);
            var assignAlternate = this.compile(syntax.args[2]);
            return compilers["if"](evaluateCondition, assignConsequent, assignAlternate);
        } else if (compilers.hasOwnProperty(syntax.type)) {
            var argEvaluators = syntax.args.map(this.compileEvaluator, this.compileEvaluator.semantics);
            return compilers[syntax.type].apply(null, argEvaluators);
        } else {
            throw new Error("Can't compile assigner for " + JSON.stringify(syntax.type));
        }
    },

    compileEvaluator: compileEvaluator,

    compilers: {

        property: function (evaluateObject, evaluateKey) {
            return function (value, source, parameters) {
                var object = evaluateObject(source, parameters);
                if (!object) return;
                var key = evaluateKey(source, parameters);
                if (key == null) return;
                if (Array.isArray(object)) {
                    object.set(key, value);
                } else {
                    object[key] = value;
                }
            };
        },

        get: function (evaluateCollection, evaluateKey) {
            return function (value, source, parameters) {
                var collection = evaluateCollection(source, parameters);
                if (!collection) return;
                var key = evaluateKey(source, parameters);
                if (key == null) return;
                collection.set(key, value);
            };
        },

        has: function (evaluateCollection, evaluateValue) {
            return function (has, source, parameters) {
                var collection = evaluateCollection(source, parameters);
                if (!collection) return;
                var value = evaluateValue(source, parameters);
                if (value == null) return;
                if (has) {
                    if (!(collection.has || collection.contains).call(collection, value)) {
                        collection.add(value);
                    }
                } else {
                    if ((collection.has || collection.contains).call(collection, value)) {
                        (collection.remove || collection["delete"]).call(collection, value);
                    }
                }
            };
        },

        equals: function (assignLeft, evaluateRight) {
            return function (equals, source, parameters) {
                if (equals) {
                    return assignLeft(evaluateRight(source, parameters), source, parameters);
                }
            };
        },

        "if": function (evaluateCondition, assignConsequent, assignAlternate) {
            return function (value, source, parameters) {
                var condition = evaluateCondition(source, parameters);
                if (condition == null) return;
                if (condition) {
                    return assignConsequent(value, source, parameters);
                } else {
                    return assignAlternate(value, source, parameters);
                }
            };
        },

        rangeContent: function (evaluateTarget) {
            return function (value, source, parameters) {
                var target = evaluateTarget(source, parameters);
                if (!target) return;
                if (!value) {
                    target.clear();
                } else {
                    target.swap(0, target.length, value);
                }
            };
        },

        mapContent: function (evaluateTarget) {
            return function (value, source, parameters) {
                var target = evaluateTarget(source, parameters);
                if (!target) return;
                target.clear();
                if (source) {
                    target.addEach(value);
                }
            };
        },

        reversed: function (evaluateTarget) {
            return function (value, source, parameters) {
                var target = evaluateTarget(source, parameters);
                if (!target) return;
                target.swap(0, target.length, value.reversed());
            };
        }

    }

}

