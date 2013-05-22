
var Map = require("collections/map");
var bind = require("./bind");
var compute = require("./compute");
var observe = require("./observe");

var bindingsForObject = new Map();
var owns = Object.prototype.hasOwnProperty;

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
    commonDescriptor = commonDescriptor || Object.empty;
    var bindingsForName = getBindings(object);
    if (owns.call(bindingsForName, name)) {
        throw new Error("Can't bind to already bound target, " + JSON.stringify(name));
    }
    if ("<-" in descriptor || "<->" in descriptor || "compute" in descriptor) {
        descriptor.target = object;
        descriptor.parameters = descriptor.parameters || commonDescriptor.parameters;
        descriptor.document = descriptor.document || commonDescriptor.document;
        descriptor.components = descriptor.components || commonDescriptor.components;
        if ("compute" in descriptor) {
            descriptor.cancel = compute(object, name, descriptor);
        } else {
            descriptor.cancel = bind(object, name, descriptor);
        }
        bindingsForName[name] = descriptor;
        exports.count++;
    } else {
        if (!("get" in descriptor) && !("set" in descriptor) && !("writable" in descriptor)) {
            descriptor.writable = true;
        }
        if (!("configurable" in descriptor)) {
            descriptor.configurable = true;
        }
        if (!("enumerable" in descriptor)) {
            descriptor.enumerable = true;
        }
        Object.defineProperty(object, name, descriptor);
    }
    return object;
}

exports.getBindings = getBindings;
function getBindings(object) {
    if (!bindingsForObject.has(object)) {
        bindingsForObject.set(object, {});
    }
    return bindingsForObject.get(object);
}

exports.getBinding = getBinding;
function getBinding(object, name) {
    var bindingsForName = getBindings(object);
    return bindingsForName[name];
}

exports.cancelBindings = cancelBindings;
function cancelBindings(object) {
    var bindings = getBindings(object);
    for (var name in bindings) {
        cancelBinding(object, name);
    }
}

exports.cancelBinding = cancelBinding;
function cancelBinding(object, name) {
    var bindings = getBindings(object);
    if (!bindings[name]) {
        throw new Error("Can't cancel non-existent binding to " + JSON.stringify(name));
    }
    var binding = bindings[name];
    if (binding && binding.cancel) {
        binding.cancel();
        delete bindings[name];
        exports.count--;
        for (var name in bindings) {
            return; // if there are any remaining bindings, short-circuit
        }
        bindingsForObject["delete"](object);
    }
}

