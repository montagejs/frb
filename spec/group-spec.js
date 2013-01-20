
var Bindings = require("../bindings");

describe("group block", function () {

    var alice = {name: "Alice", gender: "female"};
    var bob = {name: "Bob", gender: "male"};
    var charlie = {name: "Charlie", gender: "male"};
    var doris = {name: "Doris", gender: "female"};
    var edith = {name: "Edith", gender: "female"};
    var fred = {name: "Fred", gender: "male"};

    var object = {
            folks: [alice, bob, charlie, doris, edith, fred]
    };

    it("should define and initialize a group binding", function () {

        Bindings.defineBinding(object, "folksByGender", {
            "<-": "folks.group{gender}"
        });

        expect(object.folksByGender).toEqual([
            ["female", [
                alice,
                doris,
                edith
            ]],
            ["male", [
                bob,
                charlie,
                fred
            ]]
        ]);

    });

    it("should respond to a property change affecting the relation", function () {

        charlie.gender = "female";

        expect(object.folksByGender).toEqual([
            ["female", [
                alice,
                doris,
                edith,
                charlie
            ]],
            ["male", [
                bob,
                fred
            ]]
        ]);

    });

    it("should respond to the removal of an iteration", function () {

        object.folks.pop();

        expect(object.folksByGender).toEqual([
            ["female", [
                alice,
                doris,
                edith,
                charlie
            ]],
            ["male", [
                bob
            ]]
        ]);

    });


    it("should resopnd to the insertion of a new iteration", function () {
        object.folks.unshift(fred);

        expect(object.folksByGender).toEqual([
            ["female", [
                alice,
                doris,
                edith,
                charlie
            ]],
            ["male", [
                bob,
                fred
            ]]
        ]);

    });

});

