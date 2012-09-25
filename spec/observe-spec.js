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

    it("should observe a property before it changes", function () {
        var spy = jasmine.createSpy();
        var object = {};
        var cancel = observe(object, 'a', {
            set: function (value) {
                expect(value).toBe(undefined);
                spy();
            },
            beforeChange: true
        });
        object.a = 10;
        expect(spy).toHaveBeenCalled();
    });

    it("should observe incremental changes", function () {
        var spy = jasmine.createSpy();
        var object = {};
        var cancel = observe(object, 'array', {
            set: function (array) {
                spy(array.slice());
            },
            contentChange: true
        });
        object.array = [];
        object.array.push(10);
        object.array.pop();
        object.array = [];
        cancel();
        object.array = [10];
        expect(spy.argsForCall).toEqual([
            [[]],
            [[10]],
            [[]],
            [[]]
        ]);
    });

    it("should pass content-less values through content-change-observer", function () {
        var spy = jasmine.createSpy();
        var object = {};
        var cancel = observe(object, 'array', {
            set: function (array) {
                spy(array);
            },
            contentChange: true
        });
        object.array = 10;
        expect(spy.argsForCall).toEqual([
            [10]
        ]);
    });

});
