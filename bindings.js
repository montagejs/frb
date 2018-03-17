
var Map = require("collections/map"),
    bind = require("./bind"),
    compute = require("./compute"),
    observe = require("./observe"),
    stringify = require("./stringify");

var bindingsForObject = new Map(),
    owns = Object.prototype.hasOwnProperty,
    ONE_WAY = "<-",
    TWO_WAY = "<->",
    COMPUTE = "compute",
    GET = "get",
    SET = "set",
    WRITABLE = "writable",
    CONFIGURABLE = "configurable",
    ENUMERABLE = "enumerable";

exports.count = 0;
exports.bindings = bindingsForObject;

exports.defineBindings = defineBindings;
function defineBindings(object, descriptors, commonDescriptor) {
    if (descriptors) {
        for (var name in descriptors) {
            defineBinding(object, name, descriptors[name], commonDescriptor);
        }
    }
    return object;
}

exports.defineBinding = defineBinding;
function defineBinding(object, name, descriptor, commonDescriptor) {
    commonDescriptor = commonDescriptor || defineBinding.empty;
    var bindingsForName = defineBinding.getBindings(object),
        parameters, document;

    if (bindingsForName.has(name)) {
        throw new Error("Can't bind to already bound target, " + JSON.stringify(name));
    }
    else if (ONE_WAY in descriptor || TWO_WAY in descriptor || COMPUTE in descriptor) {
        bindingsForName.set(name,descriptor);
        descriptor.target = object;
        if((parameters = descriptor.parameters || commonDescriptor.parameters))
            descriptor.parameters = parameters;
        if((document = descriptor.document || commonDescriptor.document))
            descriptor.document = document;
        descriptor.components = descriptor.components || commonDescriptor.components;

        descriptor.cancel = (COMPUTE in descriptor)
            ? defineBinding.compute(object, name, descriptor)
            : defineBinding.bind(object, name, descriptor);

        exports.count++;
    } else {
        if (!(GET in descriptor) && !(SET in descriptor) && !(WRITABLE in descriptor)) {
            descriptor.writable = true;
        }
        if (!(CONFIGURABLE in descriptor)) {
            descriptor.configurable = true;
        }
        if (!(ENUMERABLE in descriptor)) {
            descriptor.enumerable = true;
        }
        Object.defineProperty(object, name, descriptor);
    }
    return object;
}
defineBinding.empty = Object.empty;
defineBinding.getBindings = getBindings;
defineBinding.compute = compute;
defineBinding.bind = bind;

exports.getBindings = getBindings;
function getBindings(object) {
    var value;
    return getBindings.bindingsForObject.get(object) || (getBindings.bindingsForObject.set(object, ( value = new Map)) && value);
}
getBindings.bindingsForObject  = bindingsForObject;

exports.getBinding = getBinding;
function getBinding(object, name) {
    return getBinding.getBindings(object).get(name);
}
getBinding.getBindings = getBindings;

exports.cancelBindings = cancelBindings;
function cancelBindings(object) {
    var bindings = getBindings(object),
        mapIter = bindings.keys();

        while (name = mapIter.next().value) {
            cancelBindings.cancelBinding(object, name, bindings);
        }

    // for (var name in bindings) {
    //     cancelBinding(object, name);
    // }
}
cancelBindings.getBindings = getBindings;
cancelBindings.cancelBinding = cancelBinding;

exports.cancelBinding = cancelBinding;
function cancelBinding(object, name, bindings/*private argument to call from cancelBindings*/) {
    if(!bindings) {
        bindings = cancelBinding.getBindings(object);
        if (!bindings.has(name)) {
            throw new Error("Can't cancel non-existent binding to " + JSON.stringify(name));
        }
    }
    var binding = bindings.get(name);
    if (binding && binding.cancel) {
        binding.cancel();
        bindings.delete(name);
        exports.count--;

        if (bindings.size < 1) {
            cancelBinding.bindingsForObject.delete(object);
        }
    }
}
cancelBinding.getBindings = getBindings;
cancelBinding.bindingsForObject = bindingsForObject;
