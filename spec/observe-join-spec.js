
var Bindings = require("../bindings");

describe("join", function () {

    it("should observe changes to the input", function () {

        var object = Bindings.defineBindings({}, {
            joined: {"<-": "terms.join(delimiter)"}
        });

        object.terms = ['a', 'b', 'c'];
        expect(object.joined).toBe(undefined);

        object.terms = null;
        object.delimiter = ', ';
        expect(object.joined).toBe(undefined);

        object.terms = ['a', 'b', 'c'];
        expect(object.joined).toBe("a, b, c");

        object.terms.push('d');
        expect(object.joined).toBe("a, b, c, d");

        object.terms.clear();
        expect(object.joined).toBe("");
    });

    it("should join on null string if no argument given", function () {

        var object = Bindings.defineBindings({}, {
            joined: {"<-": "terms.join()"}
        });

        expect(object.joined).toBe(undefined);

        object.terms = ['a', 'b', 'c'];
        expect(object.joined).toBe('abc');

        object.terms.push('d');
        expect(object.joined).toBe("abcd");

        object.terms.clear();
        expect(object.joined).toBe("");
    });

});

