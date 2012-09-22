
var compileObserver = require("./compile-observer");
var Observers = require("./observers");
var Binders = require("./binders");

module.exports = compile;
function compile(syntax) {
    return compile.semantics.compile(syntax);
}

compile.semantics = {

    compilers: {
        property: Binders.makePropertyBinder,
        has: Binders.makeHasBinder
    },

    compile: function (syntax) {
        var compilers = this.compilers;
        if (compilers.hasOwnProperty(syntax.type)) {
            var argObservers = syntax.args.map(compileObserver, compileObserver.semantics);
            return compilers[syntax.type].apply(null, argObservers);
        } else {
            throw new Error("Can't compile binder for " + JSON.stringify(syntax));
        }
    }

};

