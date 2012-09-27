
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
    rotate(sourceSyntax, targetSyntax, function (newSource, newTarget) {
        sourceSyntax = newSource;
        targetSyntax = newTarget;
    });
    var observeSource = compileObserver(sourceSyntax);
    var bindTarget = compileBinder(targetSyntax);
    var cancelSourceToTarget = bindTarget(
        observeSource, source, target, parameters
    );

    // ->
    var cancelTargetToSource = noop;
    if (twoWay) {
        rotate(targetSyntax, sourceSyntax, function (newTarget, newSource) {
            targetSyntax = newTarget;
            sourceSyntax = newSource;
        });
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

// rather than implement ! and - binders, just rotate the operator to the
// source side.
function rotate(source, target, callback) {
    if (target.type === 'not' || target.type === 'neg') {
        // in lieu of destucturing assignment, use a callback
        callback(
            {type: target.type, args: [source]},
            target.args[0]
        );
    }
}

function noop() {}

