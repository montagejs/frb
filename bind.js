
var parse = require("./parse");
var solve = require("./algebra");
var stringify = require("./stringify");
var compileObserver = require("./compile-observer");
var compileBinder = require("./compile-binder");
var Observers = require("./observers");
var Scope = require("./scope");

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
    var document = descriptor.document;
    var components = descriptor.components;
    var trace = descriptor.trace;

    var sourceScope = descriptor.sourceScope = new Scope(source, null, parameters, document, components);
    var targetScope = descriptor.targetScope = new Scope(target, null, parameters, document, components);

    // promote convert and revert from a converter object up to the descriptor
    if (descriptor.converter) {
        var converter = descriptor.converter;
        if (converter.convert) {
            descriptor.convert = converter.convert.bind(converter);
        }
        if (converter.revert) {
            descriptor.revert = converter.revert.bind(converter);
        }
    }

    var convert = descriptor.convert;
    var revert = descriptor.revert;

    var sourceSyntax = descriptor.sourceSyntax = parse(sourcePath);
    var targetSyntax = descriptor.targetSyntax = parse(targetPath);

    // <- source to target
    trace && console.log("DEFINE BINDING", targetPath, "<-", sourcePath, target);
    var cancelSourceToTarget = bindOneWay(
        targetScope,
        targetSyntax,
        sourceScope,
        sourceSyntax,
        convert,
        descriptor,
        trace
    );

    // -> target to source
    var cancelTargetToSource = noop;
    if (twoWay) {
        trace && console.log("DEFINE BINDING", targetPath, "->", sourcePath, source);
        cancelTargetToSource = bindOneWay(
            sourceScope,
            sourceSyntax,
            targetScope,
            targetSyntax,
            revert,
            descriptor,
            trace
        );
    }

    return function cancel() {
        cancelSourceToTarget();
        cancelTargetToSource();
    };

}

function bindOneWay(
    targetScope,
    targetSyntax,
    sourceScope,
    sourceSyntax,
    convert,
    descriptor,
    trace
) {

    // rotate operators from the target side of the binding to the
    // by inversion onto the source
    var solution = solve(targetSyntax, sourceSyntax);
    targetSyntax = solution[0];
    sourceSyntax = solution[1];

    var observeSource = compileObserver(sourceSyntax);
    if (convert) {
        observeSource = Observers.makeConverterObserver(
            observeSource,
            convert,
            sourceScope
        );
    }

    var bindTarget = compileBinder(targetSyntax);
    return bindTarget(
        observeSource,
        sourceScope,
        targetScope,
        descriptor,
        trace ? {
            sourcePath: stringify(sourceSyntax),
            targetPath: stringify(targetSyntax)
        } : null
    );

}

function noop() {}

