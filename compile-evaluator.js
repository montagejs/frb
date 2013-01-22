
var Object = require("collections/shim-object");
var Map = require("collections/map");
var Operators = require("./operators");

module.exports = compile;
function compile(syntax) {
    return compile.semantics.compile(syntax);
}

var compilers = {

    literal: function (syntax) {
        return function () {
            return syntax.value;
        };
    },

    value: function (syntax) {
        return function (value) {
            return value;
        };
    },

    parameters: function (syntax) {
        return function (value, parameters) {
            return parameters;
        };
    },

    element: function (syntax) {
        return function (value, parameters) {
            return parameters.document.getElementById(syntax.id);
        };
    },

    component: function (syntax) {
        return function (value, parameters) {
            return parameters.serialization.getObjectByLabel(syntax.label);
        };
    },

    tuple: function (syntax) {
        var argEvaluators = syntax.args.map(this.compile, this);
        return function (value, parameters) {
            return argEvaluators.map(function (evaluateArg) {
                return evaluateArg(value, parameters);
            });
        };
    },

    record: function (syntax) {
        var args = syntax.args;
        var argEvaluators = {};
        for (var name in args) {
            argEvaluators[name] = this.compile(args[name]);
        }
        return function (value, parameters) {
            var object = {};
            for (var name in argEvaluators) {
                object[name] = argEvaluators[name](value, parameters);
            }
            return object;
        };
    }

};

var argCompilers = {

    mapBlock: function (evaluateCollection, evaluateRelation) {
        return function (value, parameters) {
            return evaluateCollection(value, parameters)
            .map(function (value) {
                return evaluateRelation(value, parameters);
            });
        };
    },

    filterBlock: function (evaluateCollection, evaluatePredicate) {
        return function (value, parameters) {
            return evaluateCollection(value, parameters)
            .filter(function (value) {
                return evaluatePredicate(value, parameters);
            });
        };
    },

    someBlock: function (evaluateCollection, evaluatePredicate) {
        return function (value, parameters) {
            return evaluateCollection(value, parameters)
            .some(function (value) {
                return evaluatePredicate(value, parameters);
            });
        };
    },

    everyBlock: function (evaluateCollection, evaluatePredicate) {
        return function (value, parameters) {
            return evaluateCollection(value, parameters)
            .every(function (value) {
                return evaluatePredicate(value, parameters);
            });
        };
    },

    sortedBlock: function (evaluateCollection, evaluateRelation) {
        return function (value, parameters) {
            return evaluateCollection(value, parameters)
            .sorted(Function.by(function (value) {
                return evaluateRelation(value, parameters);
            }));
        };
    },

    groupBlock: function (evaluateCollection, evaluateRelation) {
        return function (value, parameters) {
            return evaluateCollection(value, parameters)
            .group(function (value) {
                return evaluateRelation(value, parameters);
            });
        };
    },

    groupMapBlock: function (evaluateCollection, evaluateRelation) {
        return function (value, parameters) {
            return new Map(evaluateCollection(value, parameters)
            .group(function (value) {
                return evaluateRelation(value, parameters);
            }));
        };
    },

    minBlock: function (evaluateCollection, evaluateRelation) {
        return function (value, parameters) {
            return evaluateCollection(value, parameters)
            .min(Function.by(function (value) {
                return evaluateRelation(value, parameters);
            }))
        };
    },

    maxBlock: function (evaluateCollection, evaluateRelation) {
        return function (value, parameters) {
            return evaluateCollection(value, parameters)
            .max(Function.by(function (value) {
                return evaluateRelation(value, parameters);
            }))
        };
    },

    "with": function (evaluateContext, evaluateExpression) {
        return function (value, parameters) {
            return evaluateExpression(evaluateContext(value, parameters), parameters);
        };
    },

    "if": function (evaluateCondition, evaluateConsequent, evaluateAlternate) {
        return function (value, parameters) {
            if (evaluateCondition(value, parameters)) {
                return evaluateConsequent(value, parameters);
            } else {
                return evaluateAlternate(value, parameters);
            }
        }
    }

};

var operators = Object.clone(Operators, 1);

Object.addEach(operators, {

    property: function (object, key) {
        return object[key];
    },

    get: function (collection, key) {
        return collection.get(key);
    },

    mapContent: Function.identity,

    rangeContent: Function.identity,

    view: function (collection, start, length) {
        return collection.slice(start, start + length);
    }

});

// generate operators for syntax types that delegate to an eponymous method of
// the first argument
[
    "reversed",
    "flatten",
    "sum",
    "average",
    "map",
    "filter",
    "keys",
    "values",
    "items",
    "one",
    "only"
].forEach(function (name) {
    operators[name] = function (object) {
        var args = Array.prototype.slice.call(arguments, 1);
        if (!object[name])
            throw new TypeError("Can't call " + JSON.stringify(name) + " of " + object);
        return object[name].apply(object, args);
    };
});

var semantics = compile.semantics = {

    compilers: compilers,
    argCompilers: argCompilers,
    operators: operators,

    compile: function (syntax) {
        var compilers = this.compilers;
        var argCompilers = this.argCompilers;
        var operators = this.operators;
        if (operators.hasOwnProperty(syntax.type)) {
            var operator = operators[syntax.type];
            var argEvaluators = syntax.args.map(this.compile, this);
            return function (value, parameters) {
                var args = argEvaluators.map(function (evaluateArg) {
                    return evaluateArg(value, parameters);
                });
                return operator.apply(null, args);
            };
        } else if (compilers.hasOwnProperty(syntax.type)) {
            return compilers[syntax.type].call(this, syntax);
        } else if (argCompilers.hasOwnProperty(syntax.type)) {
            var argEvaluators = syntax.args.map(this.compile, this);
            return argCompilers[syntax.type].apply(null, argEvaluators);
        } else {
            throw new Error("Can't compile evaluator for " + JSON.stringify(syntax));
        }

    }

};

