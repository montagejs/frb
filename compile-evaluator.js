
var Object = require("collections/shim-object");
var Map = require("collections/map");
var SortedSet = require("collections/sorted-set");
var Operators = require("./operators");
var Scope = require("./scope");

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
        return function (scope) {
            return scope.value;
        };
    },

    parameters: function (syntax) {
        return function (scope) {
            return scope.parameters;
        };
    },

    element: function (syntax) {
        return function (scope) {
            return scope.document.getElementById(syntax.id);
        };
    },

    component: function (syntax) {
        return function (scope) {
            return scope.components.getObjectByLabel(syntax.label);
        };
    },

    tuple: function (syntax) {
        var argEvaluators = syntax.args.map(this.compile, this);
        return function (scope) {
            return argEvaluators.map(function (evaluateArg) {
                return evaluateArg(scope);
            });
        };
    },

    record: function (syntax) {
        var args = syntax.args;
        var argEvaluators = {};
        for (var name in args) {
            argEvaluators[name] = this.compile(args[name]);
        }
        return function (scope) {
            var object = {};
            for (var name in argEvaluators) {
                object[name] = argEvaluators[name](scope);
            }
            return object;
        };
    }

};

var argCompilers = {

    mapBlock: function (evaluateCollection, evaluateRelation) {
        return function (scope) {
            return evaluateCollection(scope)
            .map(function (value) {
                return evaluateRelation(scope.nest(value));
            });
        };
    },

    filterBlock: function (evaluateCollection, evaluatePredicate) {
        return function (scope) {
            return evaluateCollection(scope)
            .filter(function (value) {
                return evaluatePredicate(scope.nest(value));
            });
        };
    },

    someBlock: function (evaluateCollection, evaluatePredicate) {
        return function (scope) {
            return evaluateCollection(scope)
            .some(function (value) {
                return evaluatePredicate(scope.nest(value));
            });
        };
    },

    everyBlock: function (evaluateCollection, evaluatePredicate) {
        return function (scope) {
            return evaluateCollection(scope)
            .every(function (value) {
                return evaluatePredicate(scope.nest(value));
            });
        };
    },

    sortedBlock: function (evaluateCollection, evaluateRelation) {
        return function (scope) {
            return evaluateCollection(scope)
            .sorted(Function.by(function (value) {
                return evaluateRelation(scope.nest(value));
            }));
        };
    },

    sortedSetBlock: function (evaluateCollection, evaluateRelation) {
        return function (scope) {
            function map(x) {
                return evaluateRelation(scope.nest(x));
            }
            function contentCompare(x, y) {
                return Object.compare(map(x), map(y));
            }
            function contentEquals(x, y) {
                return Object.equals(map(x), map(y));
            }
            return new SortedSet(
                evaluateCollection(scope),
                contentEquals,
                contentCompare
            );
        };
    },

    groupBlock: function (evaluateCollection, evaluateRelation) {
        return function (scope) {
            return evaluateCollection(scope)
            .group(function (value) {
                return evaluateRelation(scope.nest(value));
            });
        };
    },

    groupMapBlock: function (evaluateCollection, evaluateRelation) {
        return function (scope) {
            return new Map(evaluateCollection(scope)
            .group(function (value) {
                return evaluateRelation(scope.nest(value));
            }));
        };
    },

    minBlock: function (evaluateCollection, evaluateRelation) {
        return function (scope) {
            return evaluateCollection(scope)
            .min(Function.by(function (value) {
                return evaluateRelation(scope.nest(value));
            }))
        };
    },

    maxBlock: function (evaluateCollection, evaluateRelation) {
        return function (scope) {
            return evaluateCollection(scope)
            .max(Function.by(function (value) {
                return evaluateRelation(scope.nest(value));
            }))
        };
    },

    parent: function (evaluateExpression) {
        return function (scope) {
            return evaluateExpression(scope.parent);
        };
    },

    "with": function (evaluateContext, evaluateExpression) {
        return function (scope) {
            return evaluateExpression(scope.nest(evaluateContext(scope)));
        };
    },

    "if": function (evaluateCondition, evaluateConsequent, evaluateAlternate) {
        return function (scope) {
            var condition = evaluateCondition(scope);
            if (condition == null) return;
            if (condition) {
                return evaluateConsequent(scope);
            } else {
                return evaluateAlternate(scope);
            }
        }
    },

    not: function (evaluateValue) {
        return function (scope) {
            return !evaluateValue(scope);
        };
    },

    and: function (evaluateLeft, evaluateRight) {
        return function (scope) {
            return evaluateLeft(scope) && evaluateRight(scope);
        };
    },

    or: function (evaluateLeft, evaluateRight) {
        return function (scope) {
            return evaluateLeft(scope) || evaluateRight(scope);
        };
    },

    "default": function (evaluateLeft, evaluateRight) {
        return function (scope) {
            var result = evaluateLeft(scope);
            if (result == null) { // implies "iff === null or undefined"
                result = evaluateRight(scope);
            }
            return result;
        }
    },

    defined: function (evaluate) {
        return function (scope) {
            var value = evaluate(scope);
            return value != null; // implies exactly !== null or undefined
        };
    },

    // TODO rename to evaluate
    path: function (evaluateObject, evaluatePath) {
        return function (scope) {
            var value = evaluateObject(scope);
            var path = evaluatePath(scope);
            var parse = require("./parse");
            try {
                var syntax = parse(path);
                var evaluate = compile(syntax);
                return evaluate(scope.nest(value));
            } catch (exception) {
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

var semantics = compile.semantics = {

    compilers: compilers,
    argCompilers: argCompilers,
    operators: operators,

    compile: function (syntax) {
        var compilers = this.compilers;
        var argCompilers = this.argCompilers;
        var operators = this.operators;
        if (compilers.hasOwnProperty(syntax.type)) {
            return compilers[syntax.type].call(this, syntax);
        } else if (argCompilers.hasOwnProperty(syntax.type)) {
            var argEvaluators = syntax.args.map(this.compile, this);
            return argCompilers[syntax.type].apply(null, argEvaluators);
        } else {
            if (!operators.hasOwnProperty(syntax.type)) {
                operators[syntax.type] = function (object) {
                    var args = Array.prototype.slice.call(arguments, 1);
                    if (!object[syntax.type])
                        throw new TypeError("Can't call " + JSON.stringify(syntax.type) + " of " + object);
                    return object[syntax.type].apply(object, args);
                };
            }
            var operator = operators[syntax.type];
            var argEvaluators = syntax.args.map(this.compile, this);
            return function (scope) {
                var args = argEvaluators.map(function (evaluateArg) {
                    return evaluateArg(scope);
                });
                if (!args.every(Operators.defined))
                    return;
                return operator.apply(null, args);
            };
        }

    }

};

