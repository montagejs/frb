
var parse = require("./parse");
var compileObserver = require("./compile-observer");
var compileBinder = require("./compile-binder");

module.exports = bind;
function bind(target, targetPath, descriptor) {

    descriptor.target = target;
    descriptor.targetPath = targetPath;
    var source = descriptor.source = descriptor.source || target;
    var sourcePath = descriptor["<-"] || descriptor["<->"];
    var twoWay = descriptor.twoWay = "<->" in descriptor;
    descriptor.sourcePath = sourcePath;
    var value = descriptor.value;
    var parameters = descriptor.parameters = descriptor.parameters || source;

    var sourceSyntax = descriptor.sourceSyntax = parse(sourcePath);
    var targetSyntax = descriptor.targetSyntax = parse(targetPath);

    // <-
    var observeSource = compileObserver(sourceSyntax);
    var bindTarget = compileBinder(targetSyntax);
    var cancelSourceToTarget = bindTarget(
        observeSource, source, target, parameters
    );

    // ->
    var cancelTargetToSource = noop;
    if (twoWay) {
        var observeTarget = compileObserver(targetSyntax);
        var bindSource = compileBinder(sourceSyntax);
        var cancelTargetToSource = bindSource(
            observeTarget, target, source, parameters
        );
    }

    return function cancel() {
        cancelSourceToTarget();
        cancelTargetToSource();
    };

}

function noop() {}

