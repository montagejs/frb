
var Bindings = require("..");
var Map = require("collections/map");

describe("bindings", function () {

    describe("computed properties", function () {

        describe("string", function () {
            it("should propagate related bindings", function () {

                var object = Bindings.defineBindings({
                    foo: 10,
                    bar: 20
                }, {
                    baz: {
                        args: ["foo", "bar"],
                        compute: function (foo, bar) {
                            return foo + bar;
                        }
                    },
                    qux: {
                        "<-": "baz"
                    }
                });

                expect(object.qux).toEqual(30);

                object.bar = 30;
                expect(object.qux).toEqual(40);

            });
        });

        describe("array", function () {

            it("should propagate related bindings", function () {

                var object = Bindings.defineBindings({
                    foo: 10,
                    bar: 20
                }, {
                    baz: {
                        args: ["foo", "bar"],
                        compute: function (foo, bar) {
                            return foo + bar;
                        }
                    },
                    qux: {
                        "<-": "baz"
                    }
                });

                expect(object.qux).toEqual(30);

                object.bar = 30;
                expect(object.qux).toEqual(40);

            });

        });

    });

    describe("exclusive options", function () {

        it("should work", function () {

            var bindings = Bindings.defineBindings({
                options: [],
                off: true,
                on: false
            }, {

                "!options.has('feature')": {
                    "<->": "off"
                },
                "options.has('feature')": {
                    "<->": "on"
                }
            });

            expect(bindings.options.slice()).toEqual([]);

            bindings.on = true;
            expect(bindings.options.slice()).toEqual(['feature']);
            bindings.off = true;
            expect(bindings.options.slice()).toEqual([]);

        });

        it("should work", function () {

            var bindings = Bindings.defineBindings({
                options: [],
                off: true,
                on: false
            }, {
                "options.has('feature')": {
                    "<-": "!off"
                },
                "options.has('feature')": {
                    "<-": "on"
                },
                "on": {"<->": "!off"}
            });

            expect(bindings.options.slice()).toEqual([]);

            bindings.on = true;
            expect(bindings.options.slice()).toEqual(['feature']);
            bindings.off = true;
            expect(bindings.options.slice()).toEqual([]);

        });

    });

    it("should not update an active property", function () {

        var bindings = Bindings.defineBindings({}, {
            "output": {"<->": "input",
                convert: function (value) {
                    return Number(value).toFixed(1);
                },
                revert: function (value) {
                    return Number(value).toFixed(1);
                }
            }
        });

        bindings.input = "0";
        expect(bindings.input).toEqual("0");
        expect(bindings.output).toEqual("0.0");

        bindings.input = "1";
        expect(bindings.input).toEqual("1");
        expect(bindings.output).toEqual("1.0");

    });

    it("should bind elements by id", function () {
        var elements = {
            foo: {checked: true}
        };
        var bindings = Bindings.defineBindings({}, {
            "bar": {"<->": "#foo.checked"}
        }, {
            document: {
                getElementById: function (id) {
                    return elements[id];
                }
            }
        });
        expect(bindings.bar).toBe(true);
    });

    it("should bind components by label", function () {
        var components = {
            foo: {checked: true}
        };
        var bindings = Bindings.defineBindings({}, {
            "bar": {"<->": "@foo.checked"}
        }, {
            serialization: {
                getObjectByLabel: function (label) {
                    return components[label];
                }
            }
        });
        expect(bindings.bar).toBe(true);
    });

    it("should sort by relation", function () {
        var bindings = Bindings.defineBindings({
            objects: [{foo: 10}, {foo: 30}, {foo: 20}]
        }, {
            sorted: {"<-": "objects.sorted{foo}"}
        });
        expect(bindings.sorted).toEqual([
            {foo: 10},
            {foo: 20},
            {foo: 30}
        ]);
        bindings.objects.unshift({foo: 40});
        expect(bindings.sorted).toEqual([
            {foo: 10},
            {foo: 20},
            {foo: 30},
            {foo: 40}
        ]);
    });

    it("should handle an every block", function () {
        var object = Bindings.defineBindings({
            array: [1, 2, 3, 4, 5]
        }, {
            everyGreaterThanZero: {
                "<-": "array.every{>0}"
            }
        });
        expect(object.everyGreaterThanZero).toBe(true);

        object.array.unshift(0);
        expect(object.everyGreaterThanZero).toBe(false);

        Bindings.cancelBindings(object);
        object.array.shift();
        expect(object.everyGreaterThanZero).toBe(false);
    });

    it("should handle a some block", function () {
        var object = Bindings.defineBindings({
            array: [1, 2, 3, 4, 5]
        }, {
            someEqualZero: {
                "<-": "array.some{==0}"
            }
        });
        expect(object.someEqualZero).toBe(false);

        object.array.unshift(0);
        expect(object.someEqualZero).toBe(true);

        object.array.shift();
        expect(object.someEqualZero).toBe(false);

        Bindings.cancelBindings(object);
        object.array.unshift(0);
        expect(object.someEqualZero).toBe(false);
    });

    it("should observe undefined when an array retreats behind an observed index", function () {
        var object = Bindings.defineBindings({
            bar: ["a", "b", "c"]
        }, {
            foo: {"<-": "bar.2"}
        });
        object.bar.pop();
        expect(object.foo).toBe(undefined);
        expect(object.bar.length).toBe(2);
    });

    it("should understand undefined values in a some block", function () {
        var object = Bindings.defineBindings({
            array: []
        }, {
            some: {"<-": "array.some{a.b}"}
        });
        expect(object.some).toBe(false);
        object.array.push({a: {b: 1}});
        expect(object.some).toBe(true);
        object.array.set(0, {a: null});
        expect(object.some).toBe(false);
    });

    it("should bind a property chain including a numeric property", function () {
        var object = Bindings.defineBindings({
        }, {
            "baz": {"<-": "foo.0.bar"}
        });
        expect(object.baz).toBe(undefined);
        object.foo = [{bar: 1}];
        expect(object.baz).toBe(1);
    });

    it("should handle bidirectional string to number bindings", function () {
        var object = Bindings.defineBindings({
        }, {
            "+n": {"<->": "'' + s"}
        });
        expect(object.n).toBe(undefined);
        expect(object.s).toBe(undefined);

        object.n = 10;
        expect(object.s).toBe("10");

        object.s = "20";
        expect(object.n).toBe(20);

        object.n = undefined;
        expect(object.s).toBe(undefined);
    });

    it("should bind to a key in a map", function () {
        var object = {one: 1, two: 2};
        var map = Map();

        Bindings.defineBinding(map, "get('one')", {
            "<-": "one",
            source: object
        });

        expect(map.get('one')).toBe(1);
        object.one = 0;
        expect(map.get('one')).toBe(0);
    });

    it("should bind object literals to maps", function () {

        var object = Bindings.defineBinding({}, "map", {
            "<-": "object.toMap()"
        });
        expect(object.map.toObject()).toEqual({});

        object.object = {a: 10};
        expect(object.map.toObject()).toEqual({a: 10});

        object.object.a = 20;
        expect(object.map.toObject()).toEqual({a: 20});

        object.object.b = 30; // not observable
        expect(object.map.toObject()).toEqual({a: 20});

        object.object = {a: 20, b: 30};
        expect(object.map.toObject()).toEqual({a: 20, b: 30});

    });

    it("should watch variable property keys", function () {

        var object = Bindings.defineBinding({}, "value", {
            "<-": "property(property)"
        });
        expect(object.value).toBe(undefined);

        object.property = 'a';
        expect(object.value).toBe(undefined);

        object.a = 10;
        expect(object.value).toBe(10);

        object.property = 'b';
        expect(object.value).toBe(undefined);

        object.b = 20;
        expect(object.value).toBe(20);

        object.property = 'a';
        expect(object.value).toBe(10);

    });

    it("should watch arbitrary pure polymorphic functions", function () {
        var object = Bindings.defineBindings({
            distance: function (x, y) {
                return Math.pow(x * x + y * y, .5);
            }
        }, {
            "z": {
                "<-": "distance(x, y)"
            }
        });
        expect(object.z).toBe(undefined);
        object.x = 3;
        object.y = 4;
        expect(object.z).toBe(5);
        object.y = 3;
        expect(object.z).not.toBe(5);
        object.x = 4;
        expect(object.z).toBe(5);
    });

    it("should watch arbitrary observer functions", function () {

        var tick;

        var object = Bindings.defineBindings({
            observeFoo: function (emit, source, parameters, beforeChange) {
                tick = emit;
            }
        }, {
            bar: {"<-": "foo()"}
        });

        expect(object.bar).toBe(undefined);
        tick(10);
        expect(object.bar).toBe(10);

    });

    it("should watch arbitrary make observer functions", function () {

        var object = Bindings.defineBindings({
            makeSpecialAddObserver: function (observeA, observeB) {
                return function observeSpecialAdd(emit, source, parameters) {
                    return observeA(function (a) {
                        if (a == null) return emit(null);
                        return observeB(function (b) {
                            if (b == null) return emit(null);
                            return emit(a + b);
                        }, source, parameters);
                    }, source, parameters);
                };
            }
        }, {
            c: {"<-": "specialAdd(a, b)"}
        });

        expect(object.c).toBe(null);
        object.a = 2;
        expect(object.c).toBe(null);
        object.b = 3;
        expect(object.c).toBe(5);

    });

    it("should maintain the binding invariant...", function() {
        function Foo(value, controller) {
            this.value = value;
            this.selected = false;
            this.controller = controller;
            Bindings.defineBinding(this, "selected", {
                "<->": "controller.array.0 == value"
            });
        }

        var controller = {
                array: [null]
            },
            foo1 = new Foo("foo1", controller),
            foo2 = new Foo("foo2", controller);

        // only configuration where it fails: foo1 = true, foo2 = false
        foo1.selected = true;

        controller.array = [foo2.value];
        expect(controller.array.length).toBe(1);
        // controller.array.0 is now "foo1"
        expect(controller.array[0]).toBe(foo2.value);
        // foo1.selected is false
        expect(foo1.selected).toBe(false);
        // foo2.selected is false
        expect(foo2.selected).toBe(true);
    });

    it("should maintain the binding invariant... (non-array version)", function() {
        function Foo(value, controller) {
            this.value = value;
            this.selected = false;
            this.controller = controller;
            Bindings.defineBinding(this, "selected", {
                "<->": "controller.value == value"
            });
        }

        var controller = {
                value: null
            },
            foo1 = new Foo("foo1", controller),
            foo2 = new Foo("foo2", controller);

        foo1.selected = true;

        controller.value = foo2.value;
        expect(controller.value).toBe(foo2.value);
        expect(foo1.selected).toBe(false);
        expect(foo2.selected).toBe(true);
    });
});

