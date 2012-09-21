
var Parser = require("./parser");
var Map = require("collections/map");

module.exports = parse;
function parse(text) {
    return parse.semantics.parse(text);
}

parse.semantics = {

    grammar: function () {
        var self = this;
        self.precedence(function () {
            return self.parsePrimary
        });
        self.parseExpression = self.precedence();
        self.parseMemoized = Parser.makeParser(self.precedence());
    },

    memo: new Map(),

    parse: function (text) {
        if (this.memo.has(text)) {
            return this.memo.get(text);
        } else {
            var syntax = this.parseMemoized(text);
            this.memo.set(text, syntax);
            return syntax;
        }
    },

    precedence: function (callback) {
        callback = callback || identity;
        this.parsePrevious = callback(this.parsePrevious);
        return this.parsePrevious;
    },

    parseBegin: Parser.makeExpect("("),
    parseEnd: Parser.makeExpect(")"),
    parseDot: Parser.makeExpect("."),

    parseIdentifier: function parseIdentifier(callback, word) {
        word = word || "";
        return function (character, loc) {
            if (/[\w\d]/.test(character)) {
                return parseIdentifier(callback, word + character);
            } else if (word !== "") {
                return callback(word)(character, loc);
            } else {
                return callback()(character, loc);
            }
        };
    },

    parsePrimary: function (callback, previous) {
        var self = this;
        previous = previous || {type: "value"};
        return self.parseIdentifier(function (identifier) {
            if (identifier) {
                return self.parseBlock(function (expression) {
                    if (expression) {
                        if (identifier === "map") {
                            return self.parseTail(callback, {
                                type: "map",
                                args: [
                                    previous,
                                    expression
                                ]
                            });
                        } else {
                            if (expression.type === "value") {
                                return self.parseTail(callback, {
                                    type: identifier,
                                    args: [
                                        previous,
                                        expression
                                    ]
                                });
                            } else {
                                return self.parseTail(callback, {
                                    type: identifier,
                                    args: [
                                        {
                                            type: "map",
                                            args: [
                                                previous,
                                                expression
                                            ]
                                        }
                                    ]
                                });
                            }
                        }
                    } else {
                        return self.parseTail(callback, {
                            type: "property",
                            args: [
                                previous,
                                {
                                    type: "literal",
                                    value: identifier
                                }
                            ]
                        });
                    }
                });
            } else {
                return callback(previous);
            }
        });
    },

    parseTail: function (callback, previous) {
        var self = this;
        return self.parseDot(function (dot) {
            if (dot) {
                return self.parsePrimary(callback, previous);
            } else {
                return callback(previous);
            }
        });
    },

    parseBlock: function (callback) {
        var self = this;
        return self.parseBegin(function (begin) {
            if (begin) {
                return self.parseExpression(function (expression) {
                    return self.parseEnd(function (end, loc) {
                        if (end) {
                            return callback(expression);
                        } else {
                            var error = new Error("Expected \")\"");
                            error.loc = loc;
                            throw error;
                        }
                    });
                })
            } else {
                return callback();
            }
        });
    }

};

parse.semantics.grammar();

function identity(x) { return x }

