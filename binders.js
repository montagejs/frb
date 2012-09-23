
var Observers = require("./observers");
var autoCancelPrevious = Observers.autoCancelPrevious;

exports.makePropertyBinder = makePropertyBinder;
function makePropertyBinder(observeObject, observeKey) {
    return function (observeValue, source, target, parameters) {
        return observeObject(autoCancelPrevious(function (object) {
            return observeKey(autoCancelPrevious(function (key) {
                return observeValue(autoCancelPrevious(function (value) {
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

