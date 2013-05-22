
var parse = require("../parse");
var evaluate = require("../evaluate");
var Scope = require("../scope");
var cases = require("./evaluate");

describe("evaluate", function () {
    cases.forEach(function (test) {
        it(
            "should evaluate " + JSON.stringify(test.path) +
            " of " + JSON.stringify(test.input),
            function () {
                var output = evaluate(
                    test.path,
                    test.input,
                    test.parameters,
                    test.document,
                    test.components
                );
                expect(output).toEqual(test.output);
            }
        );
    });

    it("should allow extensible polymorphic overrides", function () {

        var isBound = evaluate("a.isBound()", {
            a: {
                isBound: function () {
                    return true;
                }
            }
        });
        expect(isBound).toBe(true);

    });

});

