
var Scope = require("./scope");
var Observers = require("./observers");
var autoCancelPrevious = Observers.autoCancelPrevious;
var once = Observers.once;
var observeRangeChange = Observers.observeRangeChange;
var cancelEach = Observers.cancelEach;

exports.bindProperty = bindProperty;
var _bindProperty = bindProperty; // to bypass scope shadowing problems below
function bindProperty(object, key, observeValue, source, descriptor, trace) {
    return observeValue(autoCancelPrevious(function (value) {
        if (descriptor.isActive) {
            return;
        }
        try {
            descriptor.isActive = true;
            trace && console.log("SET", trace.targetPath, "TO", value, "ON", object, "BECAUSE", trace.sourcePath, new Error("here").stack);
            if (Array.isArray(object) && key >>> 0 === key) {
                // TODO spec this case
                object.set(key, value);
            } else {
                object[key] = value;
            }
        } finally {
            descriptor.isActive = false;
        }
    }), source);
}

exports.makePropertyBinder = makePropertyBinder;
function makePropertyBinder(observeObject, observeKey) {
    return function bindProperty(observeValue, source, target, descriptor, trace) {
        return observeKey(autoCancelPrevious(function replaceKey(key) {
            if (key == null) return;
            return observeObject(autoCancelPrevious(function replaceObject(object) {
                if (object == null) return;
                if (object.bindProperty) {
                    return object.bindProperty(key, observeValue, source, descriptor, trace);
                } else {
                    return _bindProperty(object, key, observeValue, source, descriptor, trace);
                }
            }), target);
        }), target);
    };
}

exports.bindGet = bindGet;
var _bindGet = bindGet; // to bypass scope shadowing below
function bindGet(collection, key, observeValue, source, descriptor, trace) {
    return observeValue(autoCancelPrevious(function replaceValue(value) {
        if (descriptor.isActive) {
            return;
        }
        try {
            descriptor.isActive = true;
            trace && console.log("SET FOR KEY", key, "TO", value, "ON", collection, "BECAUSE", trace.sourcePath, new Error("here").stack);
            collection.set(key, value);
        } finally {
            descriptor.isActive = false;
        }
    }), source);
}

exports.makeGetBinder = makeGetBinder;
function makeGetBinder(observeCollection, observeKey) {
    return function bindGet(observeValue, source, target, descriptor, trace) {
        return observeCollection(autoCancelPrevious(function replaceCollection(collection) {
            if (!collection) return;
            return observeKey(autoCancelPrevious(function replaceKey(key) {
                if (key == null) return;
                return _bindGet(collection, key, observeValue, source, descriptor, trace);
            }), target);
        }), target);
    };
}

exports.makeHasBinder = makeHasBinder;
function makeHasBinder(observeSet, observeValue) {
    return function bindHas(observeHas, source, target, descriptor, trace) {
        return observeSet(autoCancelPrevious(function (set) {
            if (!set) return;
            return observeValue(autoCancelPrevious(function (value) {
                return observeHas(autoCancelPrevious(function (has) {
                    // wait for the initial value to be updated by the
                    // other-way binding
                    if (has) { // should be in set
                        if (!(set.has || set.contains).call(set, value)) {
                            trace && console.log("ADD", value, "TO", trace.targetPath, "BECAUSE", trace.sourcePath, new Error("here").stack);
                            set.add(value);
                        }
                    } else { // should not be in set
                        while ((set.has || set.contains).call(set, value)) {
                            trace && console.log("REMOVE", value, "FROM", trace.targetPath, "BECAUSE", trace.sourcePath, new Error("here").stack);
                            (set.remove || set['delete']).call(set, value);
                        }
                    }
                }), source);
            }), target);
        }), target);
    };
}

// a == b <-> c
exports.makeEqualityBinder = makeEqualityBinder;
function makeEqualityBinder(bindLeft, observeRight) {
    return function bindEquals(observeEquals, source, target, descriptor, trace) {
        // c
        return observeEquals(autoCancelPrevious(function (equals) {
            if (equals) {
                trace && console.log("BIND", trace.targetPath, "TO", trace.sourcePath, new Error("here").stack);
                // a <-> b
                var cancel = bindLeft(observeRight, source, source, descriptor, trace);
                return function cancelEqualityBinding() {
                    trace && console.log("UNBIND", trace.targetPath, "FROM", trace.sourcePath, new Error("here").stack);
                };
            }
        }), target);
    };
}

// collection.every{condition} <- everyCondition
exports.makeEveryBlockBinder = makeEveryBlockBinder;
function makeEveryBlockBinder(observeCollection, bindCondition, observeValue) {
    return function bindEveryBlock(observeEveryCondition, source, target, descriptor, trace) {
        return observeEveryCondition(autoCancelPrevious(function replaceCondition(condition) {
            if (!condition) return;
            return observeCollection(autoCancelPrevious(function replaceCollection(collection) {
                if (!collection) return;
                var cancelers = [];
                function rangeChange(plus, minus, index) {
                    cancelers.swap(index, minus.length, plus.map(function (value, offset) {
                        var scope = Scope.nest(target, value);
                        return bindCondition(observeValue, scope, scope, descriptor, trace);
                    }));
                }
                var cancelRangeChange = observeRangeChange(collection, rangeChange, target);
                return function cancelEveryBinding() {
                    cancelEach(cancelers);
                    cancelRangeChange();
                };
            }), target);
        }), source);
    };
};

// (a ? b : c) <- d
exports.makeConditionalBinder = makeConditionalBinder;
function makeConditionalBinder(observeCondition, bindConsequent, bindAlternate) {
    return function bindCondition(observeSource, source, target, descriptor, trace) {
        // a
        return observeCondition(autoCancelPrevious(function replaceCondition(condition) {
            if (condition == null) return;
            if (condition) {
                // b <- d
                return bindConsequent(observeSource, source, target, descriptor, trace);
            } else {
                // c <- d
                return bindAlternate(observeSource, source, target, descriptor, trace);
            }
        }), source);
    };
}

// a.* <- b.*
exports.makeRangeContentBinder = makeRangeContentBinder;
function makeRangeContentBinder(observeTarget, bindTarget) {
    return function bindRangeContent(observeSource, sourceScope, targetScope, descriptor, trace) {
        return observeTarget(autoCancelPrevious(function replaceRangeContentTarget(target) {
            if (!target) {
                return bindTarget(
                    Observers.makeLiteralObserver([]),
                    sourceScope,
                    targetScope,
                    descriptor,
                    trace
                );
            }

            return observeSource(autoCancelPrevious(function replaceRangeContentSource(source) {
                if (source === target) {
                    return;
                }
                if (!source) {
                    target.clear();
                    return;
                }
                if (!source.addRangeChangeListener) {
                    throw new Error("Can't bind rangeContent() from object that does not support range content change listeners: " + source);
                }

                function rangeContentSourceRangeChange(plus, minus, index) {
                    if (isActive(target))
                        return;
                    if (trace) {
                        console.log("SWAPPING", minus, "FOR", plus, "AT", index, "ON", trace.targetPath, new Error("here").stack);
                    }
                    if (target.swap) {
                        target.swap(index, minus.length, plus);
                    } else if (target.add && (target.remove || target["delete"])) {
                        plus.forEach(target.add, target);
                        minus.forEach(target.remove || target["delete"], target);
                    }
                }

                source.addRangeChangeListener(rangeContentSourceRangeChange);
                rangeContentSourceRangeChange(Array.from(source), Array.from(target), 0);
                return once(function cancelRangeContentBinding() {
                    source.removeRangeChangeListener(rangeContentSourceRangeChange);
                });
            }), sourceScope);
        }), targetScope);
    };
}

exports.makeMapContentBinder = makeMapContentBinder;
function makeMapContentBinder(observeTarget) {
    return function bindMapContent(observeSource, source, target, descriptor, trace) {
        return observeTarget(autoCancelPrevious(function (target) {
            if (!target) return;
            return observeSource(autoCancelPrevious(function (source) {
                if (!source) {
                    target.clear();
                    return;
                }

                function mapChange(value, key) {
                    if (descriptor.isActive) {
                        return;
                    }
                    try {
                        descriptor.isActive = true;
                        if (value === undefined) {
                            if (trace) {
                                trace && console.log("DELETED", trace.targetPath, "FOR KEY", key, "ON", target, "BECAUSE", trace.sourcePath, new Error("here").stack);
                            }
                            if (Array.isArray(target)) {
                                target.splice(key, 1);
                            } else {
                                target["delete"](key);
                            }
                        } else {
                            if (trace) {
                                trace && console.log("SET", trace.targetPath, "FOR KEY", key, "TO", value, "ON", target, "BECAUSE", trace.sourcePath, new Error("here").stack);
                            }
                            target.set(key, value);
                        }
                    } finally {
                        descriptor.isActive = false;
                    }
                }
                target.clear();
                source.forEach(mapChange);
                return source.addMapChangeListener(mapChange);
            }), source);
        }), target);
    };
}

// a.reversed() <-> b
exports.makeReversedBinder = makeReversedBinder;
function makeReversedBinder(observeTarget) {
    return function bindReversed(observeSource, source, target, descriptor, trace) {
        return observeTarget(autoCancelPrevious(function (target) {
            if (!target) return;
            return observeSource(autoCancelPrevious(function (source) {
                if (!source) {
                    target.clear();
                    return;
                }

                function rangeChange(plus, minus, index) {
                    if (isActive(target))
                        return;
                    var reflected = target.length - index - minus.length;
                    target.swap(reflected, minus.length, plus.reversed());
                }
                source.addRangeChangeListener(rangeChange);
                rangeChange(source, target, 0);
                return once(function () {
                    source.removeRangeChangeListener(rangeChange);
                });
            }), source);
        }), target);
    };
}

function isActive(target) {
    return (
        target.getRangeChangeDescriptor &&
        target.getRangeChangeDescriptor().isActive
    );
}

