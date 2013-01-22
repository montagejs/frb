var Bindings = require("../bindings");

describe("eval", function () {
    it("should do evil", function () {

        var object = Bindings.defineBindings({}, {
            "result": {"<-": "&eval(path)"}
        });

        expect(object.result).toBe();

        object.path = "x + 2";
        expect(object.result).toBe();

        object.x = 2;
        expect(object.result).toBe(4);

    });
});

