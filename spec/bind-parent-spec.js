
var Bindings = require("..");

describe("Binding parent and with", function () {

    it("should work", function () {
        var object = Bindings.defineBindings({
            a: { x: 1 },
            b: { x: 2 },
            c: {}
        }, {
            "a.(^b.(^^c.ax))": {"<->": "a.(^b.(^x))"},
            "c.bx": {"<->": "a.(^b.(x))"}
        });

        expect(object.c.ax).toEqual(1);
        expect(object.c.bx).toBe(2);

        object.c.ax = 10;
        expect(object.a.x).toBe(10);

        object.c.bx = 20;
        expect(object.b.x).toBe(20);
    });
});

