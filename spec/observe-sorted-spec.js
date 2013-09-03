
var Bindings = require("../bindings");

describe("sorted block observer", function () {

    it("", function () {

        var array = [
            {key: 0, value: 'c'},
            {key: 1, value: 'b'},
            {key: 2, value: 'a'}
        ];

        var object = Bindings.defineBindings({
            array: array
        }, {
            sorted: {"<-": "array.sorted{value}"}
        });

        expect(object.sorted).toEqual([array[2], array[1], array[0]]);

        array[1].value = 'd';
        expect(object.sorted).toEqual([array[2], array[0], array[1]]);

        array[1].value = 'd';
        expect(object.sorted).toEqual([array[2], array[0], array[1]]);
    });

    it("sorts objects missing the sorted property", function () {

        var array = [
            {key: 0},
            {key: 1},
            {key: 2}
        ];

        var object = Bindings.defineBindings({
            array: array
        }, {
            sorted: {"<-": "array.sorted{value}"}
        });

        expect(object.sorted.length).toEqual(3);

        array[2].value = 'a';
        array[1].value = 'b';
        array[0].value = 'c';

        expect(object.sorted.length).toEqual(3);
        expect(object.sorted).toEqual([array[2], array[1], array[0]]);
    });

});

