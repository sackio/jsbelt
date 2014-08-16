'use strict';

var Belt = require('../lib/belt.js')
  , Async = require('async');

/*
  ======== A Handy Little Nodeunit Reference ========
  https://github.com/caolan/nodeunit

  Test methods:
    test.expect(numAssertions)
    test.done()
  Test assertions:
    test.ok(value, [message])
    test.equal(actual, expected, [message])
    test.notEqual(actual, expected, [message])
    test.deepEqual(actual, expected, [message])
    test.notDeepEqual(actual, expected, [message])
    test.strictEqual(actual, expected, [message])
    test.notStrictEqual(actual, expected, [message])
    test.throws(block, [error], [message])
    test.doesNotThrow(block, [error], [message])
    test.ifError(value)
*/

exports['unitTests'] = {
  setUp: function(done) {
    done();
  }
, 'noop': function(test) {
    test.expect(1);

    test.ok(Belt.noop && Belt.noop() === undefined);

    test.done();
  }
, 'callwrap': function(test) {
    test.expect(4);

    return Async.waterfall([
      function(cb){
        return Belt.callwrap(cb)(1, 2, 3);
      }
    , function(cb){
        test.ok(arguments.length === 1);
        return cb();
      }
    , function(cb){
        return Belt.callwrap(cb, [0, 1])(null, 2, 3);
      }
    , function(num, cb){
        test.ok(arguments.length === 2);
        test.ok(num === 2);
        return cb();
      }
    ], function(err){
     test.ok(!err);
     return test.done();
    });
  }
, 'callset': function(test) {
    test.expect(7);

    var globals = {};

    return Async.waterfall([
      function(cb){
        return Belt.callset(cb, globals, 'first', 0)(1, 2, 3);
      }
    , function(cb){
        test.ok(globals.first === 1);
        return cb();
      }
    , function(cb){
        return Belt.callset(cb, globals, 'second', 1)(1, 2, 3);
      }
    , function(cb){
        test.ok(globals.second === 2);
        return cb();
      }
    , function(cb){
        return Belt.callset(cb, globals, 'nonexistent', 10)(1, 2, 3);
      }
    , function(cb){
        test.ok(!globals.nonexistent);
        return cb();
      }
    , function(cb){
        return Belt.callset(cb, globals, 'third', 2, [0, 1])(null, 2, 3);
      }
    , function(num, cb){
        test.ok(globals.third === 3);
        test.ok(arguments.length === 2);
        test.ok(num === 2);
        return cb();
      }
    ], function(err){
     test.ok(!err);
     return test.done();
    });
  }
, 'copy': function(test) {
    test.expect(6);

    var obj = 1
      , new_obj;

    new_obj = Belt.copy(obj);
    obj = 2;
    test.ok(new_obj === 1);

    obj = {'deep': [{'copy': 1}, 2]};
    new_obj = Belt.copy(obj);
    obj.deep[0] = 3;
    test.ok(new_obj.deep[0].copy === 1);
    test.ok(new_obj.deep[1] === 2);

    obj = {'deep': [{'copy': 1}, 2]};
    new_obj = Belt.copy(obj, true);
    test.ok(new_obj.deep[0].copy === 1);
    test.ok(new_obj.deep[1] === 2);

    obj.deep[0] = 3;
    test.ok(new_obj.deep[0] === 3);

    return test.done();
  }
, 'deepProp': function(test) {
    test.expect(6);

    var obj = {'deep': [{'copy': 1}, 2]};

    test.ok(Belt.deepProp(obj, 'deep.0.copy') === 1);
    test.ok(Belt.deepProp(obj, 'deep.1') === 2);
    test.ok(!Belt.deepProp(obj, 'does.not.exist'));
    test.ok(Belt.deepProp(obj, '.deep.1') === 2);
    test.ok(!Belt.deepProp(obj, '.deep.1.'));
    test.deepEqual(Belt.deepProp(obj), obj);

    return test.done();
  }
, 'isPropDefined': function(test) {
    test.expect(2);

    var obj = {'deep': [{'copy': 1}, 2]};

    test.ok(Belt.isPropDefined(obj, 'deep.0.copy') === true);
    test.ok(Belt.isPropDefined(obj, 'deep.0.not') === false);

    return test.done();
  }
, 'setDeepProp': function(test) {
    test.expect(5);

    var obj = {'deep': [{'copy': 1}, 2]};

    Belt.setDeepProp(obj, 'deep.0.copy', 3);
    test.ok(Belt.deepProp(obj, 'deep.0.copy') === 3);
    Belt.setDeepProp(obj, '.deep.0.copy', 4);
    test.ok(Belt.deepProp(obj, 'deep.0.copy') === 4);
    Belt.setDeepProp(obj, '.deep.0.copy.', 5);
    test.ok(Belt.deepProp(obj, 'deep.0.copy') === 5);

    Belt.setDeepProp(obj, 'deep.object.that.does.not.yet.exist', 10);
    test.ok(Belt.deepProp(obj, 'deep.object.that.does.not.yet.exist') === 10);

    obj = Belt.setDeepProp(obj, '', 10);
    test.ok(obj === 10);

    return test.done();
  }
, 'deepDefault': function(test) {
    test.expect(2);

    var obj = {'deep': {'copy': 1}};

    Belt.deepDefault(obj, 'deep.copy.extended', 3);
    test.ok(Belt.deepProp(obj, 'deep.copy.extended') === 3);
    Belt.deepDefault(obj, 'deep.copy.extended', 4);
    test.ok(Belt.deepProp(obj, 'deep.copy.extended') === 3);

    return test.done();
  }
, 'sequence': function(test) {
    test.expect(6);

    var array = Belt.sequence(function(i){ return i; }, 20);

    test.ok(array.length === 20);
    test.deepEqual(array, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);

    array = Belt.sequence(function(i, count){ return count; }, 5);
    test.ok(array.length === 5);
    test.deepEqual(array, [5, 5, 5, 5, 5]);

    var fibSeq = Belt.sequence(function(i, count){
      if (i < 2) return 1;
      return this[i - 2] + this[i - 1];
    }, 10);
    test.ok(fibSeq.length === 10);
    test.deepEqual(fibSeq, [1, 1, 2, 3, 5, 8, 13, 21, 34, 55]);

    return test.done();
  }
, 'nullArray': function(test) {
    test.expect(21);

    var array = Belt.nullArray(20);

    test.ok(array.length === 20);
    array.forEach(function(e){
      test.ok(e === undefined);
    });

    return test.done();
  }
, 'toArray and deepEqual': function(test) {
    test.expect(4);

    var array = [1, 2, 3]
      , a = 3;

    test.deepEqual(Belt.toArray(array), array);
    test.deepEqual(Belt.toArray(a), [3]);
    test.ok(Belt.deepEqual(Belt.toArray(array), array));
    test.ok(Belt.deepEqual(Belt.toArray(a), [3]));

    return test.done();
  }
, 'defObj': function(test) {
    test.expect(4);

    var keys = ['first', 'second', 'third']
      , obj = Belt.defObj(keys, 4);

    test.ok(Object.keys(obj).length === keys.length);
    for (var k in obj){
      test.ok(obj[k] === 4);
    }

    return test.done();
  }
, 'uuid': function(test) {
    test.expect(500);

    var uuids = {};
    for (var i = 0; i < 500; i++){
      var id = Belt.uuid();
      test.ok(!uuids[id]);
      uuids[id] = true;
    }

    return test.done();
  }
, 'fix_precision': function(test) {
    test.expect(3);

    var float = 6.2240000000000003;
    test.ok(Belt.fix_precision(float) === 6.224);
    test.ok(Belt.fix_precision(float).toString() === '6.224');
    test.ok(Belt.fix_precision(float, 2) === 6.22);

    return test.done();
  }
, 'argulint': function(test) {
    //test.expect(7);

    return Async.waterfall([
      function(cb){
        return (function(arg1, arg2, opts, callback){
          var args = Belt.argulint(arguments);
          test.ok(Belt.deepEqual(args.options, arguments[2]));
          test.ok(args.callback === cb);
          return cb();
        })(1, 2, {'test': 'a'}, cb);
      }
    , function(cb){
        return (function(arg1, arg2, opts, callback){
          var args = Belt.argulint(arguments);
          test.ok(Belt.deepEqual(args.options, arguments[2]));
          test.ok(args.callback === Belt.noop);
          return cb();
        })(1, 2, {'test': 'a'});
      }
    , function(cb){
        return (function(arg1, arg2, opts, callback){
          var args = Belt.argulint(arguments);
          test.ok(Belt.deepEqual(args.options, {}));
          test.ok(args.callback === Belt.noop);
          return cb();
        })(1, 2);
      }
    , function(cb){
        return (function(arg1, arg2, opts, callback){
          var args = Belt.argulint(arguments);
          test.ok(Belt.deepEqual(args.options, {}));
          test.ok(args.callback === cb);
          return cb();
        })(1, 2, cb);
      }
    , function(cb){
        return (function(arg1, arg2, opts, callback){
          var args = Belt.argulint(arguments);
          test.ok(Belt.deepEqual(args.options, arguments[3]));
          test.ok(args.callback === cb);
          return cb();
        })(1, 2, cb, {'test': 'a'});
      }
    , function(cb){
        return (function(arg1, arg2, opts, callback){
          var args = Belt.argulint(arguments, {'no_callback': true});
          test.ok(Belt.deepEqual(args.options, arguments[3]));
          test.ok(!args.callback);
          return cb();
        })(1, 2, cb, {'test': 'a'});
      }
    , function(cb){
        return (function(arg1, arg2, opts, callback){
          var args = Belt.argulint(arguments, {'options': {}});
          test.ok(!Belt.deepEqual(args.options, arguments[3]));
          test.ok(Belt.deepEqual(args.options, {}));
          test.ok(args.callback === cb);
          return cb();
        })(1, 2, cb, {'test': 'a'});
      }
    , function(cb){
        return (function(arg1, arg2, opts, callback){
          var args = Belt.argulint(arguments, {'callback': Belt.noop});
          test.ok(Belt.deepEqual(args.options, arguments[2]));
          test.ok(args.callback !== cb);
          test.ok(args.callback === Belt.noop);
          return cb();
        })(1, 2, {'test': 'a'});
      }
    ], function(err){
     test.ok(!err);
     return test.done();
    });
  }
};
