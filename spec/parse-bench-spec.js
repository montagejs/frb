
var p1 = require("../grammar").parse;
var p2 = require("../parse");
var language = require("./language");

console.log("PEG grammar.js then HAND parse.js");
[p1, p2].forEach(function (parse) {
    time(function () {
        for (var i = 0; i < 100; i++) {
            language.forEach(function (test) {
                if (!test.invalid) {
                    parse(test.path)
                }
            })
            p2.semantics.memo.clear();
        }
    });
});

function time(f) {
    var start = Date.now();
    f();
    var stop = Date.now();
    console.log(stop - start);
}

