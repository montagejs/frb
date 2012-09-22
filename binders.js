
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
function makeHasBinder(observeSet, observeSought) {
    return function (observeValue, source, target, parameters) {
        return observeSet(autoCancelPrevious(function (set) {
            return observeSought(autoCancelPrevious(function (sought) {
                return observeValue(autoCancelPrevious(function (value) {
                    // wait for the initial value to be updated by the
                    // other-way binding
                    if (value === undefined) {
                    } else if (value) { // should be in set
                        if (!(set.has || set.contains).call(set, sought)) {
                            set.add(sought);
                        }
                    } else { // should not be in set
                        while ((set.has || set.contains).call(set, sought)) {
                            (set.remove || set['delete']).call(set, sought);
                        }
                    }
                }), target, parameters);
            }), source, parameters);
        }), source, parameters);
    };
}

