
var parse = require("../parse");

describe("parse", function () {

    [

        {
            input: "",
            output: {type: "value"}
        },

        {
            input: "a",
            output: {type: "property", args: [
                {type: "value"},
                {type: "literal", value: "a"}
            ]}
        },

        {
            input: "a.b",
            output: {type: "property", args: [
                {type: "property", args: [
                    {type: "value"},
                    {type: "literal", value: "a"}
                ]},
                {type: "literal", value: "b"}
            ]}
        },

        {
            input: "map()",
            output: {type: "map", args: [
                {type: "value"},
                {type: "value"}
            ]}
        },

        {
            input: "a.map()",
            output: {type: "map", args: [
                {type: "property", args: [
                    {type: "value"},
                    {type: "literal", value: "a"}
                ]},
                {type: "value"}
            ]}
        },

        {
            input: "a.map(b)",
            output: {type: "map", args: [
                {type: "property", args: [
                    {type: "value"},
                    {type: "literal", value: "a"}
                ]},
                {type: "property", args: [
                    {type: "value"},
                    {type: "literal", value: "b"}
                ]}
            ]}
        },

        {
            input: "flatten()",
            output: {type: "flatten", args: [
                {type: "value"},
                {type: "value"}
            ]}
        },

        {
            input: "a.flatten()",
            output: {type: "flatten", args: [
                {type: "property", args: [
                    {type: "value"},
                    {type: "literal", value: "a"}
                ]},
                {type: "value"}
            ]}
        },

        {
            input: "a.flatten(b)",
            output: {type: "flatten", args: [
                {type: "map", args: [
                    {type: "property", args: [
                        {type: "value"},
                        {type: "literal", value: "a"}
                    ]},
                    {type: "property", args: [
                        {type: "value"},
                        {type: "literal", value: "b"}
                    ]}
                ]}
            ]}
        }

    ].forEach(function (test) {
        it("should parse " + JSON.stringify(test.input), function () {
            expect(parse(test.input)).toEqual(test.output);
        });
    })

});

