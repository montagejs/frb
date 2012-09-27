
var Observers = require("./observers");
var Properties = require("./properties");
var autoCancelPrevious = Observers.autoCancelPrevious;
var once = Observers.once;

exports.makePropertyBinder = makePropertyBinder;
function makePropertyBinder(observeObject, observeKey) {
    return function (observeValue, source, target, parameters) {
        return observeObject(autoCancelPrevious(function (object) {
            return observeKey(autoCancelPrevious(function (key) {
                return observeValue(autoCancelPrevious(function (value) {
                    if (Properties.getPropertyChangeDescriptor(object, key).isActive)
                        return;
                    object[key] = value;
                }), source, parameters);
            }), target, parameters);
        }), target, parameters);
    };
}

exports.makeHasBinder = makeHasBinder;
function makeHasBinder(observeSet, observeValue) {
    return function (observeHas, source, target, parameters) {
        return observeSet(autoCancelPrevious(function (set) {
            return observeValue(autoCancelPrevious(function (value) {
                return observeHas(autoCancelPrevious(function (has) {
                    // wait for the initial value to be updated by the
                    // other-way binding
                    if (has === undefined) {
                    } else if (has) { // should be in set
                        if (!(set.has || set.contains).call(set, value)) {
                            set.add(value);
                        }
                    } else { // should not be in set
                        while ((set.has || set.contains).call(set, value)) {
                            (set.remove || set['delete']).call(set, value);
                        }
                    }
                }), target, parameters);
            }), source, parameters);
        }), source, parameters);
    };
}

exports.makeEqualityBinder = makeEqualityBinder;
function makeEqualityBinder(bindLeft, observeRight) {
    return function (observeEquals, source, target, parameters) {
        return observeEquals(autoCancelPrevious(function (equals) {
            if (equals) {
                return bindLeft(observeRight, source, source, parameters);
            }
        }), target, parameters);
    };
}

exports.makeContentBinder = makeContentBinder;
function makeContentBinder(observeTarget) {
    return function (observeSource, source, target, parameters) {
        return observeTarget(Observers.autoCancelPrevious(function (target) {
            if (!target)
                return;
            return observeSource(Observers.autoCancelPrevious(function (source) {
                if (!source)
                    return;
                function contentChange(plus, minus, index) {
                    if (target.getContentChangeDescriptor().isActive)
                        return;
                    target.swap(index, minus.length, plus);
                }
                source.addContentChangeListener(contentChange);
                contentChange(source, target, 0);
                return once(function () {
                    source.removeContentChangeListener(contentChange);
                });
            }), source, parameters);
        }), target, parameters);
    };
}

exports.makeReversedBinder = makeReversedBinder;
function makeReversedBinder(observeTarget) {
    return function (observeSource, source, target, parameters) {
        return observeTarget(Observers.autoCancelPrevious(function (target) {
            return observeSource(Observers.autoCancelPrevious(function (source) {
                if (!source)
                    return;
                function contentChange(plus, minus, index) {
                    if (target.getContentChangeDescriptor().isActive)
                        return;
                    var reflected = target.length - index - minus.length;
                    target.swap(reflected, minus.length, plus.reversed());
                }
                source.addContentChangeListener(contentChange);
                contentChange(source, target, 0);
                return once(function () {
                    source.removeContentChangeListener(contentChange);
                });
            }), source, parameters);
        }), target, parameters);
    };
}

