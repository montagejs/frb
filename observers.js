
require("collections/array-shim"); // forEach, map
require("collections/array"); // swap, set, sum, flatten
require("./array"); // content change listeners
var Properties = require("./properties"); // property change listeners

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

exports.makeConverterObserver = makeConverterObserver;
function makeConverterObserver(observeValue, convert, thisp) {
    return function (emit, value, parameters, beforeChange) {
        emit = makeUniq(emit);
        return observeValue(autoCancelPrevious(function replaceValue(value) {
            return emit(convert.call(thisp, value)) || noop;
        }), value, parameters, beforeChange);
    };
}

exports.makeComputerObserver = makeComputerObserver;
function makeComputerObserver(observeArgs, compute, thisp) {
    return function (emit, value, parameters, beforeChange) {
        emit = makeUniq(emit);
        return observeArgs(autoCancelPrevious(function replaceArgs(args) {
            return emit(compute.apply(thisp, args)) || noop;
        }), value, parameters, beforeChange);
    };
}

exports.makePropertyObserver = makePropertyObserver;
function makePropertyObserver(observeObject, observeKey) {
    return function observeProperty(emit, value, parameters, beforeChange) {
        return observeKey(autoCancelPrevious(function replaceKey(key) {
            if (key === undefined)
                return;
            return observeObject(autoCancelPrevious(function replaceObject(object) {
                if (!object)
                    return;
                var cancel = emit(object[key], key, object) || noop;
                Properties.addPropertyChangeListener(object, key, emit, beforeChange);
                return once(function cancelPropertyObserver() {
                    cancel();
                    Properties.removePropertyChangeListener(object, key, emit, beforeChange);
                });
            }), value, parameters, beforeChange);
        }), value, parameters, beforeChange);
    };
}

exports.makeRecordObserver = makeRecordObserver;
function makeRecordObserver(observers) {
    return function observeRecord(emit, value, parameters, beforeChange) {
        var cancelers = {};
        var output = {};
        for (var name in observers) {
            (function (name, observe) {
                cancelers[name] = observe(function (value) {
                    output[name] = value;
                }, value, parameters, beforeChange);
            })(name, observers[name]);
        }
        var cancel = emit(output) || noop;
        return function cancelRecordObserver() {
            cancel();
            for (var name in cancelers) {
                cancelers[name]();
            }
        };
    };
}

exports.makeHasObserver = makeHasObserver;
function makeHasObserver(observeSet, observeValue) {
    return function observeHas(emit, value, parameters, beforeChange) {
        emit = makeUniq(emit);
        return observeValue(autoCancelPrevious(function replaceValue(sought) {
            return observeSet(autoCancelPrevious(function replaceSet(set) {
                // this could be done incrementally if there were guarantees of
                // uniqueness, but if there are guarantees of uniqueness, the
                // data structure can probably efficiently check
                var cancel = noop;
                function contentChange() {
                    cancel();
                    cancel = emit((set.has || set.contains).call(set, sought)) || noop;
                }
                contentChange();
                set.addContentChangeListener(contentChange, beforeChange);
                return once(function cancelHasObserver() {
                    cancel();
                    set.removeContentChangeListener(contentChange, beforeChange);
                });
            }), value, parameters, beforeChange);
        }), value, parameters, beforeChange);
    };
}

exports.makeContentObserver = makeContentObserver;
function makeContentObserver(observeArray) {
    return function observeContent(emit, value, parameters, beforeChange) {
        return observeArray(autoCancelPrevious(function (array) {
            if (array == undefined) // or null is implied
                return;
            if (!array.addContentChangeListener)
                return emit(array);
            var cancel = noop;
            function contentChange() {
                cancel = emit(array) || noop;
            }
            array.addContentChangeListener(contentChange);
            contentChange();
            return once(function cancelContentObserver() {
                cancel();
                array.removeContentChangeListener(contentChange);
            });
        }), value, parameters, beforeChange);
    };
}

exports.makeMapObserver = makeNonReplacing(makeReplacingMapObserver);
function makeReplacingMapObserver(observeArray, observeRelation) {
    return function observeMap(emit, value, parameters, beforeChange) {
        return observeArray(autoCancelPrevious(function replaceMapInput(input) {
            if (!input)
                return;
            var output = [];
            var cancelers = [];
            function contentChange(plus, minus, index) {
                cancelEach(cancelers.swap(
                    index,
                    minus.length,
                    observeEach(plus, observeRelation, function replaceSlice(replacement) {
                        output.swap(index, minus.length, replacement);
                    }, value, parameters, beforeChange)
                ));
            }
            contentChange(input, [], 0)
            var cancel = emit(output) || noop;
            input.addContentChangeListener(contentChange, beforeChange);
            return once(function cancelMapObserver() {
                cancel();
                cancelEach(cancelers);
                input.removeContentChangeListener(contentChange, beforeChange);
            });
        }), value, parameters, beforeChange);
    };
}

exports.makeOperatorObserverMaker = makeOperatorObserverMaker;
function makeOperatorObserverMaker(operator) {
    return function makeOperatorObserver(/*...observers*/) {
        var observeOperands = makeObserversObserver(Array.prototype.slice.call(arguments));
        var observeOperandChanges = makeContentObserver(observeOperands);
        return function observeOperator(emit, value, parameters, beforeChange) {
            return observeOperandChanges(function (operands) {
                if (operands.every(defined)) {
                    return emit(operator.apply(void 0, operands));
                }
            }, value, parameters, beforeChange);
        };
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
    return function observeObservers(emit, value, parameters, beforeChange) {
        var output = Array(observers.length);
        var cancelers = observers.map(function observeObserver(observe, index) {
            return observe(function replaceValue(value) {
                output.set(index, value);
            }, value, parameters, beforeChange);
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
function observeEach(array, observeRelation, emit, value, parameters, beforeChange) {
    var output = Array(array.length);
    var cancelers = array.map(function observeOne(value, index) {
        return observeRelation(function replaceOne(value) {
            output.set(index, value);
        }, value, parameters, beforeChange)
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
    return function observeReversed(emit, value, parameters, beforeChange) {
        return observeArray(autoCancelPrevious(function (input) {
            var output = [];
            function contentChange(plus, minus, index) {
                var reflected = output.length - index - minus.length;
                output.swap(reflected, minus.length, plus.reversed());
            };
            contentChange(input, [], 0);
            var cancel = emit(output);
            input.addContentChangeListener(contentChange, beforeChange);
            return once(function cancelReversedObserver() {
                cancel();
                input.removeContentChangeListener(contentChange, beforeChange);
            });
        }), value, parameters, beforeChange);
    };
}

exports.makeWindowObserver = makeNonReplacing(makeReplacingWindowObserver);
function makeReplacingWindowObserver(observeArray, observeStart, observeLength) {
    return function observeWindow(emit, value, parameters, beforeChange) {
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
                    array.addContentChangeListener(contentChange, beforeChange);
                    return once(function cancelWindowObserver() {
                        cancel();
                        array.removeContentChangeListener(contentChange, beforeChange);
                    });
                }), value, parameters, beforeChange);
            }), value, parameters, beforeChange);
        }), value, parameters, beforeChange);
    };
}

exports.makeFlattenObserver = makeNonReplacing(makeReplacingFlattenObserver);
function makeReplacingFlattenObserver(observeArray) {
    return function (emit, value, parameters, beforeChange) {
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

                        inner.addContentChangeListener(innerContentChange, beforeChange);
                        return once(function cancelInnerFlattenObserver() {
                            inner.removeContentChangeListener(innerContentChange, beforeChange);
                        });
                    })
                ));

            }

            contentChange(input, [], 0);
            var cancel = emit(output) || noop;

            input.addContentChangeListener(contentChange, beforeChange);
            return once(function cancelFlattenObserver() {
                cancel();
                cancelEach(cancelers);
                input.removeContentChangeListener(contentChange, beforeChange);
            });
        }), value, parameters, beforeChange);
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
        return function (emit, value, parameters, beforeChange) {
            var output = [];
            var cancelObserver = observe(autoCancelPrevious(function (input) {
                output.swap(0, output.length, input);
                input.addContentChangeListener(contentChange, beforeChange);
                function contentChange(plus, minus, index) {
                    output.swap(index, minus.length, plus);
                }
                return once(function cancelReplacingObserver() {
                    // TODO fix problem that this would get called twice on replacement
                    input.removeContentChangeListener(contentChange, beforeChange);
                });
            }), value, parameters, beforeChange);
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
        return function (emit, value, parameters, beforeChange) {
            emit = makeUniq(emit);
            return observeArray(function (array) {
                var handler = setup(array, emit);
                array.addContentChangeListener(handler.contentChange, beforeChange);
                return once(function () {
                    handler.cancel();
                    array.removeContentChangeListener(handler.contentChange, beforeChange);
                });
            }, value, parameters, beforeChange);
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
exports.makeUniq = makeUniq;
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

exports.once = once;
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

function defined(x) {
    return x != null;
}

