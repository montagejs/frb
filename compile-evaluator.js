
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
    },

    "default": function (evaluateLeft, evaluateRight) {
        return function (value, parameters) {
            var result = evaluateLeft(value, parameters);
            if (result == null) { // implies "iff === null or undefined"
                result = evaluateRight(value, parameters);
            }
            return result;
        }
    },

    defined: function (evaluate) {
        return function (source, parameters) {
            var value = evaluate(source, parameters);
            return value != null; // implies exactly !== null or undefined
        };
    },

    path: function (evaluateObject, evaluatePath) {
        return function (value, parameters) {
            var evaluate = require("./evaluate");
            var object = evaluateObject(value, parameters);
            var path = evaluatePath(value, parameters);
            try {
                return evaluate(path, object, parameters);
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
            return function (value, parameters) {
                var args = argEvaluators.map(function (evaluateArg) {
                    return evaluateArg(value, parameters);
                });
                if (!args.every(defined))
                    return;
                return operator.apply(null, args);
            };
        }

    }

};

function defined(value) {
    return value != null;
}
