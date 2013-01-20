
var Set = require("collections/set");
var Map = require("collections/map");
var Operators = require("./operators");

module.exports = expand;
function expand(syntax, value, parameters) {
    var bound = expand.semantics.expand.bind(expand.semantics);
    return bound(syntax, value, parameters, bound);
}

expand.semantics = {

    reflexive: Set([
        "literal",
        "element",
        "rangeContent",
        "mapContent"
    ]),

    traverseLeft: Set([
        "with",
        "mapBlock",
        "filterBlock",
        "someBlock",
        "everyBlock",
        "sortedBlock",
        "groupBlock"
    ]),

    traverseAll: Set([
        "if",
        "tuple",
        "property",
        "get",
        "has",
        "map",
        "filter",
        "some",
        "every",
        "sorted",
        "one",
        "only",
        "enumerate",
        "flatten",
        "reversed",
        "view",
        "order",
        "sum",
        "average",
        "min",
        "max",
    ]).addEach(Object.keys(Operators)),

    expanders: Map({
        value: function (syntax, value) {
            return value || {"type": "value"};
        },
        parameters: function (syntax, value, parameters) {
            return parameters || {"type": "parameters"};
        },
        record: function (syntax, value, parameters, expand) {
            var expanded = {type: "record", args: []};
            for (var name in syntax.args) {
                expanded.args[name] = expand(syntax.args[name], value, parameters, expand);
            }
            return expanded;
        },
        component: function (syntax, value, parameters, expand) {
            if (parameters && parameters.serialization && syntax.component) {
                return {
                    type: "component",
                    label: parameters.serialization.getObjectLabel(syntax.component)
                };
            } else {
                return syntax;
            }
        }
    }),

    expand: function (syntax, value, parameters, expand) {
        if (this.expanders.has(syntax.type)) {
            return this.expanders.get(syntax.type)(syntax, value, parameters, expand);
        } else if (this.traverseLeft.has(syntax.type)) {
            return {type: syntax.type, args: [
                expand(syntax.args[0], value, parameters, expand)
            ].concat(syntax.args.slice(1))};
        } else if (this.traverseAll.has(syntax.type)) {
            return {type: syntax.type, args: syntax.args.map(function (arg) {
                return expand(arg, value, parameters, expand);
            })};
        } else if (this.reflexive.has(syntax.type)) {
            return syntax;
        } else {
            throw new Error("Can't expand: " + JSON.stringify(syntax.type));
        }
    }

};

