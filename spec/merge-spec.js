
require("collections/shim");
var Merge = require("../merge");
var ot = Merge.ot;
var diff = Merge.diff;
var apply = Merge.apply;
var merge = Merge.merge;

var specs = [
    {
        name: "constraint",
        target: "abcde",
        source: "ace",
        ot: [
            ["retain", 1],
            ["delete", 1],
            ["retain", 1],
            ["delete", 1],
            ["retain", 1]
        ],
        diff: [
            // abcde
            [1, 1], // acde
            [2, 1] // ace
        ]
    },
    {
        name: "relaxation",
        target: "ace",
        source: "abcde",
        ot: [
            ["retain", 1],
            ["insert", 1],
            ["retain", 1],
            ["insert", 1],
            ["retain", 1]
        ],
        diff: [
            // ace
            [1, 0, "b"], // abce
            [3, 0, "d"] // abcde
        ]
    },
    {
        name: "duplication",
        target: "abc",
        source: "aabbcc",
        ot: [
            ["insert", 1],
            ["retain", 1],
            ["insert", 1],
            ["retain", 1],
            ["insert", 1],
            ["retain", 1]
        ],
        diff: [
            // abc
            [0, 0, "a"], // aabc
            [2, 0, "b"], // aabbc
            [4, 0, "c"]
        ]
    },
    {
        name: "de-duplication",
        target: "aabbcc",
        source: "abc",
        ot: [
            ["delete", 1],
            ["retain", 1],
            ["delete", 1],
            ["retain", 1],
            ["delete", 1],
            ["retain", 1]
        ],
        diff: [
            // aabbcc
            [0, 1], // abbcc
            [1, 1], // abcc
            [2, 1] // abc
        ]
    },
    {
        name: "reversal",
        target: "fedcba",
        source: "abcdef",
        ot: [
            ["delete", 5],
            ["retain", 1],
            ["insert", 5]
        ],
        diff: [
            // fedcba
            [0, 5], // a
            [1, 0, "bcdef"] // abcdef
        ]
    },
    {
        name: "complete replacement",
        target: "aaa",
        source: "bbb",
        ot: [
            ["delete", 3],
            ["insert", 3]
        ],
        diff: [
            // aaa
            [0, 3, "bbb"] // bbb
        ]
    },
    {
        name: "complete retention",
        target: "aaa",
        source: "aaa",
        ot: [
            ["retain", 3],
        ],
        diff: [
        ]
    }
];

describe("ot", function () {
    specs.forEach(function (spec) {
        if (spec.ot) {
            it("should ot " + spec.name, function () {
                expect(ot(spec.target, spec.source)).toEqual(spec.ot);
            });
        }
    });
});

describe("diff", function () {
    specs.forEach(function (spec) {
        if (spec.diff) {
            it("should diff " + spec.name, function () {
                expect(diff(spec.target, spec.source)).toEqual(spec.diff);
            });
        }
    });
});

describe("apply", function () {
    specs.forEach(function (spec) {
        if (spec.diff) {
            it("should apply a patch for " + spec.name, function () {
                var target = spec.target.split("");
                apply(target, spec.diff);
                expect(target.join("")).toEqual(spec.source);
            });
        }
    });
});

describe("merge", function () {
    specs.forEach(function (spec) {
        it("should merge for " + spec.name, function () {
            var target = spec.target.split("");
            merge(target, spec.source);
            expect(target.join("")).toEqual(spec.source);
        });
    });
});

