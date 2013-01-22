var Bindings = require("../bindings");

describe("evaluate", function () {
    it("should do evil", function () {

        var object = Bindings.defineBindings({}, {
            "result": {"<-": "&evaluate(path)"}
        });

        expect(object.result).toBe();

        object.path = "x + 2";
        expect(object.result).toBe();

        object.x = 2;
        expect(object.result).toBe(4);

    });
});

