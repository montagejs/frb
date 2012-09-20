
// TODO slice

require("collections/observable-object"); // property change listeners
require("collections/observable-array"); // content change listeners
require("collections/array-shim"); // forEach, map
require("collections/array"); // swap, set, sum

// primitives

exports.makeLiteralObserver = makeLiteralObserver;
function makeLiteralObserver(literal) {
    return function (emit) {
        return emit(literal);
    };
}

exports.valueObserver = function (emit, value) {
    return emit(value);
};

exports.parametersObserver = function (emit, value, parameters) {
    return emit(parameters);
};

exports.makeRelationObserver = makeRelationObserver;
function makeRelationObserver(relation, thisp) {
    return function (emit, value, parameters) {
        return emit(relation.call(thisp, value));
    };
}

exports.makePropertyObserver = makePropertyObserver;
function makePropertyObserver(observeObject, observeKey) {
    return function (emit, value, parameters) {
        return observeObject(makeCancelable(function (object) {
            return observeKey(makeCancelable(function (key) {
                Object.addOwnPropertyChangeListener(object, key, emit);
                emit(object[key], key, object);
                return function cancel() {
                    Object.removeOwnPropertyChangeListener(object, key, emit);
                };
            }), value, parameters);
        }), value, parameters);
    };
};

// compound

exports.makeMapObserver = makeNonReplacing(makeReplacingMapObserver);
function makeReplacingMapObserver(observeArray, observeRelation) {
    return function (emit, value, parameters) {
        return observeArray(makeCancelable(function (input) {
            var output = [];
            var cancelers = [];
            function contentChange(plus, minus, index) {
                cancelEach(cancelers.swap(
                    index,
                    minus.length,
                    observeEach(plus, observeRelation, function (replacement) {
                        output.swap(index, minus.length, replacement);
                    }, value, parameters)
                ));
            }
            contentChange(input, [], 0)
            emit(output);
            input.addContentChangeListener(contentChange);
            return function () {
                cancelEach(cancelers);
                input.removeContentChangeListener(contentChange);
            };
        }, value, parameters));
    };
}

// accepts an array of observers and emits an array of the corresponding
// values, incrementally updated
exports.makeObserversObserver = makeObserversObserver;
function makeObserversObserver(observers) {
    return function (emit, value, parameters) {
        var output = Array(observers.length);
        var cancelers = observers.map(function (observe, index) {
            return observe(function (value) {
                output.set(index, value);
            });
        })
        emit(output);
        return function () {
            cancelEach(cancelers);
        };
    };
}

// a utility for the map observer that replaces a spliced region of the input
// array with the mapped values, and corresponding cancelers for observing each
// of those values.
function observeEach(array, observeRelation, emit, value, parameters) {
    var output = Array(array.length);
    var cancelers = array.map(function (value, index) {
        return observeRelation(function (value) {
            output.set(index, value);
        }, value, parameters)
    });
    emit(output);
    return cancelers;
}

exports.makeWindowObserver = makeNonReplacing(makeReplacingWindowObserver);
function makeReplacingWindowObserver(observeArray, observeStart, observeLength) {
    return function (emit, value, parameters) {
        return observeArray(makeCancelable(function (array) {
            return observeStart(makeCancelable(function (start) {
                return observeLength(makeCancelable(function (length) {
                    var end = start + length;
                    var output = [];
                    function contentChange(plus, minus, index) {
                        // TODO overlapping windows, multiple swaps
                        output.swap(0, output.length, array.slice(start, start + length));
                    }
                    contentChange(array, [], 0);
                    emit(output);
                    array.addContentChangeListener(contentChange);
                    return function cancel() {
                        array.removeContentChangeListener(contentChange);
                    };
                }), value, parameters);
            }), value, parameters);
        }), value, parameters);
    };
}

exports.makeFlattenObserver = makeNonReplacing(makeReplacingFlattenObserver);
function makeReplacingFlattenObserver(observeArray) {
    return function (emit, value, parameters) {
        return observeArray(makeCancelable(function (input) {
            var output = [];
            var cancelers = [];
            var cumulativeLengths = [0];
            var indicies = [];

            function update(i) {
                for (var j = i; j < input.length; j++) {
                    indicies[j].index = j;
                    cumulativeLengths[j + 1] = cumulativeLengths[j] + input[j].length;
                }
            }

            function contentChange(plus, minus, i) {

                // minus
                var start = cumulativeLengths[i];
                var end = cumulativeLengths[i + minus.length];
                var length = end - start;
                output.swap(start, length, []);

                indicies.swap(i, minus.length, plus.map(function () {
                    return {index: null};
                }));
                update(i);

                // plus
                cancelEach(cancelers.swap(
                    i,
                    minus.length,
                    plus.map(function (inner, j) {
                        var index = indicies[i + j];
                        function innerContentChange(plus, minus, k) {
                            update(index.index);
                            var start = cumulativeLengths[index.index] + k;
                            var end = cumulativeLengths[index.index] + k + minus.length;
                            var length = end - start;
                            output.swap(start, length, plus);
                        }
                        innerContentChange(inner, [], 0);

                        inner.addContentChangeListener(innerContentChange);
                        return function innerCancel() {
                            inner.removeContentChangeListener(innerContentChange);
                        };
                    })
                ));

            }

            contentChange(input, [], 0);
            emit(output);

            input.addContentChangeListener(contentChange);
            return function cancel() {
                cancelEach(cancelers);
                input.removeContentChangeListener(contentChange);
            }
        }), value, parameters);
    };
}

function cancelEach(cancelers) {
    cancelers.forEach(function (cancel) {
        if (cancel) {
            cancel();
        }
    });
}

// a utility for generating map and filter observers because they both replace
// the output array whenever the input array is replaced.  instead, this
// wrapper receives the replacement array and mirrors it on an output array
// that only gets emitted once.
function makeNonReplacing(wrapped) {
    return function () {
        var observe = wrapped.apply(this, arguments);
        return function (emit, value, parameters) {
            var output = [];
            var cancel = observe(makeCancelable(function (replacement) {
                output.swap(0, output.length, replacement);
                replacement.addContentChangeListener(contentChange);
                function contentChange(plus, minus, index) {
                    output.swap(index, minus.length, plus);
                }
                return function () {
                    replacement.removeContentChangeListener(contentChange);
                }
            }), value, parameters);
            emit(output);
            return cancel;
        };
    };
}

// a utility for generating sum and average observers since they both need to
// capture some internal state on intiailization, and update that state on
// content changes.
function makeArrayObserverMaker(setup) {
    return function (observeArray) {
        return function (emit, value, parameters) {
            emit = makeUniq(emit);
            return observeArray(function (array) {
                var update = setup(array, emit);
                array.addContentChangeListener(update);
                return function cancel() {
                    array.removeContentChangeListener(update);
                };
            }, value, parameters);
        };
    };
}

exports.makeSumObserver = makeArrayObserverMaker(function init(array, emit) {
    var sum = array.sum();
    emit(sum);
    return function update(plus, minus, index) {
        sum += plus.sum() - minus.sum();
        emit(sum);
    };
});

exports.makeAverageObserver = makeArrayObserverMaker(function init(array, emit) {
    var sum = array.sum();
    var count = array.length;
    emit(sum / count);
    return function update(plus, minus, index) {
        sum += plus.sum() - minus.sum();
        count += plus.length - minus.length;
        emit(sum / count);
    };
});

// wraps an emitter such that repeated values are ignored
function makeUniq(emit) {
    var previous;
    return function wrappedEmit(next) {
        if (next !== previous) {
            var result = emit.apply(this, arguments);
            previous = next;
            return result;
        }
    };
}

// wraps a handler that returns a canceler.  each time the wrapped function is
// called, it cancels the previous canceler, and calls the last canceler when
// it is canceled.  this is useful for observers that update a value and attach
// a new event listener tree to the value.
function makeCancelable(handler) {
    var cancel = noop;
    return function () {
        cancel();
        cancel = handler.apply(this, arguments) || noop;
        return function () {
            cancel();
        };
    };
}

function noop() {}

