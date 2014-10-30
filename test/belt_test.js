'use strict';

var Belt = require('../lib/belt.js')
  , Async = require('async');

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
    test.expect(9);

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
    , function(cb){
        return Async.waterfall([
          function(_cb){
            return Belt.callset(_cb, globals, 'set_index', 1, 0)('hello', 2);
          }
        ], function(err){
          test.ok(err === 'hello');
          test.ok(globals.set_index === 2);

          return cb();
        });
      }
    ], function(err){
     test.ok(!err);
     return test.done();
    });
  }
, 'deepcallset': function(test) {
    //test.expect(9);

    var globals = {};

    return Async.waterfall([
      function(cb){
        return Belt.dcs(cb, globals, 'first', 0, 'foo.bar')({'foo': {'bar': 'baz'}}, 2, 3);
      }
    , function(cb){
        test.ok(globals.first === 'baz');
        return cb();
      }
    , function(cb){
        return Belt.dcs(cb, globals, 'first', 0, 'foo.bar.0.test')({'foo': {'bar': 'baz'}}, 2, 3);
      }
    , function(cb){
        test.ok(!globals.first);
        return cb();
      }
    , function(cb){
        return Belt.dcs(function(err){
          test.ok(err);
          return cb();
        }, globals, 'first', 1, 'foo.bar.0.test', 0, {'err_on_miss': true})(null, {'foo': {'bar': 'baz'}});
      }
    ], function(err){
     test.ok(!err);
     return test.done();
    });
  }
, 'deepcalldeepset': function(test) {
    //test.expect(9);

    var globals = {};

    return Async.waterfall([
      function(cb){
        return Belt.dcds(cb, globals, 'first.monkey', 0, 'foo.bar')({'foo': {'bar': 'baz'}}, 2, 3);
      }
    , function(cb){
        test.ok(globals.first.monkey === 'baz');
        return cb();
      }
    , function(cb){
        return Belt.dcds(cb, globals, 'first.elephant', 0, 'foo.bar.0.test')({'foo': {'bar': 'baz'}}, 2, 3);
      }
    , function(cb){
        test.ok(!globals.first.elephant);
        return cb();
      }
    , function(cb){
        return Belt.dcds(function(err){
          test.ok(err);
          return cb();
        }, globals, 'first.donkey.0.pie', 1, 'foo.bar.0.test', 0, {'err_on_miss': true})(null, {'foo': {'bar': 'baz'}});
      }
    , function(cb){
        return Belt.dcds(function(err){
          test.ok(err);
          return cb();
        }, globals, 'first.donkey.0.pie', 1, 'foo.bar.0.test', 0)(true, {'foo': {'bar': 'baz'}});
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
    test.ok(Belt.deepEqual(Belt.deepProp(obj), obj));

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
, 'deepCall': function(test) {
    test.expect(2);

    var t = Belt._call('test', 'replace', /test/, 'pass');
    test.ok(t === 'pass');
    t = Belt._call(t, 'madeupfunction', 1, 2, 3);
    test.ok(t === undefined);

    return test.done();
  }
, 'chainCall': function(test) {
    test.expect(5);

    var t = Belt._chain('test', ['replace', /test/, 'pass'], ['replace', /pass/, 'shoe']);
    test.ok(t === 'shoe');
    t = Belt._chain(t, ['replace', /test/, 'pass'], ['madeup', /pass/, 'shoe']);
    test.ok(t === undefined);

    var o = {'object': 'version'};
    t = {'object': 2};
    test.ok(Belt._call(o, 'object.match', /^version$|^output:/i));
    test.ok(!Belt._call(o, 'object.doesnotexist', /^version$|^output:/i));
    test.ok(!Belt._call(t, 'object.match', /^version$|^output:/i));

    return test.done();
  }
, 'deepFind': function(test) {
    test.expect(10);
    var t = {'deep': {'find': 'this'}};

    test.ok(Belt._find(t, 'deepfind') === 'this');
    test.ok(Belt._find(t, 'de.e.pfi.n.d') === 'this');
    test.ok(!Belt._find(t, 'de.e.pfi.n.d.notexistent'));
    test.ok(!Belt._find(t, 'de.e.pf'));
    test.ok(Belt.deepEqual(Belt._find(t, 'de.e.p...'), t.deep));
    test.ok(Belt.deepEqual(Belt._find(t, '......'), t));
    test.ok(Belt.deepEqual(Belt._find(t, undefined), t));
    test.ok(Belt.deepEqual(Belt._find(t, ''), t));
    test.ok(Belt.deepEqual(Belt._find('foobar', undefined), 'foobar'));
    test.ok(!Belt._find('foobar', 'something.else.here'));

    return test.done();
  }
, 'sequence': function(test) {
    test.expect(6);

    var array = Belt.sequence(function(i){ return i; }, 20);

    test.ok(array.length === 20);
    test.ok(Belt.deepEqual(array, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]));

    array = Belt.sequence(function(i, count){ return count; }, 5);
    test.ok(array.length === 5);
    test.ok(Belt.deepEqual(array, [5, 5, 5, 5, 5]));

    var fibSeq = Belt.sequence(function(i, count){
      if (i < 2) return 1;
      return this[i - 2] + this[i - 1];
    }, 10);
    test.ok(fibSeq.length === 10);
    test.ok(Belt.deepEqual(fibSeq, [1, 1, 2, 3, 5, 8, 13, 21, 34, 55]));

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
, 'defArray': function(test) {
    test.expect(21);

    var array = Belt.defArray(20, 5);

    test.ok(array.length === 20);
    array.forEach(function(e){
      test.ok(e === 5);
    });

    return test.done();
  }
, 'array methods': function(test) {
    //test.expect(6);

    var array = [1, 2, 3]
      , a = 3;

    test.ok(Belt.deepEqual(Belt.toArray(array), array));
    test.ok(Belt.deepEqual(Belt.toArray(a), [3]));
    test.ok(Belt.deepEqual(Belt.toArray(array), array));
    test.ok(Belt.deepEqual(Belt.toArray(a), [3]));

    var a2 = [1];

    test.ok(Belt.deepEqual(Belt.deArray(array), array));
    test.ok(Belt.deepEqual(Belt.deArray(a2), a2[0]));

    test.ok(Belt.deepEqual(Belt.map(array, function(e){ return 'hello' + e; }), ['hello1', 'hello2', 'hello3']));

    var deepAr = [{'band': ['paul', 'george', 'john', 'ringo']}, 311, {'band': ['kris', 'kurt', 'dave']}];
    test.ok(Belt.deepEqual(Belt.deepPluck(deepAr, 'band.2'), ['john', undefined, 'dave']));

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
, 'splitArray': function(test){
    test.expect(2);

    var array = [1, 2, 3, 4, 5];
    array = Belt.splitArray(array, 2);

    test.ok(array.length === 3 && array[2][0] === 5 && array[2].length === 1);
    test.ok(array[0].length === 2);

    return test.done();
  }
, 'random': function(test){
    //test.expect(500);
    var rand, i;

    for (i = 0; i < 500; i++){
      rand = Belt.random_int(0, 100);
      //console.log(rand);
      test.ok(rand >= 0 && rand < 100);
    }

    for (i = 0; i < 500; i++){
      rand = Belt.random_bool();
      //console.log(rand);
      test.ok(rand === true || rand === false);
    }

    var array = [1, 2, 3, 4, 5];

    for (i = 0; i < 500; i++){
      rand = Belt.random_els(array, 2);
      //console.log(rand);
      test.ok(rand.length === 2 && rand[0] < 6 && rand[0] > 0);
    }

    for (i = 0; i < 500; i++){
      rand = Belt.random_string(20);
      //console.log(rand);
      test.ok(rand.length === 20);
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
    , function(cb){
        return (function(arg1, arg2, opts, callback){
          var args = Belt.argulint(arguments, {'defaults': {'first': 4}});
          test.ok(args.first === 4);
          return cb();
        })(1, 2, {'test': 'a'}, cb);
      }
    , function(cb){
        return (function(arg1, arg2, opts, callback){
          var args = Belt.argulint(arguments, {
                       'defaults': {'first': 4, 'second': 6}
                     , 'templates': {'first': 0}
                     });

          test.ok(args.first === arguments[0]);
          test.ok(args.second === 6);
          return cb();
        })(1, 2, {'test': 'a'}, cb);
      }
    , function(cb){
        return (function(arg1, arg2, opts, callback){
          var args = Belt.argulint(arguments);

          test.ok(args.o.test);
          test.ok(args.o.func);
          test.ok(args.o.regex);
          test.ok(args.o.date);

          return cb();
        })(1, 2, {'test': 'a', 'regex': /thisisaregex/g, 'date': new Date(), 'func': function(){ console.log('this is a function'); }}, cb);
      }
    , function(cb){
        return (function(arg1, arg2, opts, callback){
          var args = Belt.argulint(arguments, {
                       'defaults': {'first': 4, 'second': 6}
                     , 'templates': {'first': 0, 'second': function(args){ return this.first + args[1]; }}
                     });

          test.ok(args.first === arguments[0]);
          test.ok(args.second === args.first + arguments[1]);
          return cb();
        })(1, 2, {'test': 'a'}, cb);
      }
    , function(cb){
        return (function(arg1, arg2, opts, callback){
          var args = Belt.argulint(arguments, {
                       'defaults': {'first': 4, 'second': 6}
                     , 'templates': {'first': 0, 'second': function(args){ return this.first + args[1]; }}
                     , 'validators': {'first': function(){ return this % 2 !== 0; }}
                     });

          test.ok(args.first === arguments[0]);
          test.ok(args.second === args.first + arguments[1]);
          return cb();
        })(1, 2, {'test': 'a'}, cb);
      }
    ], function(err){
     test.ok(!err);
     return test.done();
    });
  }
, 'strings': function(test) {
    test.expect(3);

    var str = 'this is an uncapitalized string';
    test.ok(Belt.capitalize(str) === 'This Is An Uncapitalized String');
    str = 'string';
    test.ok(Belt.capitalize(str) === 'String');
    str = ' this  is an     uncapitalized     string';
    test.ok(Belt.capitalize(str) === ' This  Is An     Uncapitalized     String');

    return test.done();
  }
, 'json strings': function(test) {

    var str = 'this is an uncapitalized string';
    test.ok(!Belt.isValidJSON(str));
    str = '"this is an uncapitalized string"';
    test.ok(Belt.isValidJSON(str));

    var objstr = '{test: [1, 2, 3, 4]}';
    test.ok(!Belt.isValidJSON(objstr));
    objstr = '{"test": [1, 2, 3, 4]}';
    test.ok(Belt.isValidJSON(objstr));
    objstr = '';
    test.ok(Belt.isValidJSON(objstr));

    objstr = '{test: [1, 2, 3, 4]}';
    test.ok(Belt.parseJSON(objstr).toString() === 'Error: Invalid JSON');
    objstr = '{"test": [1, 2, 3, 4]}';
    test.ok(Belt.deepEqual(Belt.parseJSON(objstr), {test: [1, 2, 3, 4]}));
    return test.done();
  }
, 'deepObj': function(test){
    var obj = Belt.deepObj(['first.one.two.three', 'happy.wag', 'first.one.done']
                          , [1, 2, 3]);

    test.ok(obj.first.one.two.three === 1);
    test.ok(obj.first.one.done === 3);
    test.ok(obj.happy.wag === 2);

    obj = Belt.deepObj(['first.one.two.three', 'happy.wag', 'first.one.done']);

    test.ok(!obj.first.one.two.three);
    test.ok(!obj.first.one.done);
    test.ok(!obj.happy.wag);

    obj = Belt.deepObj(['first.one.two.three', 'happy.wag', 'first.one.done'], [1]);

    test.ok(obj.first.one.two.three === 1);
    test.ok(!obj.first.one.done);
    test.ok(!obj.happy.wag);

    obj = Belt.deepObj({'first.one.two.three': 1, 'happy.wag': undefined, 'first.one.done': undefined});

    test.ok(obj.first.one.two.three === 1);
    test.ok(!obj.first.one.done);
    test.ok(!obj.happy.wag);

    return test.done();
  },
  'extend': function(test){
    var obj = Belt.extend({'one': 1}, {'one': 2}, {'one': 3});
    test.ok(obj.one === 3);
    var obj2 = Belt.extend({'one': 1}, [{'one': 2}, {'one': 3}]);
    test.ok(obj2.one === 3);
    return test.done();
  },
  'circular_ref': function(test){
    var o = {};
    o.o = o;
    test.ok(Belt.stringify(o));
    test.throws(function(){ return JSON.stringify(o); });
    return test.done();
  }
, 'deepEqual': function(test){
    test.ok(Belt.deepEqual(4, 4));
    test.ok(!Belt.deepEqual(234, 4));
    test.ok(!Belt.deepEqual(4.10, 4));
    test.ok(!Belt.deepEqual("4", 4));
    test.ok(Belt.deepEqual(new Date(), new Date()));
    test.ok(!Belt.deepEqual(new Date() + 332323, new Date()));
    test.ok(Belt.deepEqual(/test/, /test/));
    test.ok(!Belt.deepEqual(/test/i, /test/));
    return test.done();
  }
, 'find': function(test){
    var ar = [1, 2, 3, 'apple', {'candy': 'cane'}, [1, 2]];
    test.ok(Belt.find(ar, 'apple') === 'apple');
    test.ok(Belt.find(ar, 1) === 1);
    test.ok(!Belt.find(ar, 'orange'));
    test.ok(Belt.deepEqual(Belt.find(ar, [1, 2]), [1, 2]));
    test.ok(!Belt.find(null, 'orange'));
    var el = Belt.find(ar, [1, 2]);
    el[1] = 'a';
    test.ok(Belt.deepEqual(Belt.find(ar, [1, 'a']), [1, 'a']));
    return test.done();
  }
, 'callshift': function(test){
    var ap = function(a, b, c, d){ return (a || ' ') + (b || ' ') + (c || ' ') + (d || ' '); };
    test.ok(Belt.csh(ap, {0: 2})('a', 'b', 'c', 'd') === 'c   ');
    test.ok(Belt.csh(ap, {0: 2, 1: 0})('a', 'b', 'c', 'd') === 'ca  ');
    test.ok(Belt.csh(ap, {0: 0, 1: 0, 2: 0})('a', 'b', 'c', 'd') === 'aaa ');
    test.ok(Belt.csh(ap, {0: 'dog', 1: 0, 2: 0})('a', 'b', 'c', 'd') === 'dogaa ');
    test.ok(Belt.csh(ap, {0: 'dog', 1: 0, 2: 'cat', 19: 'frog'})('a', 'b', 'c', 'd') === 'dogacat ');

    var gb = {};
    test.ok(Belt.csh(ap, {0: 'dog', 1: 0, 2: 'cat', 19: 'frog'}
    , gb, {'dog': 0, 'cat': 1, 'frog': 3})('a', 'b', 'c', 'd') === 'dogacat ');

    test.ok(gb.dog === 'a');
    test.ok(gb.cat === 'b');
    test.ok(gb.frog === 'd');

    test.ok(Belt.csh(ap, {0: 0, 1: 1, 2: 2}, null, null, function(a, b, c){
      return {0: 'z', 1: b, 2: 'z'};
    })('a', 'b', 'c', 'd') === 'zbz ');

    test.ok(Belt.csh(ap, {0: 0, 1: 1, 2: 2}, null, null, [
      function(a, b, c){ return {0: 'z', 1: b, 2: 'z'}; }
    , function(a, b, c){ return {0: b, 1: a, 2: '9'}; }
    ])('a', 'b', 'c', 'd') === 'bz9 ');

    return test.done();
  }
};
