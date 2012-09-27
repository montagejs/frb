
module.exports = makeParserFromTrie;
function makeParserFromTrie(trie) {
    var children = {};
    var characters = Object.keys(trie.children);
    characters.forEach(function (character) {
        children[character] = makeParserFromTrie(trie.children[character]);
    });
    return characters.reduceRight(function (next, expected) {
        return function (callback, rewind) {
            rewind = rewind || identity;
            return function (character, loc) {
                if (character === expected) {
                    return children[character](callback, function (callback) {
                        return rewind(callback)(character, loc);
                    });
                } else {
                    return next(callback, rewind)(character, loc);
                }
            };
        };
    }, function (callback, rewind) {
        rewind = rewind || identity;
        return callback(trie.value, rewind);
    });
}

function identity(x) {return x;}

