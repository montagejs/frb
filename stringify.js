"use strict";

var parse = require("./parse");
var precedence = require("./language").precedence;
var typeToToken = require("./language").operatorTypes;
var tokenToType = require("./language").operatorTokens;

module.exports = stringify;
function stringify(syntax, scope) {
    return stringify.semantics.stringify(syntax, scope);
}

function makeBlockStringifier(type) {
    return function (syntax, scope, stringify) {
        var chain = type + '{' + stringify(syntax.args[1], scope) + '}';
        if (syntax.args[0].type === "value") {
            return chain;
        } else {
            return stringify(syntax.args[0], scope) + '.' + chain;
        }
    };
}

stringify.semantics = {

    makeBlockStringifier: makeBlockStringifier,

    stringify: function (syntax, scope, parent) {
        var stringify = this.stringify.bind(this);
        var stringifiers = this.stringifiers;
        var string;
        function stringifyChild(child) {
            var arg = stringify(child, scope);
            if (!arg) return "this";
            return arg;
        }
        if (stringifiers[syntax.type]) {
            // operators
            string = stringifiers[syntax.type](syntax, scope, stringify);
        } else if (syntax.inline) {
            // inline invocations
            string = (
                "&" + syntax.type + "(" +
                syntax.args.map(stringifyChild).join(", ") + ")"
            );
        } else {
            // method invocations
            var chain;
            if (syntax.args.length === 1 && syntax.args[0].type === "mapBlock") {
                // map block function calls
                chain = syntax.type + "{" + stringify(syntax.args[0].args[1], scope) + "}";
                syntax = syntax.args[0];
            } else {
                // normal function calls
                chain = (
                    syntax.type + "(" +
                    syntax.args.slice(1).map(stringifyChild).join(", ") + ")"
                );
            }
            // left-side if it exists
            if (syntax.args[0].type === "value") {
                string = chain;
            } else {
                string = stringify(syntax.args[0], scope) + "." + chain;
            }
        }
        // parenthesize if we're going backward in precedence
        if (
            !parent ||
            (parent.type === syntax.type && parent.type !== "if") ||
            // TODO check on weirdness of "if"
            precedence.get(parent.type).has(syntax.type)
        ) {
            return string;
        } else {
            return "(" + string + ")";
        }
    },

    stringifiers: {

        value: function (syntax, scope, stringify) {
            return '';
        },

        literal: function (syntax, scope, stringify) {
            if (typeof syntax.value === 'string') {
                return "'" + syntax.value.replace("'", "\\'") + "'";
            } else {
                return "" + syntax.value;
            }
        },

        parameters: function (syntax, scope, stringify) {
            return '$';
        },

        record: function (syntax, scope, stringify) {
            return "{" + Object.map(syntax.args, function (value, key) {
                var string;
                if (value.type === "value") {
                    string = "this";
                } else {
                    string = stringify(value, scope);
                }
                return key + ": " + string;
            }).join(", ") + "}";
        },

        tuple: function (syntax, scope, stringify) {
            return "[" + Object.map(syntax.args, function (value) {
                if (value.type === "value") {
                    return "this";
                } else {
                    return stringify(value);
                }
            }).join(", ") + "]";
        },

        component: function (syntax, scope) {
            var label;
            if (scope && scope.components && syntax.component) {
                if (scope.components.getObjectLabel) {
                    label = scope.components.getObjectLabel(syntax.component);
                } else if (scope.components.getLabelForObject) {
                    // I am hoping that we will change Montage to use this API
                    // for consistency with document.getElementById,
                    // components.getObjectByLabel, & al
                    label = scope.components.getLabelForObject(syntax.component);
                }
            } else {
                label = syntax.label;
            }
            return '@' + label;
        },

        element: function (syntax) {
            return '#' + syntax.id;
        },

        mapBlock: makeBlockStringifier("map"),
        filterBlock: makeBlockStringifier("filter"),
        someBlock: makeBlockStringifier("some"),
        everyBlock: makeBlockStringifier("every"),
        sortedBlock: makeBlockStringifier("sorted"),
        sortedSetBlock: makeBlockStringifier("sortedSet"),
        groupBlock: makeBlockStringifier("group"),
        groupMapBlock: makeBlockStringifier("groupMap"),
        minBlock: makeBlockStringifier("min"),
        maxBlock: makeBlockStringifier("max"),

        property: function (syntax, scope, stringify) {
            if (syntax.args[0].type === "value") {
                if (typeof syntax.args[1].value === "string") {
                    return syntax.args[1].value;
                } else if (syntax.args[1].type === "literal") {
                    return "." + syntax.args[1].value;
                } else {
                    return "this[" + stringify(syntax.args[1], scope) + "]";
                }
            } else if (syntax.args[0].type === "parameters") {
                return "$" + syntax.args[1].value;
            } else if (
                syntax.args[1].type === "literal" &&
                /^[\w\d_]+$/.test(syntax.args[1].value)
            ) {
                return stringify(syntax.args[0], scope, {
                    type: "scope"
                }) + '.' + syntax.args[1].value;
            } else {
                return stringify(syntax.args[0], {
                    type: "scope"
                }, scope) + '[' + stringify(syntax.args[1], scope) + ']';
            }
        },

        "with": function (syntax, scope, stringify) {
            var right = stringify(syntax.args[1], scope, syntax);
            return stringify(syntax.args[0], scope) + "." + right;
        },

        not: function (syntax, scope, stringify) {
            if (syntax.args[0].type === "equals") {
                return (
                    stringify(syntax.args[0].args[0], scope, {type: "equals"}) +
                    " != " +
                    stringify(syntax.args[0].args[1], scope, {type: "equals"})
                );
            } else {
                return '!' + stringify(syntax.args[0], scope, syntax)
            }
        },

        neg: function (syntax, scope, stringify) {
            return '-' + stringify(syntax.args[0], scope, syntax)
        },

        toNumber: function (syntax, scope, stringify) {
            return '+' + stringify(syntax.args[0], scope, syntax)
        },

        parent: function (syntax, scope, stringify) {
            return '^' + stringify(syntax.args[0], scope, syntax)
        },

        if: function (syntax, scope, stringify) {
            return (
                stringify(syntax.args[0], scope, syntax) + " ? " +
                stringify(syntax.args[1], scope) + " : " +
                stringify(syntax.args[2], scope)
            );
        },

        event: function (syntax, scope, stringify) {
            return syntax.when + " " + syntax.event + " -> " + stringify(syntax.listener, scope);
        },

        binding: function (arrow, syntax, scope, stringify) {

            var header = stringify(syntax.args[0], scope) + " " + arrow + " " + stringify(syntax.args[1], scope);
            var trailer = "";

            var descriptor = syntax.descriptor;
            if (descriptor) {
                for (var name in descriptor) {
                    trailer += ", " + name + ": " + stringify(descriptor[name], scope);
                }
            }

            return header + trailer;
        },

        bind: function (syntax, scope, stringify) {
            return this.binding("<-", syntax, scope, stringify);
        },

        bind2: function (syntax, scope, stringify) {
            return this.binding("<->", syntax, scope, stringify);
        },

        assign: function (syntax, scope, stringify) {
            return stringify(syntax.args[0], scope) + ": " + stringify(syntax.args[1], scope);
        },

        block: function (syntax, scope, stringify) {
            var header = "@" + syntax.label;
            if (syntax.connection) {
                if (syntax.connection === "prototype") {
                    header += " < ";
                } else if (syntax.connection === "object") {
                    header += " : ";
                }
                header += stringify({type: 'literal', value: syntax.module});
                if (syntax.exports && syntax.exports.type !== "value") {
                    header += " " + stringify(syntax.exports, scope);
                }
            }
            return header + " {\n" + syntax.statements.map(function (statement) {
                return "    " + stringify(statement, scope) + ";\n";
            }).join("") + "}\n";
        },

        sheet: function (syntax, scope, stringify) {
            return "\n" + syntax.blocks.map(function (block) {
                return stringify(block, scope);
            }).join("\n") + "\n";
        }

    }

};

// book a stringifier for all the defined symbolic operators
typeToToken.forEach(function (token, type) {
    stringify.semantics.stringifiers[type] = function (syntax, scope, stringify) {
        return syntax.args.map(function (child) {
            return stringify(child, scope, syntax);
        }).join(" " + token + " ").trim();
    }
});

