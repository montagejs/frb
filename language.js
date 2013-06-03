
var Set = require("collections/set");
var Dict = require("collections/dict");

var precedence = exports.precedence = Dict();
var levels = exports.precedenceLevels = [
    ["tuple", "record"],
    [
        "literal",
        "value",
        "parameters",
        "property",
        "element",
        "component",
        "mapBlock",
        "filterBlock",
        "sortedBlock",
        "groupBlock",
        "groupMapBlock",
        "with"
    ],
    ["not", "neg", "number", "parent"],
    ["scope"],
    ["default"],
    ["pow", "root", "log"],
    ["mul", "div", "mod", "rem"],
    ["add", "sub"],
    ["equals", "lt", "gt", "le", "ge", "compare"],
    ["and"],
    ["or"],
    ["if"]
];

levels.forEach(function (level) {
    var predecessors = Set(precedence.keys());
    level.forEach(function (operator) {
        precedence.set(operator, predecessors);
    });
});

var operatorTokens = exports.operatorTokens = Dict({
    "**": "pow",
    "//": "root",
    "%%": "log",
    "*": "mul",
    "/": "div",
    "%": "mod",
    "rem": "rem",
    "+": "add",
    "-": "sub",
    "<": "lt",
    ">": "gt",
    "<=": "le",
    ">=": "ge",
    "==": "equals",
    "<=>": "compare",
    "!=": "notEquals",
    "??": "default",
    "&&": "and",
    "||": "or",
    "?": "then",
    ":": "else"
});

exports.operatorTypes = Dict(operatorTokens.map(function (type, token) {
    return [type, token];
}));

