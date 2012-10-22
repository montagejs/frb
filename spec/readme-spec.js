
var Bindings = require("../bindings");
var bind = require("../bind");
var Frb = require("..");

Error.stackTraceLimit = 100;

describe("Tutorial", function () {

    it("1", function () {
        // mock
        var document = {body: {innerHTML: ""}};

        var model = {content: "Hello, World!"};
        var cancelBinding = bind(document, "body.innerHTML", {
            "<-": "content",
            "source": model
        });

        // continued
        model.content = "Farewell.";
        expect(document.body.innerHTML).toBe("Farewell.");

        // continued
        cancelBinding();
        model.content = "Hello again!"; // doesn't take
        expect(document.body.innerHTML).toBe("Farewell.");
    });

    it("2", function () {

        var object = {};
        var cancel = bind(object, "foo", {
            "<->": "bar"
        });

        // <-
        object.bar = 10;
        expect(object.foo).toBe(10);

        // ->
        object.foo = 20;
        expect(object.bar).toBe(20);
    });

    it("3", function () {
        var object = {foo: 10, bar: 20};
        var cancel = bind(object, "foo", {
            "<->": "bar"
        });
        expect(object.foo).toBe(20);
        expect(object.bar).toBe(20);
    });

    it("4", function () {
        var foo = {a: {b: 10}};
        var bar = {a: {b: 10}};
        var cancel = bind(foo, "a.b", {
            "<->": "a.b",
            source: bar
        });
        // <-
        bar.a.b = 20;
        expect(foo.a.b).toBe(20);
        // ->
        foo.a.b = 30;
        expect(bar.a.b).toBe(30);

        // continued
        var a = foo.a;
        expect(a.b).toBe(30); // from before

        foo.a = {}; // orphan a and replace
        foo.a.b = 40;
        // ->
        expect(bar.a.b).toBe(40); // updated

        bar.a.b = 50;
        // <-
        expect(foo.a.b).toBe(50); // new one updated
        expect(a.b).toBe(30); // from before it was orphaned
    });

    it("tuples", function () {
        var object = {array: [[1, 2, 3], [4, 5]]};
        bind(object, "summary", {"<-": "array.map{[length, sum()]}"});
        expect(object.summary).toEqual([
            [3, 6],
            [2, 9]
        ]);
    });

    it("records", function () {
        var object = {array: [[1, 2, 3], [4, 5]]};
        bind(object, "summary", {
            "<-": "array.map{{length: length, sum: sum()}}"
        });
        expect(object.summary).toEqual([
            {length: 3, sum: 6},
            {length: 2, sum: 9}
        ]);
    });

    it("parameters", function () {
        var object = {a: 10, b: 20, c: 30};
        bind(object, "foo", {
            "<-": "[$a, $b, $c]",
            parameters: object
        });
        expect(object.foo).toEqual([10, 20, 30]);
        // continued...
        object.a = 0;
        object.b = 1;
        object.c = 2;
        expect(object.foo).toEqual([0, 1, 2]);
        // continued...
        var object = {};
        bind(object, "ten", {"<-": "$", parameters: 10});
        expect(object.ten).toEqual(10);
    });

    it("negation", function () {
        var caesar = {toBe: false};
        bind(caesar, "notToBe", {"<->": "!toBe"});
        expect(caesar.toBe).toEqual(false);
        expect(caesar.notToBe).toEqual(true);

        caesar.notToBe = false;
        expect(caesar.toBe).toEqual(true);
    });

});


describe("declarations", function () {
    it("should work", function () {

        // create an object
        var object = Bindings.defineBindings({ // prototype
            // simple properties
            foo: 0,
            graph: [
                {numbers: [1,2,3]},
                {numbers: [4,5,6]}
            ]
        }, {
            // extended property descriptors
            bar: {"<->": "foo", enumerable: false},
            numbers: {"<-": "graph.map{numbers}.flatten()"},
            sum: {"<-": "numbers.sum()"},
            reversed: {"<-": "numbers.reversed()"}
        });

        expect(object.bar).toEqual(object.foo);
        object.bar = 10;
        expect(object.bar).toEqual(object.foo);
        expect.foo = 20;
        expect(object.bar).toEqual(object.foo);

        // note that the identity of the bound numbers array never
        // changes, because all of the changes to that array are
        // incrementally updated
        var numbers = object.numbers;

        // first computation
        expect(object.sum).toEqual(21);

        // adds an element to graph,
        // which pushes [7, 8, 9] to "graph.map{numbers}",
        // which splices [7, 8, 9] to the end of
        //  "graph.map{numbers}.flatten()",
        // which increments "sum()" by [7, 8, 9].sum()
        object.graph.push({numbers: [7, 8, 9]});
        expect(object.sum).toEqual(45);

        // splices [1] to the beginning of [1, 2, 3],
        // which splices [1] to the beginning of "...flatten()"
        // which increments "sum()" by [1].sum()
        object.graph[0].numbers.unshift(1);
        expect(object.sum).toEqual(46);

        // cancels the entire observer hierarchy, then attaches
        //  listeners to the new one.  updates the sum.
        object.graph = [{numbers: [1,2,3]}];
        expect(object.sum).toEqual(6);

        expect(object.reversed).toEqual([3, 2, 1]);

        expect(object.numbers).toBe(numbers) // still the same object

        Frb.cancelBindings(object); // cancels all bindings on this object and
        // their transitive observers and event listeners as deep as
        // they go

    });
});

describe("Bindings", function () {

    it("Bindings", function () {
        var target = Bindings.defineBindings({}, {
            "fahrenheit": {"<->": "celsius * 1.8 + 32"},
            "celsius": {"<->": "kelvin - 272.15"}
        });
        target.celsius = 0;
        expect(target.fahrenheit).toEqual(32);
        expect(target.kelvin).toEqual(272.15);
    });

    it("Binding Descriptors", function () {
        var document = {body: {classList: []}};

        var object = Bindings.defineBindings({
            darkMode: false,
            document: document
        }, {
            "document.body.classList.has('dark')": {
                "<-": "darkMode"
            }
        });

        // continued
        Bindings.cancelBindings(object);
        expect(Bindings.getBindings(object)).toEqual({});
    });

    it("Converters", function () {
        Bindings.defineBindings({
            a: 10
        }, {
            b: {
                "<-": "a",
                convert: function (a) {
                    return a * 2;
                },
                revert: function (b) {
                    return a / 2;
                }
            }
        });

        // continue
        Bindings.defineBindings({
            a: 10
        }, {
            b: {
                "<-": "a",
                converter: {
                    factor: 2,
                    convert: function (a) {
                        return a * this.factor;
                    },
                    revert: function (b) {
                        return a / this.factor;
                    }
                }
            }
        });
    });

    it("Computed Properties", function () {
        /*
        // preamble
        var window = {location: {search: ""}};

        Bindings.defineBindings({
            window: window,
            form: {
                q: "",
                charset: "utf-8"
            }
        }, {
            queryString: {
                args: ["form.q", "form.charset"],
                compute: function (q, charset) {
                    return "?" + QS.stringify({
                        q: q,
                        charset: charset
                    });
                }
            },
            "window.location.search": {
                "<-": "queryString"
            }
        });
        */
    });

    it("Bind", function () {

        var bind = require("../bind");

        var source = [{numbers: [1,2,3]}, {numbers: [4,5,6]}];
        var target = {};
        var cancel = bind(target, "summary", {
            "<-": "map{[numbers.sum(), numbers.average()]}",
            source: source
        });

        expect(target.summary).toEqual([
            [6, 2],
            [15, 5]
        ]);

        cancel();

    });
});

describe("observe", function () {
    it("should work", function () {

        var observe = require("../observe");

        var source = [1, 2, 3];
        var sum;
        var cancel = observe(source, "sum()", function (newSum) {
            sum = newSum;
        });

        expect(sum).toBe(6);

        source.push(4);
        expect(sum).toBe(10);

        source.unshift(0); // no change
        expect(sum).toBe(10);

        cancel();
        source.splice(0, source.length); // would change
        expect(sum).toBe(10);

    });

    it("should demonstrate descriptors", function () {
        var observe = require("../observe");

        var object = {};
        var cancel = observe(object, "array", {
            change: function (value) {
                // may return a cancel function for a nested observer
            },
            parameters: {},
            beforeChange: false,
            contentChange: true
        });

        object.array = []; // emits []
        object.array.push(10); // emits [10]
    });

});

describe("compile", function () {
    it("should work", function () {
        var compute = require("../compute");

        var source = {operands: [10, 20]};
        var target = {};
        var cancel = compute(target, "sum", {
            source: source,
            args: ["operands.0", "operands.1"],
            compute: function (a, b) {
                return a + b;
            }
        });

        expect(target.sum).toEqual(30);

        source.operands.set(1, 30);
        expect(target.sum).toEqual(40);
    });
});

describe("enmerate", function () {
    it("should work", function () {
        var object = {letters: ['a', 'b', 'c', 'd']};
        bind(object, "lettersAtEvenIndicies", {
            "<-": "letters.enumerate().filter{!(index % 2)}.map{value}"
        });
        expect(object.lettersAtEvenIndicies).toEqual(['a', 'c']);
        object.letters.shift();
        expect(object.lettersAtEvenIndicies).toEqual(['b', 'd']);
    });
});
