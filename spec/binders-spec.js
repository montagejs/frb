
var Binders = require("../binders");
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

