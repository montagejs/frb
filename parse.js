
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

    parseBlockBegin: Parser.makeExpect("{"),
    parseBlockEnd: Parser.makeExpect("}"),
    parseTupleBegin: Parser.makeExpect("("),
    parseTupleEnd: Parser.makeExpect(")"),
    parseDot: Parser.makeExpect("."),

    skipWhiteSpace: function skipWhiteSpace(callback) {
        return function (character) {
            if (character === " ") {
                return skipWhiteSpace(callback);
            } else {
                return callback()(character);
            }
        };
    },

    parseWord: function parseWord(callback, word) {
        word = word || "";
        return function (character, loc) {
            if (/[\w\d]/.test(character)) {
                return parseWord(callback, word + character);
            } else if (word !== "") {
                return callback(word)(character, loc);
            } else {
                return callback()(character, loc);
            }
        };
    },

    parseStringTail: function parseStringTail(callback, string) {
        var self = this;
        return function (character) {
            if (character === "'") {
                return callback({
                    type: "literal",
                    value: string
                });
            } else if (character === "\\") {
                return function (character) {
                    return self.parseStringTail(callback, string + character);
                };
            } else {
                return self.parseStringTail(callback, string + character);
            }
        };
    },

    parsePrimary: function parsePrimary(callback, previous) {
        var self = this;
        previous = previous || {type: "value"};
        return function (character) {
            if (character === "#") {
                return self.parseNumber(callback);
            // TODO @ for index of current position
            // TODO $ for parameters
            } else if (character === "'") {
                return self.parseStringTail(callback, "");
            } else if (character === "(") {
                return self.parseTuple(callback)(character);
            } else {
                return self.parseValue(callback, previous)(character);
            }
        };
    },

    parseNumber: function parseNumber(callback) {
        var self = this;
        return self.parseWord(function (word) {
            return callback({
                type: 'literal',
                value: +word
            });
        })
    },

    parseValue: function parseValue(callback, previous) {
        var self = this;
        return self.parseWord(function (identifier) {
            if (identifier) {
                return function (character) {
                    if (character === '{') {
                        return self.parseBlock(function (expression) {
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
                                        args: [previous]
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
                        })(character);
                    } else if (character === '(') {
                        return self.parseTuple(function (tuple) {
                            return self.parseTail(callback, {
                                type: identifier,
                                args: [previous].concat(tuple.args)
                            });
                        }, previous)(character);
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
                        })(character);
                    }
                };
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
        return self.parseBlockBegin(function (begin) {
            if (begin) {
                return self.parseExpression(function (expression) {
                    return self.parseBlockEnd(function (end, loc) {
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
    },

    parseTuple: function (callback) {
        var self = this;
        return self.parseTupleBegin(function (begin) {
            if (begin) {
                return self.parseTupleInternal(function (args) {
                    return self.parseTupleEnd(function (end, loc) {
                        if (end) {
                            return callback({
                                type: "tuple",
                                args: args
                            });
                        } else {
                            var error = new Error("Expected \")\"");
                            error.loc = loc;
                            throw error;
                        }
                    });
                });
            } else {
                return callback();
            }
        });
    },

    parseTupleInternal: function (callback, args) {
        var self = this;
        args = args || [];
        return function (character) {
            if (character === ")") {
                return callback(args)(character);
            } else {
                return self.parseExpression(function (expression) {
                    args.push(expression);
                    return function (character) {
                        if (character === ",") {
                            return self.skipWhiteSpace(function () {
                                return self.parseTupleInternal(callback, args);
                            });
                        } else {
                            return callback(args)(character);
                        }
                    };
                })(character);
            }
        };
    }

};

parse.semantics.grammar();

function identity(x) { return x }

