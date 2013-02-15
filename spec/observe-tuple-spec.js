
var Observers = require("../observers");

describe("tuple", function () {

    it("should react to changes to each value", function () {

        var tuple;
        var object = {a: 1, b: 2, c: 3};

        var cancel = Observers.makeTupleObserver(
            Observers.makePropertyObserver(
                Observers.makeLiteralObserver(object),
                Observers.makeLiteralObserver('a')
            ),
            Observers.makePropertyObserver(
                Observers.makeLiteralObserver(object),
                Observers.makeLiteralObserver('b')
            ),
            Observers.makePropertyObserver(
                Observers.makeLiteralObserver(object),
                Observers.makeLiteralObserver('c')
            )
        )(function (_tuple) {
            tuple = _tuple;
        });

        expect(tuple).toEqual([1, 2, 3]);
        object.a = 0;
        expect(tuple).toEqual([0, 2, 3]);
        cancel();
        object.a = 1;
        expect(tuple).toEqual([0, 2, 3]);

    });

});
