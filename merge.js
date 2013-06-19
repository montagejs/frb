
require("collections/shim");

exports.computeAllPathsAndCosts = computeAllPathsAndCosts;
function computeAllPathsAndCosts(target, source) {
    var size = (source.length + 1) * (target.length + 1);

    var directions = Array(size);
    var costs = Array(size);

    for (var t = 0; t < target.length + 1; t++) {
        for (var s = 0; s < source.length + 1; s++) {
            var direction, cost;
            if (t === 0 && s === 0) {
                direction = " ";
                cost = 0;
            } else if (t === 0) {
                direction = "T";
                cost = s;
            } else if (s === 0) {
                direction = "S";
                cost = t;
            } else if (target[t - 1] === source[s - 1]) {
                direction = "B";
                cost = costs[(t - 1) + (s - 1) * (target.length + 1)];
            } else {
                var sCost = costs[(t - 1) + s * (target.length + 1)];
                var tCost = costs[t + (s - 1) * (target.length + 1)];
                // favoring the source tends to produce more removal followed
                // by insertion, which packs into a swap transforms better
                if (sCost < tCost) {
                    direction = "S";
                    cost = sCost + 1;
                } else {
                    direction = "T";
                    cost = tCost + 1;
                }
            }
            directions[t + s * (target.length + 1)] = direction;
            costs[t + s * (target.length + 1)] = cost;
        }
    }

    return {directions: directions, costs: costs};
}

exports.computeOperationalTransform = computeOperationalTransform;
function computeOperationalTransform(dc, target, source) {
    var directions = dc.directions;
    var costs = dc.costs;

    // back track
    var plan = [];
    var t = target.length;
    var s = source.length;
    var previous;
    while (t || s) {
        var direction = directions[t + s * (target.length + 1)];
        if (direction === "S") {
            if (previous && previous[0] === "delete") {
                previous[1]++;
            } else {
                var op = ["delete", 1];
                previous = op;
                plan.push(op);
            }
            t--;
        } else if (direction === "T") {
            if (previous && previous[0] === "insert") {
                previous[1]++;
            } else {
                var op = ["insert", 1];
                previous = op;
                plan.push(op);
            }
            s--;
        } else if (direction === "B") {
            var op = ["retain", 1];
            if (previous && previous[0] === "retain") {
                previous[1]++;
            } else {
                previous = op;
                plan.push(op);
            }
            t--; s--;
        }
    }
    plan.reverse();
    return plan;
}

exports.ot = ot;
function ot(target, source) {
    var graphAndCosts = computeAllPathsAndCosts(target, source);
    return computeOperationalTransform(graphAndCosts, target, source);
}

exports.diff = diff;
function diff(target, source) {
    var plan = ot(target, source);

    // convert plan to splice/swap operations
    var t = 0;
    var s = 0;
    var p = 0;
    var previous;
    var swaps = [];
    while (p < plan.length) {
        var op = plan[p++];
        if (op[0] === "insert") {
            swaps.push([s, 0, source.slice(s, s + op[1])]);
            s += op[1];
        } else if (op[0] === "delete") {
            if (p < plan.length && plan[p][0] === "insert") {
                var insert = plan[p++];
                swaps.push([s, op[1], source.slice(s, s + insert[1])]);
                t += op[1];
                s += insert[1];
            } else {
                swaps.push([s, op[1]]);
                t += op[1];
            }
        } else if (op[0] == "retain") {
            t += op[1];
            s += op[1];
        }
    }

    return swaps;
}

exports.apply = apply;
function apply(target, patch) {
    for (var s = 0; s < patch.length; s++) {
        target.swap.apply(target, patch[s]);
    }
}

exports.merge = merge;
function merge(target, source) {
    var patch = diff(target, source);
    apply(target, patch);
}

