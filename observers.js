
require("collections/array-shim"); // forEach, map
require("collections/array"); // swap, set, sum
require("./object"); // property change listeners
require("./array"); // content change listeners

// primitives

exports.makeLiteralObserver = makeLiteralObserver;
function makeLiteralObserver(literal) {
    return function observeLiteral(emit) {
        return emit(literal) || noop;
    };
}

exports.observeValue = function (emit, value) {
    return emit(value) || noop;
};

exports.observeParameters = function (emit, value, parameters) {
    return emit(parameters) || noop;
};

exports.makeRelationObserver = makeRelationObserver;
function makeRelationObserver(relation, thisp) {
    return function observeRelation(emit, value, parameters) {
        return emit(relation.call(thisp, value)) || noop;
    };
}

exports.makePropertyObserver = makePropertyObserver;
function makePropertyObserver(observeObject, observeKey) {
    return function observeProperty(emit, value, parameters) {
        return observeKey(autoCancelPrevious(function replaceKey(key) {
            return observeObject(autoCancelPrevious(function replaceObject(object) {
                if (!object) {
                    throw new Error("Can't observe property " + JSON.stringify(key) + " of " + object);
                }
                var cancel = emit(object[key], key, object) || noop;
                Object.addOwnPropertyChangeListener(object, key, emit);
                return once(function cancelPropertyObserver() {
                    cancel();
                    Object.removeOwnPropertyChangeListener(object, key, emit);
                });
            }), value, parameters);
        }), value, parameters);
    };
}

// compound

exports.makeMapObserver = makeNonReplacing(makeReplacingMapObserver);
function makeReplacingMapObserver(observeArray, observeRelation) {
    return function observeMap(emit, value, parameters) {
        return observeArray(autoCancelPrevious(function replaceMapInput(input) {
            var output = [];
            var cancelers = [];
            function contentChange(plus, minus, index) {
                cancelEach(cancelers.swap(
                    index,
                    minus.length,
                    observeEach(plus, observeRelation, function replaceSlice(replacement) {
                        output.swap(index, minus.length, replacement);
                    }, value, parameters)
                ));
            }
            contentChange(input, [], 0)
            var cancel = emit(output) || noop;
            input.addContentChangeListener(contentChange);
            return once(function cancelMapObserver() {
                cancel();
                cancelEach(cancelers);
                input.removeContentChangeListener(contentChange);
            });
        }), value, parameters);
    };
}

exports.makeTupleObserver = makeTupleObserver;
function makeTupleObserver() {
    return makeObserversObserver(Array.prototype.slice.call(arguments));
}

// accepts an array of observers and emits an array of the corresponding
// values, incrementally updated
exports.makeObserversObserver = makeObserversObserver;
function makeObserversObserver(observers) {
    return function observeObservers(emit, value, parameters) {
        var output = Array(observers.length);
        var cancelers = observers.map(function observeObserver(observe, index) {
            return observe(function replaceValue(value) {
                output.set(index, value);
            }, value, parameters);
        })
        var cancel = emit(output) || noop;
        return once(function cancelObserversObserver() {
            cancel();
            cancelEach(cancelers);
        });
    };
}

// a utility for the map observer that replaces a spliced region of the input
// array with the mapped values, and corresponding cancelers for observing each
// of those values.
function observeEach(array, observeRelation, emit, value, parameters) {
    var output = Array(array.length);
    var cancelers = array.map(function observeOne(value, index) {
        return observeRelation(function replaceOne(value) {
            output.set(index, value);
        }, value, parameters)
    });
    emit(output);
    return cancelers;
}

// calculating the reflected index for an incremental change:
// [0, 1, 2, 3]  length 4
//     -------  -4 (1+3)
// --------    0-  (outer.length - index - inner.length)
exports.makeReversedObserver = makeNonReplacing(makeReplacingReversedObserver);
function makeReplacingReversedObserver(observeArray) {
    return function observeReversed(emit, value, parameters) {
        return observeArray(autoCancelPrevious(function (input) {
            var output = [];
            function contentChange(plus, minus, index) {
                var reflected = output.length - index - minus.length;
                output.swap(reflected, minus.length, plus.reversed());
            };
            contentChange(input, [], 0);
            var cancel = emit(output);
            input.addContentChangeListener(contentChange);
            return once(function cancelReversedObserver() {
                cancel();
                input.removeContentChangeListener(contentChange);
            });
        }), value, parameters);
    };
}

exports.makeWindowObserver = makeNonReplacing(makeReplacingWindowObserver);
function makeReplacingWindowObserver(observeArray, observeStart, observeLength) {
    return function observeWindow(emit, value, parameters) {
        return observeArray(autoCancelPrevious(function (array) {
            return observeStart(autoCancelPrevious(function (start) {
                return observeLength(autoCancelPrevious(function (length) {
                    var end = start + length;
                    var output = [];
                    function contentChange(plus, minus, index) {
                        // TODO overlapping windows, multiple swaps
                        output.swap(0, output.length, array.slice(start, start + length));
                    }
                    contentChange(array, [], 0);
                    var cancel = emit(output) || noop;
                    array.addContentChangeListener(contentChange);
                    return once(function cancelWindowObserver() {
                        cancel();
                        array.removeContentChangeListener(contentChange);
                    });
                }), value, parameters);
            }), value, parameters);
        }), value, parameters);
    };
}

exports.makeFlattenObserver = makeNonReplacing(makeReplacingFlattenObserver);
function makeReplacingFlattenObserver(observeArray) {
    return function (emit, value, parameters) {
        return observeArray(autoCancelPrevious(function (input) {
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
                        return once(function cancelInnerFlattenObserver() {
                            inner.removeContentChangeListener(innerContentChange);
                        });
                    })
                ));

            }

            contentChange(input, [], 0);
            var cancel = emit(output) || noop;

            input.addContentChangeListener(contentChange);
            return once(function cancelFlattenObserver() {
                cancel();
                cancelEach(cancelers);
                input.removeContentChangeListener(contentChange);
            });
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
            var cancelObserver = observe(autoCancelPrevious(function (input) {
                output.swap(0, output.length, input);
                input.addContentChangeListener(contentChange);
                function contentChange(plus, minus, index) {
                    output.swap(index, minus.length, plus);
                }
                return once(function cancelReplacingObserver() {
                    // TODO fix problem that this would get called twice on replacement
                    input.removeContentChangeListener(contentChange);
                });
            }), value, parameters);
            var cancel = emit(output) || noop;
            return once(function cancelNonReplacingObserver() {
                cancelObserver();
                cancel();
            });
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
                var handler = setup(array, emit);
                array.addContentChangeListener(handler.contentChange);
                return once(function () {
                    handler.cancel();
                    array.removeContentChangeListener(handler.contentChange);
                });
            }, value, parameters);
        };
    };
}

exports.makeSumObserver = makeArrayObserverMaker(function setup(array, emit) {
    var sum = array.sum();
    var cancel = emit(sum) || noop;
    return {
        contentChange: function contentChange(plus, minus, index) {
            sum += plus.sum() - minus.sum();
            cancel = emit(sum);
        },
        cancel: cancel
    };
});

exports.makeAverageObserver = makeArrayObserverMaker(function setup(array, emit) {
    var sum = array.sum();
    var count = array.length;
    var cancel = emit(sum / count) || noop;
    return {
        contentChange: function contentChange(plus, minus, index) {
            sum += plus.sum() - minus.sum();
            count += plus.length - minus.length;
            cancel = emit(sum / count);
        },
        cancel: function () {
            cancel();
        }
    };
});

// wraps an emitter such that repeated values are ignored
function makeUniq(emit) {
    var previous;
    return function uniqEmit(next) {
        if (next !== previous) {
            var result = emit.apply(this, arguments);
            previous = next;
            return result;
        }
    };
}

// wraps an emitter that returns a canceler.  each time the wrapped function is
// called, it cancels the previous canceler, and calls the last canceler when
// it is canceled.  this is useful for observers that update a value and attach
// a new event listener tree to the value.
exports.autoCancelPrevious = autoCancelPrevious;
function autoCancelPrevious(emit) {
    var cancelPrevious = noop;
    return function cancelPreviousAndReplace() {
        cancelPrevious();
        cancelPrevious = emit.apply(this, arguments) || noop;
        return function cancelLast() {
            cancelPrevious();
        };
    };
}

function once(callback) {
    var done;
    return function once() {
        if (done) {
            return noop; // TODO fix bugs that make this sensitive
            //throw new Error("Redundant call: " + callback + " " + done.stack + "\nSecond call:");
        }
        done = true;
        //done = new Error("First call:");
        return callback.apply(this, arguments);
    }
}

function noop() {}

