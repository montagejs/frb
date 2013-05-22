
var parse = require("../parse");
var compile = require("../compile-observer");
var Scope = require("../scope");
var cases = require("./evaluate");

describe("observe", function () {
    cases.forEach(function (test) {
        it(
            "should observe initial value of " + JSON.stringify(test.path) +
            " with " + JSON.stringify(test.input),
            function () {
                var syntax = parse(test.path);
                var observe = compile(syntax);
                var output;
                var cancel = observe(function (initial) {
                    output = initial;
                }, new Scope(
                    test.input,
                    null,
                    test.parameters,
                    test.document,
                    test.components
                ));
                cancel();
                if (Array.isArray(output)) {
                    output = output.slice(); // to ditch observable prototype
                }
                expect(output).toEqual(test.output);
            }
        );
    });
});
