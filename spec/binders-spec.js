
var Binders = require("../binders");
var Bindings = require("../bindings");
var Observers = require("../observers");
var Scope = require("../scope");

describe("makePropertyBinder", function () {
    it("should work", function () {
        var source = {a: 10};
        var target = {};
        var bind = Binders.makePropertyBinder(
            Observers.observeValue,
            Observers.makeLiteralObserver("a")
        );
        var observe = Observers.makePropertyObserver(
            Observers.observeValue,
            Observers.makeLiteralObserver("a")
        );
        var cancel = bind(
            observe,
            new Scope(source),
            new Scope(target),
            {}
        );
        expect(target.a).toEqual(source.a);
    });
});

describe("makeOneBinder", function () {
    it("should work", function () {
        var o = Bindings.defineBindings({
            items: [1, 2, 3],
        }, {
            item: { "<->": "items.one()" }
        });

        expect(o.items).toEqual([1, 2, 3]);
        expect(o.item).toBe(1);

        o.item = 3;
        expect(o.items).toEqual([3]);

    });
});
