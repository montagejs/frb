
var Bindings = require("../bindings");

describe("two way bindings with range content on both sides", function () {

    it("right to left should propagate on assignment", function () {

        var object = Bindings.defineBindings({
        }, {
            "yin.rangeContent()": {"<->": "yang.rangeContent()"}
        });

        object.yang = [1];
        expect(object.yin.slice()).toEqual([1]);

    });

    it("left to right should propagate on assignment", function () {

        var object = Bindings.defineBindings({
        }, {
            "yin.rangeContent()": {"<->": "yang.rangeContent()"}
        });

        object.yin = [1];
        expect(object.yang.slice()).toEqual([1]);

    });

    it("left to right should propagate on assignment overriding initial value", function () {

        var object = Bindings.defineBindings({
            yin: []
        }, {
            "yin.rangeContent()": {"<->": "yang.rangeContent()"}
        });

        object.yin = [1];
        expect(object.yang.slice()).toEqual([1]);

    });

    it("left to right should propagate on assignment overriding initial values on both sides", function () {

        var object = Bindings.defineBindings({
            yin: [],
            yang: []
        }, {
            "yin.rangeContent()": {"<->": "yang.rangeContent()"}
        });

        object.yin = [1];
        expect(object.yang.slice()).toEqual([1]);

    });

    it("range content changes should propagate left to right", function () {

        var object = Bindings.defineBindings({
            yin: [],
            yang: []
        }, {
            "yin.rangeContent()": {"<->": "yang.rangeContent()"}
        });

        object.yin.push(1);
        expect(object.yang.slice()).toEqual([1]);

    });

    it("range content changes should propagate right to left", function () {

        var object = Bindings.defineBindings({
            yin: [],
            yang: []
        }, {
            "yin.rangeContent()": {"<->": "yang.rangeContent()"}
        });

        object.yang.push(1);
        expect(object.yin.slice()).toEqual([1]);
    });

    it("right to left should precede left to right", function () {

        var object = Bindings.defineBindings({
            yin: [],
            yang: [1, 2, 3]
        }, {
            "yin.rangeContent()": {"<->": "yang.rangeContent()"}
        });

        expect(object.yin.slice()).toEqual([1, 2, 3]);

        object.yang = ['a', 'b', 'c'];
        expect(object.yin.slice()).toEqual(['a', 'b', 'c']);

    });

});


