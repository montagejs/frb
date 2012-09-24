
describe("declarations", function () {
    it("should work", function () {

        var Frb = require("..");

        // create an object
        var object = Frb.create(null, { // prototype
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

describe("bindings", function () {
    it("should work", function () {

        var bind = require("../bind");

        var source = [{numbers: [1,2,3]}, {numbers: [4,5,6]}];
        var target = {};
        var cancel = bind(target, "summary", {
            "<-": "map{(numbers.sum(), numbers.average())}",
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
            set: function (value) {
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

