
var parse = require("./parse");
var compileObserver = require("./compile-observer");
var compileBinder = require("./compile-binder");

module.exports = bind;
function bind(target, targetPath, descriptor) {

    descriptor.target = target;
    descriptor.targetPath = targetPath;
    var source = descriptor.source = descriptor.source || target;
    var sourcePath = descriptor["<-"] || descriptor["<->"] || "";
    var twoWay = descriptor.twoWay = "<->" in descriptor;
    descriptor.sourcePath = sourcePath;
    var value = descriptor.value;
    var parameters = descriptor.parameters = descriptor.parameters || source;
    var trace = descriptor.trace;

    var sourceSyntax = descriptor.sourceSyntax = parse(sourcePath);
    var targetSyntax = descriptor.targetSyntax = parse(targetPath);

    // <- source to target
    trace && console.log("DEFINE BINDING", targetPath, "<-", sourcePath, target);
    var cancelSourceToTarget = bindOneWay(
        target,
        targetSyntax,
        source,
        sourceSyntax,
        parameters,
        trace ? {
            sourcePath: sourcePath,
            targetPath: targetPath
        } : undefined
    );

    // -> target to source
    var cancelTargetToSource = noop;
    if (twoWay) {
        trace && console.log("DEFINE BINDING", targetPath, "->", sourcePath, source);
        cancelTargetToSource = bindOneWay(
            source,
            sourceSyntax,
            target,
            targetSyntax,
            parameters,
            trace ? {
                sourcePath: targetPath,
                targetPath: sourcePath
            } : undefined
        );
    }

    return function cancel() {
        cancelSourceToTarget();
        cancelTargetToSource();
    };

}

function bindOneWay(target, targetSyntax, source, sourceSyntax, parameters, trace) {
    // rotate negation from the target to the source since it's equivalent but
    // bindable
    if (targetSyntax.type === "not" || targetSyntax.type === "neg") {
        sourceSyntax = {type: targetSyntax.type, args: [sourceSyntax]};
        targetSyntax = targetSyntax.args[0];
    }
    var observeSource = compileObserver(sourceSyntax);
    var bindTarget = compileBinder(targetSyntax);
    return bindTarget(
        observeSource,
        source,
        target,
        parameters,
        trace
    );
}

function noop() {}

