
var bind = require("../bind");

describe("observe enumeration", function () {

    it("should work", function () {
        var input = ['a', 'b', 'c'];
        var output = [];
        var cancel = bind(output, "*", {
            "<-": "enumerate()",
            source: input
        });
        var a = output[0];
        var b = output[1];
        var c = output[2];
        expect(output).toEqual([
            {index: 0, value: 'a'},
            {index: 1, value: 'b'},
            {index: 2, value: 'c'}
        ]);
        input.unshift('z');
        expect(output).toEqual([
            {index: 0, value: 'z'},
            {index: 1, value: 'a'},
            {index: 2, value: 'b'},
            {index: 3, value: 'c'}
        ]);
        expect(a.index).toEqual(1);
    });

});

