
var Observers = require("./observers");
var autoCancelPrevious = Observers.autoCancelPrevious;
var once = Observers.once;

exports.makePropertyBinder = makePropertyBinder;
function makePropertyBinder(observeObject, observeKey) {
    return function (observeValue, source, target, parameters, descriptor, trace) {
        return observeKey(autoCancelPrevious(function (key) {
            if (key == null) return;
            return observeObject(autoCancelPrevious(function (object) {
                if (object == null) return;
                if (object.bindProperty) {
                    return object.bindProperty(key, observeValue, source, parameters, descriptor, trace);
                } else {
                    return bindProperty(object, key, observeValue, source, parameters, descriptor, trace);
                }
            }), target, parameters);
        }), target, parameters);
    };
}

exports.bindProperty = bindProperty;
function bindProperty(object, key, observeValue, source, parameters, descriptor, trace) {
    return observeValue(autoCancelPrevious(function (value) {
        if (descriptor.isActive) {
            trace && console.log("IGNORED SET", trace.targetPath, "TO", value, "ON", object, "BECAUSE", trace.sourcePath, "ALREADY ACTIVE");
            return;
        }
        try {
            descriptor.isActive = true;
            trace && console.log("SET", trace.targetPath, "TO", value, "ON", object, "BECAUSE", trace.sourcePath);
            if (Array.isArray(object) && key >>> 0 === key) {
                // TODO spec this case
                object.set(key, value);
            } else {
                object[key] = value;
            }
        } finally {
            descriptor.isActive = false;
        }
    }), source, parameters);
}

exports.makeGetBinder = makeGetBinder;
function makeGetBinder(observeCollection, observeKey) {
    return function bindGet(observeValue, source, target, parameters, descriptor, trace) {
        return observeCollection(autoCancelPrevious(function replaceCollection(collection) {
            if (!collection) return;
            return observeKey(autoCancelPrevious(function replaceKey(key) {
                if (key == null) return;
                return bindKey(collection, key, observeValue, source, parameters, descriptor, trace);
            }), target, parameters);
        }), target, parameters);
    };
}

exports.bindKey = bindKey;
function bindKey(collection, key, observeValue, source, parameters, descriptor, trace) {
    return observeValue(autoCancelPrevious(function replaceValue(value) {
        if (descriptor.isActive) {
            trace && console.log("IGNORED SET FOR KEY", key, "OF", trace.targetPath, "TO", value, "ON", collection, "BECAUSE", trace.sourcePath, "ALREADY ACTIVE");
            return;
        }
        try {
            descriptor.isActive = true;
            trace && console.log("SET FOR KEY", key, "TO", value, "ON", collection, "BECAUSE", trace.sourcePath);
            collection.set(key, value);
        } finally {
            descriptor.isActive = false;
        }
    }), source, parameters);
}

exports.makeHasBinder = makeHasBinder;
function makeHasBinder(observeSet, observeValue) {
    return function (observeHas, source, target, parameters, descriptor, trace) {
        return observeSet(autoCancelPrevious(function (set) {
            if (!set) return;
            return observeValue(autoCancelPrevious(function (value) {
                return observeHas(autoCancelPrevious(function (has) {
                    // wait for the initial value to be updated by the
                    // other-way binding
                    if (has) { // should be in set
                        if (!(set.has || set.contains).call(set, value)) {
                            trace && console.log("ADD", value, "TO", trace.targetPath, "BECAUSE", trace.sourcePath);
                            set.add(value);
                        }
                    } else { // should not be in set
                        while ((set.has || set.contains).call(set, value)) {
                            trace && console.log("REMOVE", value, "FROM", trace.targetPath, "BECAUSE", trace.sourcePath);
                            (set.remove || set['delete']).call(set, value);
                        }
                    }
                }), source, parameters);
            }), target, parameters);
        }), target, parameters);
    };
}

// a == b <-> c
exports.makeEqualityBinder = makeEqualityBinder;
function makeEqualityBinder(bindLeft, observeRight) {
    return function (observeEquals, source, target, parameters, descriptor, trace) {
        // c
        return observeEquals(autoCancelPrevious(function (equals) {
            if (equals) {
                trace && console.log("BIND", trace.targetPath, "TO", trace.sourcePath);
                // a <-> b
                var cancel = bindLeft(observeRight, source, source, parameters, descriptor, trace);
                return function () {
                    trace && console.log("UNBIND", trace.targetPath, "FROM", trace.sourcePath);
                };
            }
        }), target, parameters);
    };
}

// (a ? b : c) <- d
exports.makeConditionalBinder = makeConditionalBinder;
function makeConditionalBinder(observeCondition, bindConsequent, bindAlternate) {
    return function (observeSource, source, target, parameters, descriptor, trace) {
        // a
        return observeCondition(autoCancelPrevious(function replaceCondition(condition) {
            if (condition == null) return;
            if (condition) {
                // b <- d
                return bindConsequent(observeSource, source, target, parameters, descriptor, trace);
            } else {
                // c <- d
                return bindAlternate(observeSource, source, target, parameters, descriptor, trace);
            }
        }), source, parameters);
    };
}

// a.* <- b.*
exports.makeRangeContentBinder = makeRangeContentBinder;
function makeRangeContentBinder(observeTarget) {
    return function (observeSource, source, target, parameters, descriptor, trace) {
        return observeTarget(autoCancelPrevious(function (target) {
            if (!target) return;
            return observeSource(autoCancelPrevious(function (source) {
                if (!source || !source.addRangeChangeListener) {
                    target.clear();
                    return;
                }

                function rangeChange(plus, minus, index) {
                    if (isActive(target))
                        return;
                    if (trace) {
                        console.log("SWAPPING", minus, "FOR", plus, "AT", index);
                    }
                    if (target.swap) {
                        target.swap(index, minus.length, plus);
                    } else if (target.add && (target.remove || target["delete"])) {
                        plus.forEach(target.add, target);
                        minus.forEach(target.remove || target["delete"], target);
                    }
                }

                source.addRangeChangeListener(rangeChange);
                rangeChange(Array.from(source), Array.from(target), 0);
                return once(function () {
                    source.removeRangeChangeListener(rangeChange);
                });
            }), source, parameters);
        }), target, parameters);
    };
}

exports.makeMapContentBinder = makeMapContentBinder;
function makeMapContentBinder(observeTarget) {
    return function (observeSource, source, target, parameters, descriptor, trace) {
        return observeTarget(autoCancelPrevious(function (target) {
            if (!target) return;
            return observeSource(autoCancelPrevious(function (source) {
                if (!source) {
                    target.clear();
                    return;
                }

                function mapChange(value, key) {
                    if (descriptor.isActive) {
                        if (trace) {
                            console.log("IGNORED MAP CHANGE", trace.targetPath, "TO", value, "ON", target, "BECAUSE", trace.sourcePath, "ALREADY ACTIVE");
                        }
                        return;
                    }
                    try {
                        descriptor.isActive = true;
                        if (value === undefined) {
                            if (trace) {
                                trace && console.log("DELETED", trace.targetPath, "FOR KEY", key, "ON", target, "BECAUSE", trace.sourcePath);
                            }
                            if (Array.isArray(target)) {
                                target.splice(key, 1);
                            } else {
                                target["delete"](key);
                            }
                        } else {
                            if (trace) {
                                trace && console.log("SET", trace.targetPath, "FOR KEY", key, "TO", value, "ON", target, "BECAUSE", trace.sourcePath);
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
            }), source, parameters);
        }), target, parameters);
    };
}

// a.reversed() <-> b
exports.makeReversedBinder = makeReversedBinder;
function makeReversedBinder(observeTarget) {
    return function (observeSource, source, target, parameters, descriptor, trace) {
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
            }), source, parameters);
        }), target, parameters);
    };
}

function isActive(target) {
    return (
        target.getRangeChangeDescriptor &&
        target.getRangeChangeDescriptor().isActive
    );
}

