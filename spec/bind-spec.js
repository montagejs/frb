
var bind = require("../bind");

Error.stackTraceLimit = 100;

describe("bind", function () {

    describe("<-", function () {
        var source = {foo: {bar: {baz: 10}}};
        var target = {foo: {bar: {baz: undefined}}};

        var cancel = bind(target, "foo.bar.baz", {
            "<-": "foo.bar.baz",
            "source": source
        });

        it("initial", function () {
            expect(source.foo.bar.baz).toEqual(10);
            expect(target.foo.bar.baz).toEqual(10);
        });

    });

    describe("<->", function () {

        var object = {bar: 10};
        object.self = object;

        var cancel = bind(object, "self.foo", {"<->": "self.bar"});

        it("initial", function () {
            expect(object.foo).toBe(10);
            expect(object.bar).toBe(10);
        });

        it("<-", function () {
            object.bar = 20;
            expect(object.foo).toBe(20);
            expect(object.bar).toBe(20);
        });

        it("->", function () {
            object.foo = 30;
            expect(object.foo).toBe(30);
            expect(object.bar).toBe(30);
        });

        it("cancel", function () {
            cancel();
            expect(object.foo).toBe(30);
            expect(object.bar).toBe(30);
        });

        it("unbound after cancel", function () {
            object.foo = 10;
            expect(object.bar).toBe(30);
        });

    });

    describe("sum", function () {
        var object = {values: [1,2,3]};
        var cancel = bind(object, "sum", {"<-": "values.sum{}"});
        expect(object.sum).toBe(6);
        object.values.push(4);
        expect(object.sum).toBe(10);
        cancel();
        object.values.unshift();
        expect(object.sum).toBe(10);
    });

    describe("average", function () {
        var object = {values: [1,2,3]};
        var cancel = bind(object, "average", {"<-": "values.average{}"});
        expect(object.average).toBe(2);
        object.values.push(4);
        expect(object.average).toBe(2.5);
        cancel();
        object.values.unshift();
        expect(object.average).toBe(2.5);
    });

    describe("content", function () {
        var foo = [1, 2, 3];
        var bar = [];
        var object = {foo: foo, bar: bar};
        var cancel = bind(object, "bar.*", {"<->": "foo.*"});
        expect(object.bar.slice()).toEqual([1, 2, 3]);
        foo.push(4);
        bar.push(5);
        expect(object.foo.slice()).toEqual([1, 2, 3, 4, 5]);
        expect(object.bar.slice()).toEqual([1, 2, 3, 4, 5]);
        expect(object.foo).toBe(foo);
        expect(object.bar).toBe(bar);
    });

    describe("reversed", function () {
        var object = {foo: [1,2,3]};
        var cancel = bind(object, "bar", {"<-": "foo.reversed{}"});
        expect(object.bar).toEqual([3, 2, 1]);
        object.foo.push(4);
        expect(object.bar).toEqual([4, 3, 2, 1]);
        object.foo.swap(2, 0, ['a', 'b', 'c']);
        expect(object.bar).toEqual([4, 3, 'c', 'b', 'a', 2, 1]);
        cancel();
        object.foo.splice(2, 3);
        expect(object.bar).toEqual([4, 3, 'c', 'b', 'a', 2, 1]);
    });

    describe("reversed left hand side", function () {
        var object = {foo: [1,2,3]};
        var cancel = bind(object, "bar", {"<->": "foo.reversed()"});
        // object.bar has to be sliced since observable arrays are not equal to plain arrays in jasmine,
        // because of a differing prototype
        expect(object.bar.slice()).toEqual([3, 2, 1]);
        object.foo.push(4);
        expect(object.bar.slice()).toEqual([4, 3, 2, 1]);
        object.foo.swap(2, 0, ['a', 'b', 'c']);
        expect(object.bar.slice()).toEqual([4, 3, 'c', 'b', 'a', 2, 1]);
        object.bar.pop();
        expect(object.bar.slice()).toEqual([4, 3, 'c', 'b', 'a', 2]);
        expect(object.foo.slice()).toEqual([2, 'a', 'b', 'c', 3, 4]);
        cancel();
        object.foo.splice(2, 3);
        expect(object.bar.slice()).toEqual([4, 3, 'c', 'b', 'a', 2]);
    });

    describe("tuple", function () {
        var object = {a: 10, b: 20, c: 30};
        var cancel = bind(object, "d", {"<-": "(a,b,c)"});
        expect(object.d).toEqual([10, 20, 30]);
        cancel();
        object.c = 40;
        expect(object.d).toEqual([10, 20, 30]);
    });

    describe("record", function () {
        var object = {foo: 10, bar: 20};
        var cancel = bind(object, "record", {"<-": "{a: foo, b: bar}"});
        expect(object.record).toEqual({a: 10, b: 20});
        object.foo = 20;
        expect(object.record).toEqual({a: 20, b: 20});
        cancel();
        object.foo = 10;
        expect(object.record).toEqual({a: 20, b: 20});
    });

    describe("record map", function () {
        var object = {arrays: [[1, 2, 3], [4, 5, 6]]};
        var cancel = bind(object, "summaries", {
            "<-": "arrays.map{{length: length, sum: sum()}}"
        });
        expect(object.summaries).toEqual([
            {length: 3, sum: 6},
            {length: 3, sum: 15}
        ]);
        object.arrays.pop();
        expect(object.summaries).toEqual([
            {length: 3, sum: 6}
        ]);
        object.arrays[0].push(4);
        expect(object.summaries).toEqual([
            {length: 4, sum: 10}
        ]);
    });

    describe("literals", function () {
        var object = {};
        var cancel = bind(object, "literals", {"<-": "(#0, 'foo bar')"});
        expect(object.literals).toEqual([0, "foo bar"]);
    });

    describe("has", function () {
        var object = {set: [1, 2, 3], sought: 2};
        var cancel = bind(object, "has", {"<-": "set.has(sought)"});

        expect(object.has).toBe(true);
        expect(object.set.slice()).toEqual([1, 2, 3]);

        object.sought = 4;
        expect(object.has).toBe(false);
        expect(object.set.slice()).toEqual([1, 2, 3]);

        object.set.push(4);
        expect(object.has).toBe(true);
        expect(object.set.slice()).toEqual([1, 2, 3, 4]);

        object.set.pop();
        expect(object.has).toBe(false);
        expect(object.set.slice()).toEqual([1, 2, 3]);

        cancel();
        object.set.push(4);
        expect(object.has).toBe(false);
        expect(object.set.slice()).toEqual([1, 2, 3, 4]);
    });

    describe("has <-", function () {
        var object = {set: [1, 2, 3], sought: 2};
        var cancel = bind(object, "set.has(sought)", {"<->": "has"});

        expect(object.set.slice()).toEqual([1, 2, 3]);
        object.has = false;
        expect(object.set.slice()).toEqual([1, 3]);
        object.set.push(2);
        expect(object.has).toEqual(true);
        expect(object.set.slice()).toEqual([1, 3, 2]);

    });

    describe("map", function () {
        var object = {
            foo: [{bar: 10}, {bar: 20}, {bar: 30}]
        };
        var cancel = bind(object, "baz", {
            "<-": "foo.map{bar}"
        });
        expect(object.baz).toEqual([10, 20, 30]);
        object.foo.push({bar: 40});
        expect(object.baz).toEqual([10, 20, 30, 40]);
    });

    describe("flatten", function () {
        var object = {
            foo: [[1], [2, 3], [4]]
        };
        var cancel = bind(object, "baz", {
            "<-": "foo.flatten{}"
        });
        expect(object.baz).toEqual([1, 2, 3, 4]);

        object.foo.push([]);
        expect(object.baz).toEqual([1, 2, 3, 4]);

        object.foo.push([5, 6]);
        expect(object.baz).toEqual([1, 2, 3, 4, 5, 6]);

        object.foo[0].unshift(0);
        expect(object.baz).toEqual([0, 1, 2, 3, 4, 5, 6]);

        expect(object.foo[1].slice()).toEqual([2, 3]);
        object.foo.splice(1, 1);
        expect(object.baz).toEqual([0, 1, 4, 5, 6]);

        cancel();
        object.foo.pop();
        expect(object.baz).toEqual([0, 1, 4, 5, 6]);
    });

    describe("flatten map", function () {
        var object = {
            foo: [{bar: [1]}, {bar: [2, 3]}, {bar: [4]}]
        };
        var cancel = bind(object, "baz", {
            "<-": "foo.flatten{bar}"
        });
        expect(object.baz).toEqual([1, 2, 3, 4]);

        object.foo.push({bar: []});
        expect(object.baz).toEqual([1, 2, 3, 4]);

        object.foo.push({bar: [5, 6]});
        expect(object.baz).toEqual([1, 2, 3, 4, 5, 6]);

        object.foo[0].bar.unshift(0);
        expect(object.baz).toEqual([0, 1, 2, 3, 4, 5, 6]);

        expect(object.foo[1].bar.slice()).toEqual([2, 3]);
        object.foo.splice(1, 1);
        expect(object.baz).toEqual([0, 1, 4, 5, 6]);

        cancel();
        object.foo.pop();
        expect(object.baz).toEqual([0, 1, 4, 5, 6]);
    });

    describe("tree replacement", function () {
        var object = {qux: 10, foo: {bar: {baz: null}}};
        var cancel = bind(object, "foo.bar.baz", {"<->": "qux"});
        expect(object.foo.bar.baz).toEqual(10);
        object.foo = {bar: {baz: null}}; // gets overwritten by binder
        // (source to target precedes target to source) // TODO consider alts
        expect(object.foo.bar.baz).toEqual(10);
        object.qux = 20;
        expect(object.foo.bar.baz).toEqual(20);
        object.foo.bar.baz = 30;
        expect(object.qux).toEqual(30);
    });

    describe("parameters", function () {
        var object = {};
        var parameters = {a: 10, b: 20, c: 30};
        var source = [1, 2, 3];
        var cancel = bind(object, "foo", {
            "<-": "($a, $b, map($c))",
            parameters: parameters,
            source: source
        });
        expect(object.foo).toEqual([10, 20, [30, 30, 30]]);
        parameters.a = 0;
        expect(object.foo).toEqual([0, 20, [30, 30, 30]]);
        source.push(4);
        expect(object.foo).toEqual([0, 20, [30, 30, 30, 30]]);
    });

});

