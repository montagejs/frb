var Bindings = require("..");

describe("reverse binding", function () {

    it("should override initial value", function () {
        var object = {foo: 42, bar: 0};
        Bindings.defineBinding(object, "foo", { "<->": "bar" });

        expect(object.bar).toEqual(0);
        expect(object.foo).toEqual(0);
    });

    it("should reflect first member change", function() {
        var object = {foo: 42, bar: 0};
        Bindings.defineBinding(object, "foo", { "<->": "bar" });

        object.foo = 123;

        expect(object.bar).toEqual(123);
        expect(object.foo).toEqual(123);
    });

    it("should reflect second member change", function() {
        var object = {foo: 42, bar: 0};
        Bindings.defineBinding(object, "foo", { "<->": "bar" });

        object.bar = 123;

        expect(object.bar).toEqual(123);
        expect(object.foo).toEqual(123);
    });

    it("should unset first member if second member is undefined", function() {
        var object = {foo: 42};
        Bindings.defineBinding(object, "foo", { "<->": "bar", trace: true });

        expect(object.bar).toBeUndefined();
        expect(object.foo).toBeUndefined();
    });

});
