
// TODO dependent properties
// TODO custom property observer definition

var WeakMap = require("collections/weak-map");
var cancelersForObject = new WeakMap();
var owns = Object.prototype.hasOwnProperty;
var bind = require("./bind");

module.exports = Type;
function Type() {
}

Type.create = create;
function create(prototype, properties, descriptors) {
    var self = Object.create(prototype);
    define(self, properties, descriptors);
    return self;
}

function define(object, properties, descriptors) {
    for (var name in properties) {
        object[name] = properties[name];
    }
    for (var name in descriptors) {
        defineProperty(object, name, descriptors[name]);
    }
}

function defineProperty(object, name, descriptor) {
    var cancel = noop;
    if (descriptor[constructor]) {
        object = object.constructor;
    }
    if (/^\w+$/.test(name)) {
        if (!("get" in descriptor || "set" in descriptor)) {
            if (!("writable" in descriptor)) {
                descriptor.writable = true;
            }
        }
        if (!("enumerable" in descriptor)) {
            descriptor.enumerable = true;
        }
        if (!("configurable" in descriptor)) {
            descriptor.configurable = true;
        }
        Object.defineProperty(object, name, descriptor);
    }
    if ("<-" in descriptor || "<->" in descriptor) {
        cancelProperty(object, name);
        var cancelersForName = getCancelers(object);
        cancelersForName[name] = bind(object, name, descriptor);
    }
}

function getCancelers(object) {
    if (!cancelersForObject.has(object)) {
        cancelersForObject.set(object, {});
    }
    return cancelersForObject.get(object);
}

function getCancelerForName(object, name) {
    var cancelersForName = getCancelers(object);
    return cancelersForName[name] || noop;
}

Type.cancel = cancel;
function cancel(object) {
    var cancelersForName = getCancelers(object);
    for (var name in cancelersForName) {
        cancelProperty(object, name);
    }
}

function cancelProperty(object, name) {
    var cancel = getCancelerForName(object, name);
    cancel();
}

function noop () {}

