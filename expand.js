
var Set = require("collections/set");
var Map = require("collections/map");
var Operators = require("./operators");

module.exports = expand;
function expand(syntax, value) {
    var bound = expand.semantics.expand.bind(expand.semantics);
    return bound(syntax, value, bound);
}

expand.semantics = {

    reflexive: Set([
        "literal",
        "element",
        "component",
        "rangeContent",
        "mapContent"
    ]),

    traverseLeft: Set([
        "with",
        "mapBlock",
        "filterBlock",
        "someBlock",
        "everyBlock",
        "sortedBlock"
    ]),

    traverseAll: Set([
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
        "not",
        "neg",
        "number"
    ]).addEach(Object.keys(Operators)),

    expanders: Map({
        literal: function (syntax) {
            return syntax;
        },
        parameters: function (syntax) {
            return parameters;
        },
        value: function (syntax, value) {
            return value;
        },
        record: function (syntax, value, expand) {
            var expanded = {type: "record", args: []};
            for (var name in syntax.args) {
                expanded.args[name] = expand(syntax.args[name], value, expand);
            }
            return expanded;
        }
    }),

    expand: function (syntax, value, expand) {
        if (this.expanders.has(syntax.type)) {
            return this.expanders.get(syntax.type)(syntax, value, expand);
        } else if (this.traverseLeft.has(syntax.type)) {
            return {type: syntax.type, args: [
                expand(syntax.args[0], value, expand)
            ].concat(syntax.args.slice(1))};
        } else if (this.traverseAll.has(syntax.type)) {
            return {type: syntax.type, args: syntax.args.map(function (arg) {
                return expand(arg, value, expand);
            })};
        } else {
            throw new Error("Can't expand: " + JSON.stringify(syntax.type));
        }
    }

};

