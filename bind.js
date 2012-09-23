
var parse = require("./parse");
var compileObserver = require("./compile-observer");
var compileBinder = require("./compile-binder");

module.exports = bind;
function bind(target, targetPath, descriptor) {

    var source = descriptor.source || target;
    var sourcePath = descriptor["<-"] || descriptor["<->"];
    var value = descriptor.value;
    var parameters = descriptor.parameters || source;

    var sourceSyntax = parse(sourcePath);
    var targetSyntax = parse(targetPath);

    // <-
    var observeSource = compileObserver(sourceSyntax);
    var bindTarget = compileBinder(targetSyntax);
    var cancelSourceToTarget = bindTarget(
        observeSource, source, target, parameters
    );

    // ->
    var cancelTargetToSource = noop;
    if ("<->" in descriptor) {
        var observeTarget = compileObserver(targetSyntax);
        var bindSource = compileBinder(sourceSyntax);
        var cancelTargetToSource = bindSource(
            observeTarget, source, target, parameters
        );
    }

    return function cancel() {
        cancelSourceToTarget();
        cancelTargetToSource();
    };

}

function noop() {}

