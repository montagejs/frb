var observe = require("../observe");

describe("observe", function () {

    it("should observe a property", function () {
        var spy = jasmine.createSpy();
        var object = {};

        var cancel = observe(object, "a", spy);
        expect(spy.argsForCall).toEqual([
            [undefined, 'a', object],
        ]);

        object.a = 10;
        expect(spy.argsForCall).toEqual([
            [undefined, 'a', object],
            [10, 'a', object]
        ]);

        cancel();
        object.b = 20;
        expect(spy.argsForCall).toEqual([
            [undefined, 'a', object],
            [10, 'a', object]
        ]);

    });

});
