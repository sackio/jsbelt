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

    test.ok(Belt.csh(ap, {0: 'dog', 1: 0, 2: 'cat', 19: 'frog'}
    , gb, {'dog': function(a, b, c){ return a + b + c; }, 'cat': 1, 'frog': 3})('a', 'b', 'c', 'd') === 'dogacat ');

    test.ok(gb.dog === 'abc');
    test.ok(gb.cat === 'b');
    test.ok(gb.frog === 'd');

    test.ok(Belt.csh(ap, {0: 0, 1: 1, 2: 2}, null, null, function(a, b, c){
      return {0: 'z', 1: b, 2: 'z'};
    })('a', 'b', 'c', 'd') === 'zbz ');

    test.ok(Belt.csh(ap, {0: 0, 1: 1, 2: 2}, null, null, [
      function(a, b, c){ return {0: 'z', 1: b, 2: 'z'}; }
    , function(a, b, c){ return {0: b, 1: a, 2: '9'}; }
    ])('a', 'b', 'c', 'd') === 'bz9 ');

    Belt.csh(ap, null, gb,  {'dog': function(a, b, c){ return a + b + c; }, 'cat': 1, 'frog': 3}, [
      function(a, b, c){ return {'0': 'z', '1': 'z', '2': 'z'}; }
    ])('a', 'b', 'c', 'd');

    test.ok(gb.dog === 'zzz', gb.dog);
    test.ok(gb.cat === 'z', gb.cat);
    test.ok(!gb.frog);

    test.ok(Belt.csh(ap, {0: function(a){ return a === 'a' ? 'snap' : 'foo'; }, 1: 0, 2: 0})
    ('a', 'b', 'c', 'd') === 'snapaa ');

    test.ok(Belt.csh(ap, {0: 1})
    ('a', 'b', 'c', 'd') === 'b   ');

    test.ok(Belt.csh(ap, {0: '1.lo.0'})
    ('a', {'lo': ['b']}, 'c', 'd') === 'b   ');

    return test.done();
  }
, 'deepEqual-constants': function(test){
    var test_name = 'deepEqual-constants';

    test.ok(Belt.deepEqual(true, true));
    test.ok(Belt.deepEqual(false, false));
    test.ok(Belt.deepEqual(0, 0));
    test.ok(Belt.deepEqual(null, null));
    test.ok(Belt.deepEqual(undefined, undefined));
    test.ok(Belt.deepEqual(Infinity, Infinity));
    test.ok(Belt.deepEqual(-Infinity, -Infinity));

    test.ok(!Belt.deepEqual(true, false));
    test.ok(!Belt.deepEqual(false, true));
    test.ok(!Belt.deepEqual(false, null));
    test.ok(!Belt.deepEqual(0, null));
    test.ok(!Belt.deepEqual(null, 'something'));
    test.ok(!Belt.deepEqual(null, undefined));
    test.ok(!Belt.deepEqual(-Infinity, Infinity));
    test.ok(!Belt.deepEqual(Infinity, -Infinity));

    return test.done();
  }
, 'deepPick': function(test){
    var test_name = 'deepPick';

    test.ok(Belt.deepEqual(Belt.deepPick({}, []), {}));
    test.ok(Belt.deepEqual(Belt.deepPick(false, []), false), JSON.stringify(Belt.deepPick(false, [])));
    test.ok(Belt.deepEqual(Belt.deepPick([], []), []), JSON.stringify(Belt.deepPick([], [])));
    test.ok(Belt.deepEqual(Belt.deepPick({'a': 1, 'b': 2}, []), {}));
    test.ok(Belt.deepEqual(Belt.deepPick({'a': 1, 'b': 2}, ['a']), {'a': 1}));

    var obj = {'deep': {'copy': {'a': 1, 'b': 2}}};

    test.ok(Belt.deepEqual(Belt.deepPick({'a': 1, 'b': 2}, ['notreal']), {}));
    test.ok(Belt.deepEqual(Belt.deepPick({'a': 1, 'b': 2}, ['a', 'b', 'c']), {'a': 1, 'b': 2}));
    test.ok(Belt.deepEqual(Belt.deepPick({'a': 1, 'b': 2}, ['a', 'b', {'c': function(){ return this.a + this.b; }}])
    , {'a': 1, 'b': 2, 'c': 3}));

    test.ok(Belt.deepEqual(Belt.deepPick(obj, ['deep.copy.a']), {'deep': {'copy': {'a': 1}}}));
    test.ok(Belt.deepEqual(Belt.deepPick(obj, ['deep.copy.z']), {}));
    test.ok(Belt.deepEqual(Belt.deepPick(obj, ['deep.copy', {'deep.ocean.p': function(){ return 'sea'; }}])
    , {'deep': {'copy': {'a': 1, 'b': 2}, 'ocean': {'p': 'sea'}}}));

    return test.done();
  }
, 'objMatch': function(test){
    var test_name = 'objMatch';

    var obj = {'dog': 'cat', 'puppy': 'kitty', 1: 2, 'array': [1, 2, 3]};

    test.ok(Belt.objMatch(obj, {'dog': 'cat'}));
    test.ok(!Belt.objMatch(obj, {'dog': 'not cat'}));
    test.ok(!Belt.objMatch(obj, {'dog': 2}));
    test.ok(!Belt.objMatch(obj, {'cat': 2}));

    test.ok(Belt.objMatch(obj, {'dog': 'cat', 'puppy': 'kitty'}));
    test.ok(!Belt.objMatch(obj, {'dog': 'cat', 'puppy': 'not kitty'}));
    test.ok(!Belt.objMatch(obj, {'dog': 'cat', 'puppy': 2}));

    test.ok(!Belt.objMatch(obj, null));
    test.ok(!Belt.objMatch(null, {}));
    test.ok(Belt.objMatch({}, {}));

    test.ok(Belt.objMatch(obj, {'dog': 'cat', 'array': [1, 2, 3]}));
    test.ok(!Belt.objMatch(obj, {'dog': 'cat', 'array': [1, 'a', 3]}));

    return test.done();
  }
, 'deepMerge': function(test){
    var test_name = 'deepMerge';

    test.ok(Belt.deepEqual(Belt.deepMerge({'dog': 'puppy'}, {'cat': 'kitten'}), {'dog': 'puppy', 'cat': 'kitten'}));
    test.ok(Belt.deepEqual(Belt.deepMerge({'dog': 'puppy'}, {'dog': 'kitten'}), {'dog': 'kitten'}));

    var obj = Belt.deepMerge({'dog': 'puppy', 'lion': ['simba', 'mufasa']}, {'cat': 'kitten', 'lion': ['scar']});

    test.ok(obj.dog === 'puppy');
    test.ok(obj.cat === 'kitten');
    test.ok(Belt.deepEqual(obj.lion, ['simba', 'mufasa', 'scar']));

    obj = Belt.deepMerge({'dog': 'puppy', 'lion': {'names': 'simba'}}, {'cat': 'kitten', 'lion': {'frog': 'tadpole'}});
    test.ok(obj.dog === 'puppy');
    test.ok(obj.cat === 'kitten');
    test.ok(obj.lion.names === 'simba');
    test.ok(obj.lion.frog === 'tadpole');

    obj = Belt.deepMerge({'dog': 'puppy', 'lion': {'names': ['simba']}}, {'cat': 'kitten', 'lion': {'names': ['mufasa'], 'frog': 'tadpole'}});
    test.ok(Belt.deepEqual(obj.lion.names, ['simba', 'mufasa']));

    obj = Belt.deepMerge(['dog', 'puppy'], ['cat', 'kitten', 'lion', {'frog': 'tadpole'}]);
    test.ok(Belt.deepEqual(obj, ['dog', 'puppy', 'cat', 'kitten', 'lion', {frog: 'tadpole' }]));

    obj = Belt.deepMerge({'dog': 'puppy'}, ['cat', 'kitten', 'lion', {'frog': 'tadpole'}]);
    test.ok(Belt.deepEqual(obj, {'0': 'cat', '1': 'kitten',  '2': 'lion',  '3': { frog: 'tadpole' },  dog: 'puppy' }));

    obj = Belt.deepMerge(['dog', 'puppy'], {'cat': 'kitten', 'lion': {'frog': 'tadpole'}});
    test.ok(obj[0] === 'dog');
    test.ok(obj[1] === 'puppy');
    test.ok(obj['cat'] === 'kitten');
    test.ok(Belt.deepEqual(obj['lion'], {'frog': 'tadpole'}));


    obj = Belt.deepMerge(['dog', 'puppy'], false);
    test.ok(Belt.deepEqual(obj, ['dog', 'puppy']));

    obj = Belt.deepMerge(['dog', 'puppy'], undefined);
    test.ok(Belt.deepEqual(obj, ['dog', 'puppy']));

    obj = Belt.deepMerge(['dog', 'puppy'], []);
    test.ok(Belt.deepEqual(obj, ['dog', 'puppy']));

    obj = Belt.deepMerge(['dog', 'puppy'], {});
    test.ok(Belt.deepEqual(obj, ['dog', 'puppy']));

    obj = Belt.deepMerge(false, ['dog', 'puppy']);
    test.ok(Belt.deepEqual(obj, ['dog', 'puppy']));

    obj = Belt.deepMerge({}, ['dog', 'puppy']);
    test.ok(Belt.deepEqual(obj, {'0': 'dog', '1': 'puppy'}));

    return test.done();
  }
, 'setDeepArray': function(test){
    var test_name = 'setDeepArray';

    var obj = 'locations.[].label.home';
    obj = Belt.set({}, obj, 'hello');

    test.ok(Belt.deepEqual(obj, {'locations': [{'label': {'home': 'hello'}}]}));

    obj = 'locations.3.label.home';
    obj = Belt.set({}, obj, 'hello');

    test.ok(Belt.deepEqual(obj, {'locations': [undefined, undefined, undefined, {'label': {'home': 'hello'}}]}));

    obj = 'locations.3.label.2.apple';
    obj = Belt.set({}, obj, 'hello');

    test.ok(Belt.deepEqual(obj, {'locations': [undefined, undefined, undefined, {'label': [undefined, undefined, {'apple': 'hello'}]}]}));

    obj = 'locations.3.label.-2.apple';
    obj = Belt.set({}, obj, 'hello');

    test.ok(Belt.deepEqual(obj, {'locations': [undefined, undefined, undefined, {'label': {'-2': {'apple': 'hello'}}}]}));

    return test.done();
  }
, 'isNumber': function(test){
    test.ok(Belt.isNumber(60));
    test.ok(Belt.isNumber(60.12));
    test.ok(Belt.isNumber('60'));
    test.ok(Belt.isNumber('60.12'));
    test.ok(!Belt.isNumber('60b'), parseInt('60b', 10));
    test.ok(!Belt.isNumber('a60.12'));
    test.ok(Belt.isNumber('-60.12'));
    test.ok(!Belt.isNumber('-60.12.'));

    test.ok(Belt.isNumber(0));
    test.ok(Belt.isNumber('0'));

    test.ok(!Belt.isNumber(true));
    test.ok(!Belt.isNumber(undefined));
    test.ok(!Belt.isNumber(null));
    test.ok(!Belt.isNumber(''));
    test.ok(!Belt.isNumber('not num'));
    test.ok(!Belt.isNumber());

    return test.done();
  }
, 'isInt': function(test){
    test.ok(Belt.isInt(60));
    test.ok(!Belt.isInt(60.12));
    test.ok(Belt.isInt('60'));
    test.ok(!Belt.isInt('60.12'));
    test.ok(!Belt.isInt('60b'), parseInt('60b', 10));
    test.ok(!Belt.isInt('a60.12'));
    test.ok(!Belt.isInt('-60.12'));
    test.ok(!Belt.isInt('-60.12.'));
    test.ok(!Belt.isInt('-0.60'));
    test.ok(!Belt.isInt('0.60'));
    test.ok(Belt.isInt('-6'));
    test.ok(Belt.isInt(-6));

    test.ok(Belt.isInt(0));
    test.ok(Belt.isInt('0'));

    test.ok(!Belt.isInt(true));
    test.ok(!Belt.isInt(undefined));
    test.ok(!Belt.isInt(null));
    test.ok(!Belt.isInt(''));
    test.ok(!Belt.isInt('not num'));
    test.ok(!Belt.isInt());

    return test.done();
  }
, 'isNull': function(test){
    test.ok(Belt.isNull(null));
    test.ok(Belt.isNull(undefined));
    test.ok(!Belt.isNull(''));
    test.ok(!Belt.isNull(false));
    test.ok(!Belt.isNull(0));
    test.ok(!Belt.isNull(true));

    return test.done();
  }
, 'isEmpty': function(test){
    test.ok(!Belt.isEmpty(null));
    test.ok(!Belt.isEmpty(undefined));
    test.ok(!Belt.isEmpty(''));
    test.ok(!Belt.isEmpty(false));
    test.ok(!Belt.isEmpty(0));
    test.ok(!Belt.isEmpty(true));
    test.ok(Belt.isEmpty({}));
    test.ok(Belt.isEmpty([]));
    test.ok(!Belt.isEmpty([1, 2, 3]));
    test.ok(!Belt.isEmpty({'foo': 'bar'}));

    return test.done();
  }
, 'isBlank': function(test){
    test.ok(!Belt.isBlank(null));
    test.ok(!Belt.isBlank(undefined));
    test.ok(Belt.isBlank(''));
    test.ok(Belt.isBlank(false));
    test.ok(Belt.isBlank(0));
    test.ok(!Belt.isBlank(true));
    test.ok(!Belt.isBlank('true'));
    test.ok(!Belt.isBlank({}));
    test.ok(!Belt.isBlank([]));
    test.ok(!Belt.isBlank([1, 2, 3]));
    test.ok(!Belt.isBlank({'foo': 'bar'}));

    return test.done();
  }
, 'isPlainObj': function(test){
    test.ok(!Belt.isPlainObj(null));
    test.ok(!Belt.isPlainObj(undefined));
    test.ok(!Belt.isPlainObj(''));
    test.ok(!Belt.isPlainObj(false));
    test.ok(!Belt.isPlainObj(0));
    test.ok(!Belt.isPlainObj(true));
    test.ok(Belt.isPlainObj({}));
    test.ok(!Belt.isPlainObj([]));
    test.ok(!Belt.isPlainObj([1, 2, 3]));
    test.ok(Belt.isPlainObj({'foo': 'bar'}));
    test.ok(!Belt.isPlainObj(Belt.noop));
    test.ok(!Belt.isPlainObj(new Date()));
    test.ok(!Belt.isPlainObj(/test/));

    return test.done();
  }
, 'isObj': function(test){
    test.ok(!Belt.isObj(null));
    test.ok(!Belt.isObj(undefined));
    test.ok(!Belt.isObj(''));
    test.ok(!Belt.isObj(false));
    test.ok(!Belt.isObj(0));
    test.ok(!Belt.isObj(true));
    test.ok(Belt.isObj({}));
    test.ok(Belt.isObj([]));
    test.ok(Belt.isObj([1, 2, 3]));
    test.ok(Belt.isObj({'foo': 'bar'}));

    return test.done();
  }
, 'objFlatten': function(test){
    test.ok(true);

    var obj = {'deep': [{'copy': 1}, 2]}
      , fobj = Belt.objFlatten(obj);

    test.ok(Object.keys(fobj).length === 4);

    for (var k in fobj){
      test.ok(Belt.deepEqual(fobj[k], Belt.get(obj, k)));
    }

    var date = new Date();

    obj = {
      'array': [1, 2, 3]
    , 'object': {'deep': {'object': [1, {'deeper': 'object'}, true, date]}}
    , 'function': Belt.noop
    , 'regex': new RegExp()
    , 'date': [date, date]
    };
    fobj = Belt.objFlatten(obj);

    test.ok(Object.keys(fobj).length === 17);

    for (k in fobj){
      test.ok(Belt.deepEqual(fobj[k], Belt.get(obj, k)));
    }

    fobj = Belt.objFlatten(obj, {'deepest': true});
    for (k in fobj){
      test.ok(Belt.deepEqual(fobj[k], Belt.get(obj, k)));
    }

    Belt.deepEqual(Object.keys(fobj), ['array.0', 'array.1', 'array.2', 'object.deep.object.0', 'object.deep.object.1.deeper'
    , 'object.deep.object.2', 'object.deep.object.3', 'function', 'regex', 'date.0', 'date.1']);

    return test.done();
  }
, 'deepSet-with-arrays': function(test){
    var obj = {'test': {0: true, 1: 'a', 2: false}};

    Belt.set(obj, 'test.0', false);

    test.ok(Belt.isPlainObj(Belt.get(obj, 'test')));
    test.ok(Belt.get(obj, 'test.0') === false);

    Belt.set(obj, 'test.17', false);

    test.ok(Belt.isPlainObj(Belt.get(obj, 'test')));
    test.ok(Belt.get(obj, 'test.17') === false);

    Belt.set(obj, 'test.17', [1, 2]);

    test.ok(!Belt.isPlainObj(Belt.get(obj, 'test.17')));
    test.ok(Belt.deepEqual(Belt.get(obj, 'test.17'), [1, 2]));

    Belt.set(obj, 'test.17.0', 'dog');

    test.ok(!Belt.isPlainObj(Belt.get(obj, 'test.17.0')));
    test.ok(Belt.deepEqual(Belt.get(obj, 'test.17'), ['dog', 2]));

    Belt.set(obj, 'test.17.1', []);

    test.ok(!Belt.isPlainObj(Belt.get(obj, 'test.17.1')));
    test.ok(Belt.deepEqual(Belt.get(obj, 'test.17'), ['dog', []]));

    Belt.set(obj, 'test.17.1.17', 'cat');

    test.ok(Array.isArray(Belt.get(obj, 'test.17.1')));
    test.ok(Belt.get(obj, 'test.17.1.17') === 'cat');

    return test.done();
  }
, 'chain': function(test){
    var obj = {'test': {0: true, 1: 'a', 2: {'a': true, 'b': true, 'c': false, 'd': function(a){
      return [1, a, 2];
    }}}};
    test.ok(Belt.chain(obj, ['test'], ['2.a']) === true);
    test.ok(Belt.chain(obj, ['test.2'], 'b') === true);
    test.ok(Belt.chain(obj, ['test.2'], 'c') === false);
    test.ok(Belt.chain(obj, ['test.3'], 'c') === undefined);
    test.ok(Belt.chain(obj, ['test'], ['2.zzz']) === undefined);
    test.ok(Belt.chain(obj, ['test'], ['2'], ['d', 123], '1') === 123);
    test.ok(Belt.chain(obj, ['test'], ['2'], ['g', 123], '1') === undefined);

    obj = {'isGood': function(){ return 'good'; }};

    test.ok(Belt.chain.apply(Belt, [obj, ['isGood']]) === 'good');
    test.ok(Belt.chain.apply(Belt, [obj, ['isGood', undefined]]) === 'good');

    return test.done();
  }
, 'more-deepEquals': function(test){
    var d = new Date();
    var obj = {
      'cat': 1
    , 'dog': 2
    , 'frog': true
    };
    var obj2 = {
      'frog': true
    , 'cat': 1
    , 'dog': 2
    };

    test.ok(Belt.deepEqual(obj, obj2));

    return test.done();
  }
, 'delete': function(test){
    var obj = {'test': {0: true, 1: 'a', 2: {'a': true, 'b': true, 'c': false, 'd': function(a){
      return [1, a, 2];
    }}}};

    test.ok(Belt.get(obj, 'test.2.d'));
    Belt.delete(obj, 'test.2.d');
    test.ok(Belt.get(obj, 'test.2.d') === undefined);

    Belt.delete(obj, 'test.0');
    test.ok(Belt.get(obj, 'test.0') === undefined);
    test.ok(Belt.get(obj, 'test'));

    Belt.delete(obj, 'test');
    test.ok(Belt.get(obj, 'test') === undefined);

    Belt.delete(obj, 'nonexistent');

    return test.done();
  }
, 'difference': function(test){
    var ar = [1, 2, 3, 4]
      , _ar = [1, 2];

    test.ok(Belt.deepEqual([3, 4], Belt.difference(ar, _ar)));

    _ar = [1, 2, 3, 4];
    test.ok(Belt.deepEqual([], Belt.difference(ar, _ar)));

    _ar = [1, 2, 3, 4, 5, 6, 1];
    test.ok(Belt.deepEqual([], Belt.difference(ar, _ar)));

    ar = [1, 1, 2, 3, 1, 4];
    _ar = [1, 2];
    test.ok(Belt.deepEqual([1, 3, 1, 4], Belt.difference(ar, _ar)));

    ar = 'dog';
    _ar = [1, 2];
    test.ok(Belt.deepEqual([], Belt.difference(ar, _ar)));

    ar = ['dog'];
    _ar = 4324234;
    test.ok(Belt.deepEqual(['dog'], Belt.difference(ar, _ar)));

    return test.done();
  }
, 'arrayDiff': function(test){
    var ar = [1, 2, 3, 4]
      , _ar = [1, 2]
      , arb = [2, 1, 1, 4];

    test.ok(Belt.deepEqual(Belt.arrayDiff(ar, _ar), {'$push': {}, '$pull': {'2': 3, '3': 4}, '$position': {}}));
    test.ok(Belt.deepEqual(Belt.arrayDiff(_ar, ar), {'$push': {'2': 3, '3': 4}, '$pull': {}, '$position': {}}));
    test.ok(Belt.deepEqual(Belt.arrayDiff(ar, arb), {'$push': {'2': 1}, '$pull': {'2': 3}, '$position': {'0': 1, '1': 0}}));
    return test.done();
  }
, 'objDiff': function(test){
    var obj = {
      'cat': 1
    , 'dog': 2
    , 'pepperoni': [1, 2, 3]
    , 'frog': true
    };
    var obj2 = {
      'frog': false
    , 'cat': 1
    , 'dog': 2
    };
    var obj3 = {'frog': {'dog': 'cat'}, 'test': {0: true, 1: 'a', 2: {'a': true, 'b': true, 'c': false}}};
    var obj4 = {
      'cat': 1
    , 'dog': 2
    , 'pepperoni': [{'joke': 'crab'}]
    , 'frog': true
    };

    test.ok(Belt.equal(Belt.objDiff(obj, obj), {'$unset': [], '$set': {}, '$type': {'': 'object'}}));
    test.ok(Belt.equal(Belt.objDiff(obj2, obj2), {'$unset': [], '$set': {}, '$type': {'': 'object'}}));
    test.ok(Belt.equal(Belt.objDiff(obj3, obj3), {'$unset': [], '$set': {}, '$type': {'': 'object'}}));
    test.ok(Belt.equal(Belt.objDiff(obj4, obj4), {'$unset': [], '$set': {}, '$type': {'': 'object'}}));

    test.ok(Belt.equal({'$unset': ['test'], '$set': {'cat': 1, 'dog': 2, 'pepperoni.0': 1
    , 'pepperoni.1': 2, 'pepperoni.2': 3, 'frog': true}, '$type': {'': 'object', 'pepperoni': 'array'}}
    , Belt.objDiff(obj3, obj)));

    test.ok(Belt.equal({'$unset': ['cat', 'dog', 'pepperoni' ]
    , '$set': {'frog.dog': 'cat', 'test.0': true, 'test.1': 'a', 'test.2.a': true
      , 'test.2.b': true, 'test.2.c': false}
    , '$type': {frog: 'object', test: 'object', 'test.2': 'object', '': 'object'}}, Belt.objDiff(obj, obj3)));


    test.ok(Belt.equal({'$unset': ['pepperoni'], '$set': {frog: false }, '$type': {'': 'object'}}, Belt.objDiff(obj4, obj2)));

    test.ok(Belt.equal({'$type': {'pepperoni.0': 'object', '': 'object'}, '$unset': ['pepperoni.1', 'pepperoni.2']
    , '$set': { 'pepperoni.0.joke': 'crab' }}, Belt.objDiff(obj, obj4)));

    test.ok(Belt.equal({'$unset': [], '$set': {'pepperoni.0.joke': 'crab', 'frog': true }
    , '$type': {'': 'object', 'pepperoni': 'array', 'pepperoni.0': 'object' }}, Belt.objDiff(obj2, obj4)));

    obj = [1, 2, 3];
    obj2 = [1, true, 4, 3];

    test.ok(Belt.equal({'$unset': [], '$set': {'1': true, '2': 4, '3': 3}, '$type': {'': 'array'}}, Belt.objDiff(obj, obj2)));

    obj = 234;
    obj2 = [1, true, 4, 3];
    test.ok(Belt.equal({'$unset': [], '$set': {'0': 1, '1': true, '2': 4, '3': 3}, '$type': {'': 'array'}}, Belt.objDiff(obj, obj2)));


    obj2 = 234;
    obj = [1, true, 4, 3];

    test.ok(Belt.equal({'$unset': ['0', '1', '2', '3' ], '$set': {'': 234}, '$type': {'': 'number'}}, Belt.objDiff(obj, obj2)));

    obj2 = [1, [1], 0, 2];
    obj = [1, [], 4];
    test.ok(Belt.equal(Belt.objDiff(obj2, obj), {'$type': {'': 'array'}, '$unset': ['3'], '$set': {'1': [], '2': 4 }}));

    obj2 = {1: {}, 0: 2};
    obj = {1: 2};
    test.ok(Belt.equal(Belt.objDiff(obj, obj2), {'$type': {'1': 'object', '':'object'}
    , '$unset': [], '$set': {'0': 2, '1': {}}}));

    obj2 = {1: {2: []}, 0: 2};
    obj = {1: 2};

    test.ok(Belt.equal(Belt.objDiff(obj, obj2), {'$type': {'1': 'object', '': 'object', '1.2': 'array'}
    , '$unset': [], '$set': {'0': 2, '1.2': []}}));
    test.ok(Belt.equal(Belt.objDiff(obj2, obj), {'$type': {'': 'object'}, '$unset': ['0']
    , '$set': {'1': 2}}));

    return test.done();
  }
, 'objToArray': function(test){
    var obj = {0: 0, 2: 2, 1: 1};
    test.ok(Belt.equal(Belt.objToArray(obj), [0, 1, 2]));

    obj = {0: 0, 2: 2, 1: 1, 6: 6};
    test.ok(Belt.equal(Belt.objToArray(obj), [0, 1, 2, , , , 6]));

    return test.done();
  }
, 'pathStat': function(test){
    var obj = {'pepperoni': [{'joke': 'crab'}, 1, true, [0, 1]], 'frog': {'dog': 'cat'}, 'test': {0: true, 1: 'a', 2: {'a': true, 'b': true, 'c': false}}};

    var ps = Belt.pathStat(obj, 'pepperoni');

    test.ok(ps.type === 'array');
    test.ok(Belt.deepEqual(ps.val, Belt.get(obj, 'pepperoni')));
    test.ok(Belt.deepEqual(ps.parent, obj));
    test.ok(ps.ptype === 'object');
    test.ok(ps.ppath === '');
    test.ok(ps.lpath === 'pepperoni');
    test.ok(ps.is_el === false);

    ps = Belt.pathStat(obj, 'pepperoni.0.joke');

    test.ok(ps.type === 'string');
    test.ok(Belt.deepEqual(ps.val, Belt.get(obj, 'pepperoni.0.joke')));
    test.ok(Belt.deepEqual(ps.parent, Belt.get(obj, ps.ppath)));
    test.ok(ps.ptype === 'object');
    test.ok(ps.ppath === 'pepperoni.0');
    test.ok(ps.lpath === 'joke');
    test.ok(ps.is_el === false);

    ps = Belt.pathStat(obj, 'pepperoni.3.1');

    test.ok(ps.type === 'number');
    test.ok(Belt.deepEqual(ps.val, Belt.get(obj, 'pepperoni.3.1')));
    test.ok(Belt.deepEqual(ps.parent, Belt.get(obj, ps.ppath)));
    test.ok(ps.ptype === 'array');
    test.ok(ps.ppath === 'pepperoni.3');
    test.ok(ps.lpath === '1');
    test.ok(ps.is_el === true);

    ps = Belt.pathStat(obj, '');

    test.ok(ps.type === 'object');
    test.ok(Belt.deepEqual(ps.val, Belt.get(obj, '')));
    test.ok(Belt.deepEqual(ps.parent, undefined));
    test.ok(!ps.ptype);
    test.ok(!ps.ppath);
    test.ok(ps.lpath === '');
    test.ok(!ps.is_el);

    ps = Belt.pathStat(obj, 'not even a path');

    test.ok(!ps.type);
    test.ok(!ps.val);
    test.ok(!ps.parent);
    test.ok(!ps.ptype);
    test.ok(!ps.ppath);
    test.ok(!ps.lpath);
    test.ok(!ps.is_el);

    return test.done();
  }
, 'typeof': function(test){
    test.ok(Belt.typeof([]) === 'array');
    test.ok(Belt.typeof({}) === 'object');
    test.ok(Belt.typeof(Belt.np) === 'function');
    test.ok(Belt.typeof(12323) === 'number');
    test.ok(Belt.typeof(12.323) === 'number');
    test.ok(Belt.typeof('12323') === 'string');
    test.ok(Belt.typeof('') === 'string');
    test.ok(Belt.typeof(true) === 'boolean');
    test.ok(Belt.typeof(false) === 'boolean');
    test.ok(Belt.typeof(new Date()) === 'date');
    test.ok(Belt.typeof(/sdasdf/) === 'regexp');
    test.ok(Belt.typeof(undefined) === 'undefined');
    test.ok(Belt.typeof(null) === 'null');

    return test.done();
  }
, 'objPatch': function(test){
    var obj = {
      'cat': 1
    , 'dog': 2
    , 'pepperoni': [1, 2, 3]
    , 'frog': true
    };
    var obj2 = {
      'frog': false
    , 'cat': 1
    , 'dog': 2
    };
    var obj3 = {'frog': {'dog': 'cat'}, 'test': {0: true, 1: 'a', 2: {'a': true, 'b': true, 'c': false}}};
    var obj4 = {
      'cat': 1
    , 'dog': 2
    , 'pepperoni': [{'joke': 'crab'}]
    , 'frog': true
    };

    var ptch = Belt.objDiff(obj, obj2);
    test.ok(Belt.deepEqual(obj2, Belt.objPatch(obj, ptch)));

    ptch = Belt.objDiff(obj, obj3);
    test.ok(Belt.deepEqual(obj3, Belt.objPatch(obj, ptch)));

    ptch = Belt.objDiff(obj, obj4);
    test.ok(Belt.deepEqual(obj4, Belt.objPatch(obj, ptch)));

    ptch = Belt.objDiff(obj, obj);
    test.ok(Belt.deepEqual(obj, Belt.objPatch(obj, ptch)));

    ptch = Belt.objDiff(obj2, obj2);
    test.ok(Belt.deepEqual(obj2, Belt.objPatch(obj2, ptch)));

    ptch = Belt.objDiff(obj2, obj3);
    test.ok(Belt.deepEqual(obj3, Belt.objPatch(obj2, ptch)));

    ptch = Belt.objDiff(obj2, obj4);
    test.ok(Belt.deepEqual(obj4, Belt.objPatch(obj2, ptch)));

    ptch = Belt.objDiff(obj2, obj);
    test.ok(Belt.deepEqual(obj, Belt.objPatch(obj2, ptch)));

    ptch = Belt.objDiff(obj3, obj2);
    test.ok(Belt.deepEqual(obj2, Belt.objPatch(obj3, ptch)));

    ptch = Belt.objDiff(obj3, obj3);
    test.ok(Belt.deepEqual(obj3, Belt.objPatch(obj3, ptch)));

    ptch = Belt.objDiff(obj3, obj4);
    test.ok(Belt.deepEqual(obj4, Belt.objPatch(obj3, ptch)));

    ptch = Belt.objDiff(obj3, obj);
    test.ok(Belt.deepEqual(obj, Belt.objPatch(obj3, ptch)));

    ptch = Belt.objDiff(obj4, obj2);
    test.ok(Belt.deepEqual(obj2, Belt.objPatch(obj4, ptch)));

    ptch = Belt.objDiff(obj4, obj3);
    test.ok(Belt.deepEqual(obj3, Belt.objPatch(obj4, ptch)));

    ptch = Belt.objDiff(obj4, obj4);
    test.ok(Belt.deepEqual(obj4, Belt.objPatch(obj4, ptch)));

    ptch = Belt.objDiff(obj4, obj);
    test.ok(Belt.deepEqual(obj, Belt.objPatch(obj4, ptch)));

    obj = [1, 2, 3];
    obj2 = [1, true, 4, 3];

    ptch = Belt.objDiff(obj, obj2);
    test.ok(Belt.deepEqual(obj2, Belt.objPatch(obj, ptch)));

    ptch = Belt.objDiff(obj2, obj);
    test.ok(Belt.deepEqual(obj, Belt.objPatch(obj2, ptch)));

    obj = 234;
    obj2 = [1, true, 4, 3];

    ptch = Belt.objDiff(obj, obj2);
    test.ok(Belt.deepEqual(obj2, Belt.objPatch(obj, ptch)));

    ptch = Belt.objDiff(obj2, obj);
    test.ok(Belt.deepEqual(obj, Belt.objPatch(obj2, ptch)));

    obj2 = 234;
    obj = [1, true, 4, 3];

    ptch = Belt.objDiff(obj, obj2);
    test.ok(Belt.deepEqual(obj2, Belt.objPatch(obj, ptch)));

    ptch = Belt.objDiff(obj2, obj);
    test.ok(Belt.deepEqual(obj, Belt.objPatch(obj2, ptch)));

    obj2 = [1, [1], 0, 2];
    obj = [1, [], 4];

    ptch = Belt.objDiff(obj, obj2);
    test.ok(Belt.deepEqual(obj2, Belt.objPatch(obj, ptch)));

    ptch = Belt.objDiff(obj2, obj);
    test.ok(Belt.deepEqual(obj, Belt.objPatch(obj2, ptch)));

    obj2 = {1: {}, 0: 2};
    obj = {1: 2};

    ptch = Belt.objDiff(obj, obj2);
    test.ok(Belt.deepEqual(obj2, Belt.objPatch(obj, ptch)));

    ptch = Belt.objDiff(obj2, obj);
    test.ok(Belt.deepEqual(obj, Belt.objPatch(obj2, ptch)));

    obj2 = {1: {2: []}, 0: 2};
    obj = {1: 2};

    ptch = Belt.objDiff(obj, obj2);
    test.ok(Belt.deepEqual(obj2, Belt.objPatch(obj, ptch)));

    ptch = Belt.objDiff(obj2, obj);
    test.ok(Belt.deepEqual(obj, Belt.objPatch(obj2, ptch)));

    obj2 = [2];
    obj = {1: 2};

    ptch = Belt.objDiff(obj, obj2);
    test.ok(Belt.deepEqual(obj2, Belt.objPatch(obj, ptch)));

    ptch = Belt.objDiff(obj2, obj);
    test.ok(Belt.deepEqual(obj, Belt.objPatch(obj2, ptch)));

    obj2 = [3];
    obj = {0: 0, 1: 1};

    ptch = Belt.objDiff(obj, obj2);
    test.ok(Belt.deepEqual(obj2, Belt.objPatch(obj, ptch)));

    ptch = Belt.objDiff(obj2, obj);
    test.ok(Belt.deepEqual(obj, Belt.objPatch(obj2, ptch)));

    obj2 = 3;
    obj = 'string';

    ptch = Belt.objDiff(obj, obj2);
    test.ok(Belt.deepEqual(obj2, Belt.objPatch(obj, ptch)));

    ptch = Belt.objDiff(obj2, obj);
    test.ok(Belt.deepEqual(obj, Belt.objPatch(obj2, ptch)));

    return test.done();
  }
};
