
var Bindings = require("..");

describe("defined binding", function () {

    it("should bind defined", function () {
        var object = Bindings.defineBindings({
        }, {
            "defined": {
                "<->": "property.defined()"
            }
        });
        expect(object.property).toBe(undefined);
        expect(object.defined).toBeFalsy();

        object.property = 10;
        expect(object.property).toBe(10);
        expect(object.defined).toBeTruthy();

        object.defined = false;
        expect(object.property).toBe(undefined);
    });

});
