
var ArrayChanges = require("collections/listen/array-changes");
var PropertyChanges = require("collections/listen/property-changes");
var SortedArray = require("collections/sorted-array");
var Map = require("collections/map");
var Set = require("collections/set");
var Heap = require("collections/heap");
var Operators = require("./operators");

// primitives

exports.makeLiteralObserver = makeLiteralObserver;
function makeLiteralObserver(literal) {
    return function observeLiteral(emit) {
        return emit(literal) || Function.noop;
    };
}

exports.observeValue = observeValue;
function observeValue(emit, source) {
    return emit(source) || Function.noop;
}

exports.observeParameters = observeParameters;
function observeParameters(emit, source, parameters) {
    return emit(parameters) || Function.noop;
};

exports.makeElementObserver = makeElementObserver;
function makeElementObserver(id) {
    return function observeElement(emit, source, parameters) {
        return emit(parameters.document.getElementById(id)) || Function.noop;
    };
}

exports.makeComponentObserver = makeComponentObserver;
function makeComponentObserver(label, syntax) {
    return function observeComponent(emit, source, parameters) {
        if (!parameters.serialization) {
            throw new Error("Can't observe components without serialization parameter");
        }
        var component = parameters.serialization.getObjectByLabel(label)
        syntax.component = component;
        return emit(component) || Function.noop;
    };
}

exports.makeRelationObserver = makeRelationObserver;
function makeRelationObserver(relation, thisp) {
    return function observeRelation(emit, source, parameters) {
        return emit(relation.call(thisp, source)) || Function.noop;
    };
}

exports.makeConverterObserver = makeConverterObserver;
function makeConverterObserver(observeValue, convert, thisp) {
    return function observeConversion(emit, source, parameters, beforeChange) {
        emit = makeUniq(emit);
        return observeValue(autoCancelPrevious(function replaceValue(value) {
            return emit(convert.call(thisp, value));
        }), source, parameters, beforeChange);
    };
}

exports.makeComputerObserver = makeComputerObserver;
function makeComputerObserver(observeArgs, compute, thisp) {
    return function (emit, source, parameters, beforeChange) {
        emit = makeUniq(emit);
        return observeArgs(autoCancelPrevious(function replaceArgs(args) {
            if (!args || !args.every(defined)) return;
            return emit(compute.apply(thisp, args));
        }), source, parameters, beforeChange);
    };
}

exports.observeProperty = _observeProperty;
function _observeProperty(object, key, emit, source, parameters, beforeChange) {
    var cancel = Function.noop;
    function propertyChange(value, key, object) {
        cancel();
        cancel = emit(value, key, object) || Function.noop;
    }
    PropertyChanges.addOwnPropertyChangeListener(object, key, propertyChange, beforeChange);
    propertyChange(object[key], key, object);
    return once(function cancelPropertyObserver() {
        cancel();
        PropertyChanges.removeOwnPropertyChangeListener(object, key, propertyChange, beforeChange);
    });
}

exports.makePropertyObserver = makePropertyObserver;
function makePropertyObserver(observeObject, observeKey) {
    return function observeProperty(emit, source, parameters, beforeChange) {
        return observeKey(autoCancelPrevious(function replaceKey(key) {
            if (key == null) return emit();
            return observeObject(autoCancelPrevious(function replaceObject(object) {
                if (object == null) return emit();
                if (object.observeProperty) {
                    return object.observeProperty(key, emit, source, parameters, beforeChange);
                } else {
                    return _observeProperty(object, key, emit, source, parameters, beforeChange);
                }
            }), source, parameters, beforeChange);
        }), source, parameters, beforeChange);
    };
}

exports.observeKey = observeGet; // deprecated
exports.observeGet = observeGet;
function observeGet(collection, key, emit, source, parameters, beforeChange) {
    var cancel = Function.noop;
    var equals = collection.contentEquals || Object.equals;
    function mapChange(value, mapKey, collection) {
        if (equals(key, mapKey)) {
            cancel();
            cancel = emit(value, key, collection) || Function.noop;
        }
    }
    mapChange(collection.get(key), key, collection);
    collection.addMapChangeListener(mapChange, beforeChange);
    return once(function cancelMapObserver() {
        cancel();
        collection.removeMapChangeListener(mapChange, beforeChange);
    });
}

exports.makeGetObserver = makeGetObserver;
function makeGetObserver(observeCollection, observeKey) {
    return function observeMap(emit, source, parameters, beforeChange) {
        return observeCollection(autoCancelPrevious(function replaceCollection(collection) {
            if (!collection) return emit();
            return observeKey(autoCancelPrevious(function replaceKey(key) {
                if (key == null) return emit();
                if (collection.observeKey) {
                    // polymorphic override
                    return collection.observeKey(key, emit, source, parameters, beforeChange);
                } else {
                    // common case
                    return observeGet(collection, key, emit, source, parameters, beforeChange);
                }
            }), source, parameters, beforeChange);
        }), source, parameters, beforeChange);
    }
}

exports.makePathObserver = makePathObserver;
function makePathObserver(observeObject, observePath) {
    var parse = require("./parse");
    var compileObserver = require("./compile-observer");
    return function (emit, source, parameters, beforeChange) {
        return observePath(autoCancelPrevious(function replacePath(path) {
            if (path == null) return emit();
            var syntax, observePath;
            try {
                syntax = parse(path);
                observePath = compileObserver(syntax);
            } catch (exception) {
                return emit();
            }
            return observeObject(autoCancelPrevious(function replaceObject(object) {
                return observePath(emit, object, parameters, beforeChange);
            }), source, parameters, beforeChange);
        }), source, parameters, beforeChange);
    };
}

exports.makeWithObserver = makeWithObserver;
function makeWithObserver(observeContext, observeExpression) {
    return function observeWith(emit, source, parameters, beforeChange) {
        return observeContext(autoCancelPrevious(function replaceContext(context) {
            return observeExpression(autoCancelPrevious(function replaceValue(value) {
                return emit(value);
            }), context, parameters, beforeChange);
        }), source, parameters, beforeChange);
    };
}

// condition ? consequent : alternate
// {type: "if", args: [condition, consequent, alternate]}
exports.makeConditionalObserver = makeConditionalObserver;
function makeConditionalObserver(observeCondition, observeConsequent, observeAlternate) {
    return function observeConditional(emit, source, parameters, beforeChange) {
        return observeCondition(autoCancelPrevious(function replaceCondition(condition) {
            if (condition == null) {
                return emit();
            } else if (condition) {
                return observeConsequent(emit, source, parameters, beforeChange);
            } else {
                return observeAlternate(emit, source, parameters, beforeChange);
            }
        }), source, parameters, beforeChange);
    };
}

exports.makeNotObserver = makeNotObserver;
function makeNotObserver(observeValue) {
    return function observeNot(emit, source, parameters, beforeChange) {
        return observeValue(autoCancelPrevious(function replaceValue(value) {
            return emit(!value);
        }), source, parameters, beforeChange);
    };
}

exports.makeAndObserver = makeAndObserver;
function makeAndObserver(observeLeft, observeRight) {
    return function observeAnd(emit, source, parameters, beforeChange) {
        return observeLeft(autoCancelPrevious(function replaceLeft(left) {
            if (!left) {
                return emit(left);
            } else {
                return observeRight(emit, source, parameters, beforeChange);
            }
        }), source, parameters, beforeChange);
    };
}

exports.makeOrObserver = makeOrObserver;
function makeOrObserver(observeLeft, observeRight) {
    return function observeOr(emit, source, parameters, beforeChange) {
        return observeLeft(autoCancelPrevious(function replaceLeft(left) {
            if (left) {
                return emit(left);
            } else {
                return observeRight(emit, source, parameters, beforeChange);
            }
        }), source, parameters, beforeChange);
    };
}

exports.makeDefinedObserver = makeDefinedObserver;
function makeDefinedObserver(observeValue, observeAlternate) {
    return function observeDefault(emit, source, parameters, beforeChange) {
        return observeValue(autoCancelPrevious(function replaceValue(value) {
            return emit(value != null);
        }), source, parameters, beforeChange);
    };
}

exports.makeDefaultObserver = makeDefaultObserver;
function makeDefaultObserver(observeValue, observeAlternate) {
    return function observeDefault(emit, source, parameters, beforeChange) {
        return observeValue(autoCancelPrevious(function replaceValue(value) {
            if (value == null) {
                return observeAlternate(emit, source, parameters, beforeChange);
            } else {
                return emit(value);
            }
        }), source, parameters, beforeChange);
    };
}

// {type: "record", args: {key: observe}}
// {a: 10, b: c + d}
// {type: "record", args: {a: {type: "literal", value: 10 ...
exports.makeRecordObserver = makeRecordObserver;
function makeRecordObserver(observers) {
    return function observeRecord(emit, source, parameters, beforeChange) {
        var cancelers = {};
        var output = {};
        for (var name in observers) {
            (function (name, observe) {
                cancelers[name] = observe(function (value) {
                    output[name] = value;
                }, source, parameters, beforeChange);
            })(name, observers[name]);
        }
        var cancel = emit(output) || Function.noop;
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
    return function observeHas(emit, source, parameters, beforeChange) {
        emit = makeUniq(emit);
        return observeValue(autoCancelPrevious(function replaceValue(sought) {
            return observeSet(autoCancelPrevious(function replaceSet(set) {
                if (!set) return emit();
                return observeRangeChange(set, function rangeChange() {
                    // this could be done incrementally if there were guarantees of
                    // uniqueness, but if there are guarantees of uniqueness, the
                    // data structure can probably efficiently check
                    return emit((set.has || set.contains).call(set, sought));
                }, beforeChange);
            }), source, parameters, beforeChange);
        }), source, parameters, beforeChange);
    };
}

exports.makeRangeContentObserver = makeRangeContentObserver;
function makeRangeContentObserver(observeCollection) {
    return function observeContent(emit, source, parameters, beforeChange) {
        return observeCollection(autoCancelPrevious(function (collection) {
            if (!collection || !collection.addRangeChangeListener) {
                return emit(collection);
            } else {
                return observeRangeChange(collection, function rangeChange() {
                    return emit(collection);
                }, beforeChange);
            }
        }), source, parameters, beforeChange);
    };
}

exports.makeMapContentObserver = makeMapContentObserver;
function makeMapContentObserver(observeCollection) {
    return function observeContent(emit, source, parameters, beforeChange) {
        return observeCollection(autoCancelPrevious(function (collection) {
            if (!collection || !collection.addMapChangeListener) {
                return emit(collection);
            } else {
                return observeMapChange(collection, function rangeChange() {
                    return emit(collection);
                }, beforeChange);
            }
        }), source, parameters, beforeChange);
    };
}

// object.array.splice(0, 1, 2);
// object.array = [1, 2, 3]
var makeMapBlockObserver = exports.makeMapBlockObserver = makeNonReplacing(makeReplacingMapBlockObserver);
function makeReplacingMapBlockObserver(observeCollection, observeRelation) {
    return function observeMap(emit, source, parameters, beforeChange) {
        return observeCollection(autoCancelPrevious(function replaceMapInput(input) {
            if (!input) return emit();

            var output = [];
            var indexRefs = [];
            var cancelers = [];

            function update(index) {
                for (; index < input.length; index++) {
                    indexRefs[index].index = index;
                }
            }

            function rangeChange(plus, minus, index) {
                indexRefs.swap(index, minus.length, plus.map(function (value, offset) {
                    return {index: index + offset};
                }));
                update(index + plus.length);
                var initialized;
                var mapped = [];
                cancelEach(cancelers.swap(index, minus.length, plus.map(function (value, offset) {
                    var indexRef = indexRefs[index + offset];
                    return observeRelation(autoCancelPrevious(function replaceRelationOutput(value) {
                        if (initialized) {
                            output.set(indexRef.index, value);
                        } else {
                            mapped[offset] = value;
                        }
                    }), value, parameters, beforeChange);
                })));
                initialized = true;
                output.swap(index, minus.length, mapped);
            }

            var cancelRangeChange = observeRangeChange(input, rangeChange);
            // passing the input as a second argument is a special feature of a
            // mapping observer, utilized by filter observers
            var cancel = emit(output, input) || Function.noop;

            return once(function cancelMapObserver() {
                cancel();
                cancelEach(cancelers);
                cancelRangeChange();
            });
        }), source, parameters, beforeChange);
    };
}

var makeFilterBlockObserver = exports.makeFilterBlockObserver = makeNonReplacing(makeReplacingFilterBlockObserver);
function makeReplacingFilterBlockObserver(observeArray, observePredicate) {
    var observePredicates = makeReplacingMapBlockObserver(observeArray, observePredicate);
    return function observeFilter(emit, source, parameters, beforeChange) {
        return observePredicates(autoCancelPrevious(function (predicates, input) {
            if (!input) return emit();

            var output = [];
            var cancelers = [];
            var cumulativeLengths = [0];

            function update(index) {
                for (; index < predicates.length; index++) {
                    cumulativeLengths[index + 1] = cumulativeLengths[index] + predicates[index];
                }
            }

            function rangeChange(plusPredicates, minusPredicates, index) {
                var plusValues = input.slice(index, index + plusPredicates.length);
                var oldLength = minusPredicates.map(Boolean).sum();
                var newLength = plusPredicates.map(Boolean).sum();
                var length = newLength - oldLength;
                var plusOutput = plusValues.filter(function (value, offset) {
                    return plusPredicates[offset];
                });
                var start = cumulativeLengths[index];
                output.swap(start, Math.max(0, oldLength - newLength), plusOutput);
                update(start);
            }

            var cancelRangeChange = observeRangeChange(predicates, rangeChange, beforeChange);
            var cancel = emit(output) || Function.noop;
            return once(function cancelFilterObserver() {
                cancel();
                cancelEach(cancelers);
                cancelRangeChange();
            });

        }), source, parameters, beforeChange);
    };
}

exports.makeSomeBlockObserver = makeSomeBlockObserver;
function makeSomeBlockObserver(observeCollection, observePredicate) {
    // collection.some{predicate} is equivalent to
    // collection.filter{predicate}.length !== 0
    var observeFilter = makeFilterBlockObserver(observeCollection, observePredicate);
    var observeLength = makePropertyObserver(observeFilter, observeLengthLiteral);
    return makeConverterObserver(observeLength, Boolean);
}

exports.makeEveryBlockObserver = makeEveryBlockObserver;
function makeEveryBlockObserver(observeCollection, observePredicate) {
    // collection.every{predicate} is equivalent to
    // collection.filter{!predicate}.length === 0
    var observeNotPredicate = makeConverterObserver(observePredicate, Operators.not);
    var observeFilter = makeFilterBlockObserver(observeCollection, observeNotPredicate);
    var observeLength = makePropertyObserver(observeFilter, observeLengthLiteral);
    return makeConverterObserver(observeLength, Operators.not);
}

// used by both some and every blocks
var observeLengthLiteral = makeLiteralObserver("length");

exports.makeSortedBlockObserver = makeSortedBlockObserver;
function makeSortedBlockObserver(observeCollection, observeRelation) {
    var observeRelationItem = makeRelationItemObserver(observeRelation);
    var observeRelationItems = makeReplacingMapBlockObserver(observeCollection, observeRelationItem);
    var observeSort = function (emit, source, parameters, beforeChange) {
        return observeRelationItems(autoCancelPrevious(function (input) {
            if (!input) return emit();

            var output = [];
            var sorted = SortedArray(
                output,
                function equals(x, y) {
                    return Object.equals(x[1], y[1]);
                },
                function compare(x, y) {
                    return Object.compare(x[1], y[1]);
                }
            );
            function rangeChange(plus, minus) {
                sorted.addEach(plus);
                sorted.deleteEach(minus);
            }
            var cancelRangeChange = observeRangeChange(input, rangeChange, beforeChange);
            var cancel = emit(output) || Function.noop;
            return function cancelSortedObserver() {
                cancel();
                cancelRangeChange();
            };
        }), source, parameters, beforeChange);
    };
    return makeMapBlockObserver(observeSort, observeItemKey);
}

function makeRelationItemObserver(observeRelation) {
    return function (emit, key, parameters, beforeChange) {
        return observeRelation(autoCancelPrevious(function (value) {
            return emit([key, value]) || Function.noop;
        }), key, parameters, beforeChange);
    };
}

// TODO makeSortedSetBlockObserver

exports.makeGroupBlockObserver = makeGroupBlockObserver;
function makeGroupBlockObserver(observeCollection, observeRelation) {
    var observeGroup = makeGroupMapBlockObserver(observeCollection, observeRelation);
    return makeItemsObserver(observeGroup);
}

exports.makeGroupMapBlockObserver = makeGroupMapBlockObserver;
function makeGroupMapBlockObserver(observeCollection, observeRelation) {
    var observeRelationItem = makeRelationItemObserver(observeRelation);
    var observeRelationItems = makeReplacingMapBlockObserver(observeCollection, observeRelationItem);
    return function observeGroup(emit, source, parameters, beforeChange) {
        return observeRelationItems(autoCancelPrevious(function (input, original) {
            if (!input) return emit();

            var groups = Map();

            function rangeChange(plus, minus, index) {
                var dirtyGroups = Set();
                minus.forEach(function (item) {
                    // ASSERT groups.has(item[1]);
                    var group = groups.get(item[1]);
                    group["delete"](item[0]);
                    dirtyGroups.add(item[1]);
                });
                plus.forEach(function (item) {
                    if (!groups.has(item[1])) {
                        // constructClone ensures that the equivalence classes
                        // are the same type as the input.  It is shimmed on
                        // Array by Collections, and supported by all others.
                        groups.set(item[1], original.constructClone());
                    }
                    var group = groups.get(item[1]);
                    group.add(item[0]);
                });
                dirtyGroups.forEach(function (key) {
                    var group = groups.get(key);
                    if (group.length === 0) {
                        groups["delete"](key);
                    }
                });
            }

            var cancelRangeChange = observeRangeChange(input, rangeChange, beforeChange);
            var cancel = emit(groups) || Function.noop;
            return function cancelGroupObserver() {
                cancelRangeChange();
                cancel();
            };
        }), source, parameters, beforeChange);
    };
}

function makeHeapBlockObserver(observeCollection, observeRelation, order) {
    var observeRelationItem = makeRelationItemObserver(observeRelation);
    var observeRelationItems = makeReplacingMapBlockObserver(observeCollection, observeRelationItem);

    function itemCompare(a, b) {
        return Object.compare(a[1], b[1]) * order;
    }
    function itemEquals(a, b) {
        return Object.equals(a[1], b[1]);
    }

    return function (emit, source, parameters, beforeChange) {

        return observeRelationItems(autoCancelPrevious(function (input) {
            if (!input) return emit();

            var heap = new Heap(null, itemEquals, itemCompare);

            function rangeChange(plus, minus) {
                heap.addEach(plus);
                heap.deleteEach(minus);
            }

            function heapChange(item, key) {
                if (key === 0) {
                    if (!item) {
                        return emit();
                    } else {
                        return emit(item[0]);
                    }
                }
            }

            var cancelRangeChange = observeRangeChange(input, rangeChange);
            var cancelHeapChange = observeMapChange(heap, heapChange, beforeChange);

            return function cancelHeapObserver() {
                cancelRangeChange();
                cancelHeapChange();
            };
        }), source, parameters, beforeChange);
    };
}

exports.makeMaxBlockObserver = makeMaxBlockObserver;
function makeMaxBlockObserver(observeCollection, observeRelation) {
    return makeHeapBlockObserver(observeCollection, observeRelation, 1);
}

exports.makeMinBlockObserver = makeMinBlockObserver;
function makeMinBlockObserver(observeCollection, observeRelation) {
    return makeHeapBlockObserver(observeCollection, observeRelation, -1);
}

exports.makeOperatorObserverMaker = makeOperatorObserverMaker;
function makeOperatorObserverMaker(operator) {
    return function makeOperatorObserver(/*...observers*/) {
        var observeOperands = makeObserversObserver(Array.prototype.slice.call(arguments));
        var observeOperandChanges = makeRangeContentObserver(observeOperands);
        return function observeOperator(emit, source, parameters, beforeChange) {
            return observeOperandChanges(autoCancelPrevious(function (operands) {
                if (operands.every(defined)) {
                    return emit(operator.apply(void 0, operands));
                } else {
                    return emit()
                }
            }), source, parameters, beforeChange);
        };
    };
}

exports.makeMethodObserverMaker = makeMethodObserverMaker;
function makeMethodObserverMaker(name) {
    return function makeMethodObserver(/*...observers*/) {
        var observeOperands = makeObserversObserver(Array.prototype.slice.call(arguments));
        var observeOperandChanges = makeRangeContentObserver(observeOperands);
        return function observeMethod(emit, source, parameters, beforeChange) {
            return observeOperands(autoCancelPrevious(function (operands) {
                var object = operands.shift();
                if (!object)
                    return emit();
                if (!object[name]) {
                    throw new Error("Object has no method " + JSON.stringify(name) + ": " + object);
                }
                return emit(object[name].apply(object, operands));
            }), source, parameters, beforeChange);
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
    return function observeObservers(emit, source, parameters, beforeChange) {
        var output = Array(observers.length);
        for (var i = 0; i < observers.length; i++) {
            output[i] = undefined; // pevent sparse/holes
        }
        var cancelers = observers.map(function observeObserver(observe, index) {
            return observe(function replaceValue(value) {
                output.set(index, value);
            }, source, parameters, beforeChange);
        })
        var cancel = emit(output) || Function.noop;
        return once(function cancelObserversObserver() {
            cancel();
            cancelEach(cancelers);
        });
    };
}

// calculating the reflected index for an incremental change:
// [0, 1, 2, 3]  length 4
//     -------  -4 (1+3)
// --------    0-  (outer.length - index - inner.length)
exports.makeReversedObserver = makeNonReplacing(makeReplacingReversedObserver);
function makeReplacingReversedObserver(observeArray) {
    return function observeReversed(emit, source, parameters, beforeChange) {
        return observeArray(autoCancelPrevious(function (input) {
            if (!input) return emit();

            var output = [];
            function rangeChange(plus, minus, index) {
                var reflected = output.length - index - minus.length;
                output.swap(reflected, minus.length, plus.reversed());
            };
            var cancelRangeChange = observeRangeChange(input, rangeChange, beforeChange);
            var cancel = emit(output);
            return once(function cancelReversedObserver() {
                cancel();
                cancelRangeChange();
            });
        }), source, parameters, beforeChange);
    };
}

exports.makeViewObserver = makeNonReplacing(makeReplacingViewObserver);
function makeReplacingViewObserver(observeInput, observeStart, observeLength) {
    return function observeView(emit, source, parameters, beforeChange) {
        return observeInput(autoCancelPrevious(function (input) {
            if (!input) return emit();
            return observeLength(autoCancelPrevious(function (length) {
                if (length == null) return emit();
                var previousStart;
                return observeStart(autoCancelPrevious(function (start) {
                    if (start == null) return emit();
                    var output = [];
                    function rangeChange(plus, minus, index) {
                        var diff = plus.length - minus.length;
                        if (index < start && diff < 0 && diff < length) { // shrink before
                            // inject elements at the end
                            output.swap(output.length, 0, input.slice(start + length + diff, start + length));
                            // remove elements at the beginning
                            output.splice(0, -diff);
                        } else if (index < start && diff > 0 && diff < length) { // grow before
                            // inject elements
                            output.swap(0, 0, input.slice(start, start + diff));
                            // remove elements from end
                            output.splice(output.length - diff, diff);
                        } else if (index >= start && diff < 0 && index < start + length) { // shrink within
                            // inject elements to end
                            output.swap(output.length, 0, input.slice(start + length + diff, start + length));
                            // remove elements from within
                            output.splice(index - start, -diff);
                        } else if (index >= start && diff > 0 && index < start + length) { // grow within
                            // inject elements within
                            output.swap(index - start, 0, input.slice(index, index + diff));
                            // remove elements from end
                            output.splice(output.length - diff, diff);
                        } else if (index < start + length) {
                            output.swap(0, output.length, input.slice(start, start + length));
                        }
                    }
                    var cancelRangeChange = observeRangeChange(input, rangeChange, beforeChange);
                    var cancel = emit(output) || Function.noop;
                    return once(function cancelViewObserver() {
                        cancel();
                        cancelRangeChange();
                    });
                }), source, parameters, beforeChange);
            }), source, parameters, beforeChange);
        }), source, parameters, beforeChange);
    };
}

exports.makeFlattenObserver = makeNonReplacing(makeReplacingFlattenObserver);
function makeReplacingFlattenObserver(observeArray) {
    return function (emit, source, parameters, beforeChange) {
        return observeArray(autoCancelPrevious(function (input) {
            if (!input) return emit();

            var output = [];
            var cancelers = [];
            var cumulativeLengths = [0];
            var indexRefs = [];

            function update(i) {
                for (var j = i; j < input.length; j++) {
                    indexRefs[j].index = j;
                    cumulativeLengths[j + 1] = cumulativeLengths[j] + input[j].length;
                }
            }

            function rangeChange(plus, minus, i) {

                // minus
                var start = cumulativeLengths[i];
                var end = cumulativeLengths[i + minus.length];
                var length = end - start;
                output.swap(start, length, []);

                indexRefs.swap(i, minus.length, plus.map(function () {
                    return {index: null};
                }));
                update(i);

                // plus
                cancelEach(cancelers.swap(
                    i,
                    minus.length,
                    plus.map(function (inner, j) {
                        var index = indexRefs[i + j];
                        function innerRangeChange(plus, minus, k) {
                            update(index.index);
                            var start = cumulativeLengths[index.index] + k;
                            var end = cumulativeLengths[index.index] + k + minus.length;
                            var length = end - start;
                            output.swap(start, length, plus);
                        }
                        return observeRangeChange(inner, innerRangeChange, beforeChange);
                    })
                ));

            }

            var cancelRangeChange = observeRangeChange(input, rangeChange, beforeChange);
            var cancel = emit(output) || Function.noop;

            return once(function cancelFlattenObserver() {
                cancel();
                cancelEach(cancelers);
                cancelRangeChange();
            });
        }), source, parameters, beforeChange);
    };
}

exports.makeEnumerationObserver = makeNonReplacing(makeReplacingEnumerationObserver);
function makeReplacingEnumerationObserver(observeArray) {
    return function (emit, source, parameters, beforeChange) {
        return observeArray(autoCancelPrevious(function replaceArray(input) {
            if (!input) return emit();

            var output = [];
            function update(index) {
                for (; index < output.length; index++) {
                    output[index].set(0, index);
                }
            }
            function rangeChange(plus, minus, index) {
                output.swap(index, minus.length, plus.map(function (value, offset) {
                    return [index + offset, value];
                }));
                update(index + plus.length);
            }
            var cancelRangeChange = observeRangeChange(input, rangeChange, beforeChange);
            var cancel = emit(output) || Function.noop;
            return function cancelEnumerationObserver() {
                cancel();
                cancelRangeChange();
            };
        }), source, parameters, beforeChange);
    };
}

exports.makeRangeObserver = makeRangeObserver;
function makeRangeObserver(observeLength) {
    return function observeRange(emit, source, parameters, beforeChange) {
        var output = [];
        var cancel = emit(output) || Function.noop;
        var cancelLengthObserver = observeLength(function (length) {
            length = length >>> 0;
            if (length == null) {
                output.clear();
            } else if (length > output.length) {
                // pre-fab the extension so the we only have to propagate one
                // range change to the output.
                var extension = [];
                for (var i = output.length; i < length; i++) {
                    extension.push(i);
                }
                output.swap(output.length, 0, extension);
            } else if (length < output.length) {
                output.splice(length, output.length);
            }
        }, source, parameters, beforeChange);
        return function cancelObserveRange() {
            cancel();
            cancelLengthObserver();
        };
    };
}

exports.makeStartsWithObserver = makeStartsWithObserver;
function makeStartsWithObserver(observeHaystack, observeNeedle) {
    return function observeStartsWith(emit, source, parameters, beforeChange) {
        return observeNeedle(function (needle) {
            var expression = new RegExp("^" + RegExp.escape(needle));
            return observeHaystack(function (haystack) {
                return emit(expression.test(haystack)) || Function.noop;
            }, source, parameters, beforeChange);
        }, source, parameters, beforeChange);
    }
}

exports.makeEndsWithObserver = makeEndsWithObserver;
function makeEndsWithObserver(observeHaystack, observeNeedle) {
    return function observeEndsWith(emit, source, parameters, beforeChange) {
        return observeNeedle(function (needle) {
            var expression = new RegExp(RegExp.escape(needle) + "$");
            return observeHaystack(function (haystack) {
                return emit(expression.test(haystack)) || Function.noop;
            }, source, parameters, beforeChange);
        }, source, parameters, beforeChange);
    }
}

exports.makeContainsObserver = makeContainsObserver;
function makeContainsObserver(observeHaystack, observeNeedle) {
    return function observeContains(emit, source, parameters, beforeChange) {
        return observeNeedle(function (needle) {
            var expression = new RegExp(RegExp.escape(needle));
            return observeHaystack(function (haystack) {
                return emit(expression.test(haystack)) || Function.noop;
            }, source, parameters, beforeChange);
        }, source, parameters, beforeChange);
    }
}

// a utility for generating map and filter observers because they both replace
// the output array whenever the input array is replaced.  instead, this
// wrapper receives the replacement array and mirrors it on an output array
// that only gets emitted once.
function makeNonReplacing(wrapped) {
    return function () {
        var observe = wrapped.apply(this, arguments);
        return function (emit, source, parameters, beforeChange) {
            var output = [];
            var cancelObserver = observe(autoCancelPrevious(function (input) {
                if (!input) {
                    output.clear();
                } else {
                    output.swap(0, output.length, input);
                    function rangeChange(plus, minus, index) {
                        output.swap(index, minus.length, plus);
                    }
                    // TODO fix problem that this would get called twice on replacement
                    return once(input.addRangeChangeListener(rangeChange, null, beforeChange));
                }
            }), source, parameters, beforeChange);
            var cancel = emit(output) || Function.noop;
            return once(function cancelNonReplacingObserver() {
                cancelObserver();
                cancel();
            });
        };
    };
}

exports.makeSumObserver = makeCollectionObserverMaker(function setup() {
    var sum = 0;
    return function rangeChange(plus, minus, index) {
        sum += plus.sum() - minus.sum();
        return sum;
    };
});

exports.makeAverageObserver = makeCollectionObserverMaker(function setup() {
    var sum = 0;
    var count = 0;
    return function rangeChange(plus, minus, index) {
        sum += plus.sum() - minus.sum();
        count += plus.length - minus.length;
        return sum / count;
    };
});

// a utility for generating sum and average observers since they both need to
// capture some internal state on intiailization, and update that state on
// range changes.
function makeCollectionObserverMaker(setup) {
    return function (observeCollection) {
        return function (emit, source, parameters, beforeChange) {
            emit = makeUniq(emit);
            return observeCollection(autoCancelPrevious(function (collection) {
                if (!collection) return emit();
                var rangeChange = setup(collection, emit);
                return observeRangeChange(collection, function (plus, minus, index) {
                    return emit(rangeChange(plus, minus, index));
                });
            }), source, parameters, beforeChange);
        };
    };
}

exports.observeRangeChange = observeRangeChange;
function observeRangeChange(collection, emit, beforeChange) {
    var cancelChild = Function.noop;
    function rangeChange(plus, minus, index) {
        cancelChild();
        cancelChild = emit(plus, minus, index) || Function.noop;
    }
    rangeChange(collection, [], 0);
    if (!collection.addRangeChangeListener) {
        throw new Error("Can't observe range changes on " + collection);
    }
    var cancelRangeChange = collection.addRangeChangeListener(rangeChange, beforeChange);
    return once(function cancelRangeObserver() {
        cancelChild();
        cancelRangeChange();
    });
}

exports.observeMapChange = observeMapChange;
function observeMapChange(collection, emit, beforeChange) {
    var cancelers = Map();
    function mapChange(value, key, collection) {
        var cancelChild = cancelers.get(key) || Function.noop;
        cancelChild();
        cancelChild = emit(value, key, collection) || Function.noop;
        cancelers.set(key, cancelChild);
    }
    collection.forEach(mapChange);
    var cancelMapChange = collection.addMapChangeListener(mapChange, beforeChange);
    return once(function cancelMapObserver() {
        cancelers.forEach(function (cancel) {
            cancel();
        });
        cancelMapChange();
    });
}

var makeItemsObserver = exports.makeItemsObserver = makeNonReplacing(makeReplacingItemsObserver);
function makeReplacingItemsObserver(observeCollection) {
    return function _observeItems(emit, source, parameters, beforeChange) {
        return observeCollection(autoCancelPrevious(function (collection) {
            if (!collection) return emit();
            return observeItems(collection, emit, beforeChange);
        }), source, parameters, beforeChange);
    };
}

exports.observeItems = observeItems;
function observeItems(collection, emit, beforeChange) {
    var items = [];
    var keyToItem = Map();
    var cancel = emit(items) || Function.noop;
    // TODO observe addition and deletion with separate observers
    function mapChange(value, key, collection) {
        var item, index;
        if (!keyToItem.has(key)) { // add
            item = [key, value];
            keyToItem.set(key, item);
            items.push(item);
        } else if (value == null) { // delete
            item = keyToItem.get(key);
            keyToItem["delete"](key);
            index = items.indexOf(item);
            items.splice(index, 1);
        } else { // update
            item = keyToItem.get(key);
            item.set(1, value);
        }
    }
    var cancelMapChange = observeMapChange(collection, mapChange, beforeChange);
    return once(function cancelObserveItems() {
        cancel();
        cancelMapChange();
    });
}

exports.makeKeysObserver = makeKeysObserver;
function makeKeysObserver(observeCollection) {
    var observeItems = makeItemsObserver(observeCollection);
    return makeMapBlockObserver(observeItems, observeItemKey);
}

exports.observeItemKey = observeItemKey;
function observeItemKey(emit, source) {
    if (!source) return emit();
    return emit(source[0]) || Function.noop;
}

exports.makeValuesObserver = makeValuesObserver;
function makeValuesObserver(observeCollection) {
    var observeItems = makeItemsObserver(observeCollection);
    return makeMapBlockObserver(observeItems, observeItemValue);
}

exports.observeItemValue = observeItemValue;
function observeItemValue(emit, source) {
    if (!source) return emit();
    return emit(source[1]) || Function.noop;
}

exports.makeToMapObserver = makeToMapObserver;
function makeToMapObserver(observeObject) {
    return function observeToMap(emit, source, parameters, beforeChange) {
        var map = Map();
        var cancel = emit(map) || Function.noop;

        var cancelObjectObserver = observeObject(autoCancelPrevious(function replaceObject(object) {
            map.clear();
            if (!object) return;

            if (object.addRangeChangeListener) { // array/collection of items

                // TODO

            } else { // object literal

                var cancelers = Object.keys(object).map(function (key) {
                    return _observeProperty(object, key, autoCancelPrevious(function (value) {
                        map.set(key, value);
                    }), source, parameters, beforeChange);
                });
                return function cancelPropertyObservers() {
                    cancelEach(cancelers);
                };

            }
        }), source, parameters, beforeChange);

        return function cancelObjectToMapObserver() {
            cancel();
            cancelObjectObserver();
        };
    };
}

// Utility Methods
// ---------------

function defined(x) {
    return x != null;
}

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

exports.cancelEach;
function cancelEach(cancelers) {
    cancelers.forEach(function (cancel) {
        if (cancel) {
            cancel();
        }
    });
}

// wraps an emitter that returns a canceler.  each time the wrapped function is
// called, it cancels the previous canceler, and calls the last canceler when
// it is canceled.  this is useful for observers that update a value and attach
// a new event listener tree to the value.
exports.autoCancelPrevious = autoCancelPrevious;
function autoCancelPrevious(emit) {
    var cancelPrevious = Function.noop;
    return function cancelPreviousAndReplace(value) {
        cancelPrevious();
        cancelPrevious = emit.apply(this, arguments) || Function.noop;
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
            return Function.noop; // TODO fix bugs that make this sensitive
            //throw new Error("Redundant call: " + callback + " " + done.stack + "\nSecond call:");
        }
        done = true;
        //done = new Error("First call:");
        return callback.apply(this, arguments);
    }
}

