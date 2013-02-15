
var assign = require("../assign");
var Map = require("collections/map");

describe("assign", function () {

    it("should assign to a property", function () {
        var object = {a: {b: {c: {}}}};
        assign(object, "a.b.c.d", 10);
        expect(object.a.b.c.d).toBe(10);
        expect(object).toEqual({a: {b: {c: {d: 10}}}});
    });

    it("should be able to assign to a key of a map", function () {
        var object = {map: Map()};
        assign(object, "map.get($key)", 10, {key: 'key'});
        expect(object.map.get('key')).toBe(10);
    });

    it("should be able to assign to whether a collection has a value", function () {
        var object = {array: []};
        assign(object, "array.has(1)", true);
        expect(object.array).toEqual([1]);
        assign(object, "array.has(1)", false);
        expect(object.array).toEqual([]);
    });

    it("should be able to assign to equality", function () {
        var object = {a: 10};
        assign(object, "a==20", true);
        expect(object.a).toBe(20);
        assign(object, "a==20", false);
        expect(object.a).toBe(20); // still, since the value could be arbitrary
    });

    it("should be able to assign to consequent or alternate of a ternary operator", function () {
        var object = {a: 10, b: 20};
        assign(object, "guard == 'a' ? a : b", 30);
        expect(object).toEqual({a: 10, b: 20});
        object.guard = '';
        assign(object, "guard == 'a' ? a : b", 30);
        expect(object.b).toBe(30);
        object.guard = 'a';
        assign(object, "guard == 'a' ? a : b", 40);
        expect(object.a).toBe(40);
    });

    it("should be able to assign into the content of a ranged collection", function () {
        var object = {};
        assign(object, "array.rangeContent()", [1, 2, 3]);
        expect(object).toEqual({});
        object.array = [];
        assign(object, "array.rangeContent()", [1, 2, 3]);
        expect(object.array).toEqual([1, 2, 3]);
    });

    it("should be able to assign into the content of a mapped array", function () {
        var object = {};
        assign(object, "array.mapContent()", [1, 2, 3]);
        expect(object).toEqual({});
        object.array = [];
        assign(object, "array.mapContent()", [1, 2, 3]);
        expect(object.array).toEqual([1, 2, 3]);
    });

    it("should be able to assign into the content of a map", function () {
        var object = {};
        assign(object, "map.mapContent()", Map({a: 10}));
        expect(object).toEqual({});
        object.map = Map();
        assign(object, "map.mapContent()", Map({a: 10, b: 20}));
        expect(object.map.toObject()).toEqual({a: 10, b: 20});
    });

    it("should be able to assign in reverse order", function () {
        var object = {array: []};
        assign(object, "array.reversed()", [1, 2, 3]);
        expect(object.array).toEqual([3, 2, 1]);
    });

});

