var assert = require("assert");
var memwatch = require("memwatch");

var Bindings = require("../bindings");

var SIZE = 10000;
var TIMES = 10;

var makeRandomArray = function(n) {
    var res = [];
    for (var i=0; i<n; i++){
        res.push(Math.floor(Math.random()*100000));
    }
    return res;
};

var observeArray = {
    frb: function() {
        var bound = Bindings.defineBindings({
            array: makeRandomArray(SIZE)
        }, {
            sumOfOdds: {"<-": "array.filter{%2}.sum()"}
        });
        var r = bound.sumOfOdds;
        bound.array.push(11);
        assert(r+11 === bound.sumOfOdds, "FRB logic failed");
        Bindings.cancelBindings(bound);
    },

    naive: function() {
        var array = makeRandomArray(SIZE);
        var sumOfOdds = function(){
            return array.filter(function(x){ return x % 2 == 1; }).reduce(function(a, b){ return a+b; });
        };
        var r = sumOfOdds();
        array.push(11);
        assert(r+11 === sumOfOdds(), "Naive logic failed");
    }
};

var test = function(callback) {
    global.gc();
    var start = new Date();
    var hd = new memwatch.HeapDiff();

    for(var i=0; i<TIMES; i++) callback();
    global.gc();

    var res = hd.end();
    res.time = new Date() - start;
    return res;
};

var compare = function() {
    console.log("FRB", JSON.stringify(test(observeArray.frb), null, 4));
    console.log("Naive", JSON.stringify(test(observeArray.naive), null, 4));
};

compare();
