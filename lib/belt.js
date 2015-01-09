/*
 * jsbelt
 * 
 *
 * Copyright (c) 2014 Ben Sack
 * Licensed under the MIT license.
 */

(function(){

  var Belt = function(){
    var B = {};

    //////////////////////////////////////////////////////////////////////////////
    /////////////////////////////FUNCTIONS////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////

    /*
    * Noop - nothing to see here
    */
    B['noop'] = function(){ return; };

    /*
    * Log arguments sent to a callback
    *   Useful for when a callback doesn't really matter, but it'd be nice to see
    *   what's up
    */
    if (typeof console !== 'undefined' && console.log){
      B['callog'] = function(){ return console.log(arguments); };
    }

    /*
    * Wrapped callback
    *   returns a wrapped function which will only call argument(s) at specified
    *   index (indices).
    *   Defaults to calling no arguments
    *   index can be an integer or array of integers to apply multiple arguments to
    *   wrapped function.
    *   thisObj is an optional object to bind to wrapped function

    *   Useful for async flows where the arguments passed to a callback are unimportant
    */
    B['callwrap'] = function(func, index, thisObj){
      return function(){
        var a = [], args = arguments; 
        if (typeof index !== 'undefined' && Object.prototype.toString.call(index) === '[object Array]'){
          index.forEach(function(_i){
            return a.push(args[_i]);
          });
        } else if (typeof index !== 'undefined') {
          a.push(args[index]);
        }
        return func.apply(thisObj, a);
      };
    };
  
    /*
      Returns a wrapped function which sets a property in an object to an argument
      index in a callback, then calls a wrapped version of the original callback
  
        Useful for async flows where it's helpful to capture the result of a callback
        in a global and move to the next step
  
        func - the function to be wrapped
        obj - the object whose property to set
        key - the property key to set
        set_index - the index of the argument to set to the property (default: 1)
        call_index - the index (or indices) of the argument to pass to the wrapped
          function (default: undefined)
        thisObj - optional object to bind wrapped function to
    */
    B['callset'] = function(func, obj, key, set_index, call_index, thisObj){
      return function(){
        obj[key] = arguments[set_index === undefined ? 1 : set_index];
        return B.callwrap.call(null, func, call_index, thisObj).apply(thisObj, arguments);
      };
    };

    /*
      callset, extracting a deep property from the selected argument to save to a global variable
    */
    B['deepcallset'] = function(func, obj, key, set_index, pStr, call_index, options){
      var a = B.argulint(arguments);
      return function(){
        obj[key] = B._get(arguments[set_index === undefined ? 1 : set_index], pStr);
        var args = arguments;
        if (a.o.err_on_miss){
          if (typeof obj[key] === 'undefined' && (typeof call_index === 'undefined' || !args[call_index]))
            args[call_index] = new Error('Missing value for \'' + pStr +'\', argument index ' + set_index);
        }

        return B.callwrap.call(null, func, call_index, a.o.thisObj).apply(a.o.thisObj, args);
      };
    };

    /*
      callset, extracting a deep property from the selected argument to save to a deep property of a global variable
    */
    B['deepcalldeepset'] = function(func, obj, dStr, set_index, pStr, call_index, options){
      var a = B.argulint(arguments);
      return function(){
        B._set(obj, dStr, B._get(arguments[set_index === undefined ? 1 : set_index], pStr));
        var args = arguments;
        if (a.o.err_on_miss){
          if (typeof B._get(obj, dStr) === 'undefined' && (typeof call_index === 'undefined' || !args[call_index]))
            args[call_index] = new Error('Missing value for \'' + pStr +'\', argument index ' + set_index);
        }

        return B.callwrap.call(null, func, call_index, a.o.thisObj).apply(a.o.thisObj, args);
      };
    };

    /*
      callshift - shift the arguments of a wrapped function, optionally discarding arguments
    */
    B['callshift'] = function(func, args, obj, sets, ts){
      return function(){
        var _as = arguments
          , self = this;
        var trans = B.toArray(ts || []);
        trans.forEach(function(t){
          _as = t.apply(self, B.objVals(_as));
        });

        if (obj && sets) for (var s in sets){
          if (typeof sets[s] === 'function'){
            B.set(obj, s, sets[s].apply(self, B.objVals(_as)));
          } else {
            B.set(obj, s, B.get(_as, sets[s]));
          }
        }

        var sargs = [];
        if (args){
          sargs = B.sequence(function(){ return undefined; }, Math.max(B.objVals(args)));
          for (var k in args){
            if (typeof args[k] === 'number'){
              sargs[k] = _as[args[k]];
            } else if (typeof args[k] === 'function'){
              sargs[k] = args[k].apply(self, _as);
            } else {
              var v = B.get(_as, args[k]);
              if (typeof B.get(_as, args[k]) !== 'undefined'){
                sargs[k] = v;
              } else {
                sargs[k] = args[k];
              }
            }
          }
        }
        return func.apply(this, sargs);
      };
    };

    //aliases
    B['np'] = B['noop'];
    B['cl'] = B['callog'];
    B['cw'] = B['callwrap'];
    B['cs'] = B['callset'];
    B['dcs'] = B['deepcallset'];
    B['dcds'] = B['deepcalldeepset'];
    B['csh'] = B['callshift'];

    //////////////////////////////////////////////////////////////////////////////
    //////////////////////////DEEP MANIPULATION///////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////

    /*
      Stringification & parsing credit: https://github.com/vkiryukhin/jsonfn
    */
    B['stringify'] = function(obj){
      var _b = B.typeof(obj);
      if (_b === 'null') return 'null';
      if (_b === 'undefined') return 'undefined';
      if (B.typeof(obj).match(/^(string|number|boolean|function|regexp|date)$/)) return B.call(obj, 'toString');

      var cache = []
        , str = JSON.stringify(obj, function(k, v) {
        if (v instanceof Function || typeof v === 'function'){
          return v.toString();
        }
        if (v instanceof RegExp){
          return '_PxEgEr_' + v;
        }
        if (typeof v === 'object' && v !== null) {
          if (cache.indexOf(v) !== -1) {
            // Circular reference found, discard key
            return;
          }
          // Store value in our collection
          cache.push(v);
        }
        return v;
      }, 2);
      cache = null;
      return str;
    };

    /*
      Stringification & parsing credit: https://github.com/vkiryukhin/jsonfn
    */
    B['parse'] = function(str, date2obj){
      var iso8061 = date2obj ? /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/ : false;

      return JSON.parse(str, function (k, v){
        var prefix;
  
        if (typeof v !== 'string'){
          return v;
        }
        if (v.length < 8){
          return v;
        }
  
        prefix = v.substring(0, 8);
  
        if (iso8061 && v.match(iso8061)){
          return new Date(v);
        }
        if (prefix === 'function'){
          return eval('(' + v + ')');
        }
        if (prefix === '_PxEgEr_'){
          return eval(v.slice(8));
        }

        return v;
      });
    };

    /*
      Copy/clone an object or array - pass true as second argument make a shallow
        copy, otherwise defaults to a deep copy
    */
    B['copy'] = function(obj, shallow_copy){
      if (typeof obj !== 'object'){ return obj; }

      if (!shallow_copy){ return B.parse(B.stringify(obj)); }

      var clone;

      if (Object.prototype.toString.call(obj) === '[object Array]'){
        clone = [];
        obj.forEach(function(e){ return clone.push(e); });
      } else {
        clone = {};
        for (var k in obj){
          clone[k] = obj[k];
        }
      }

      return clone;
    };

    B['deepCopy'] = B['copy']; //alias

    /*
      Convert something to an object
    */
    B['toObject'] = function(src){
      if (typeof src !== 'object') return {};
      if (!src) return {};
      var keys = Object.keys(src);
      if (!keys) return {};
      return B.deepObj(keys, Array.isArray(src) ? src : B.objVals(src));
    };

    /*
      Deep merge objects - credit: https://github.com/nrf110/deepmerge
    */
    B['deepMerge'] = function(target, src){
      if (typeof src !== 'object') return target;
      if (typeof target !== 'object') return src;

      var array = Array.isArray(target)
        , sarray = Array.isArray(src)
        , dst = array && [] || {};

      if (array && sarray) return target.concat(src);
      if (array && !sarray) target = B.toObject(target);

      if (target && typeof target === 'object') {
        Object.keys(target).forEach(function (key) {
          dst[key] = target[key];
        });
      }
      Object.keys(src).forEach(function (key) {
        if (typeof src[key] !== 'object' || !src[key]) {
          dst[key] = src[key];
        } else {
          if (!target[key]) {
            dst[key] = src[key];
          } else {
            dst[key] = B.deepMerge(target[key], src[key]);
          }
        }
      });

      return dst;
    };

    /*
      Extend an object with another object.
        Extension includes deep merging objects
        extender can be a single object or an array of objects, which will be used
        to extend obj in sequence

      credit: underscore + jquery
    */
    B['extend'] = function(obj, extender){
      if (typeof obj !== 'object') return {};

      var ext = B.toArray(extender);
      var exArgs = B.objVals(arguments).slice(2);
      ext = ext.concat(exArgs);
      ext.forEach(function(e){
        var _e = e || {};
        obj = B.deepMerge(obj, _e);
        return;
      });
  
      return obj;
    };

    /*
      Are two objects deeply equal?
    */
    B['deepEqual'] = function(obj, obj2){
      if (B.typeof(obj) !== B.typeof(obj2)) return false;

      if (typeof obj === 'number' && typeof obj2 === 'number'){
        if (Number.isNaN(obj) && Number.isNaN(obj2)) return true;
        if (obj === 0 && obj2 === 0) return true;
        if (obj === 0 && obj2 !== 0) return false;
        if (obj !== 0 && obj2 === 0) return false;

        if (obj === Infinity && obj2 === Infinity) return true;
        if (obj === Infinity && obj2 !== Infinity) return false;
        if (obj !== Infinity && obj2 === Infinity) return false;

        if (obj === -Infinity && obj2 === -Infinity) return true;
        if (obj === -Infinity && obj2 !== -Infinity) return false;
        if (obj !== -Infinity && obj2 === -Infinity) return false;
        return obj === obj2;
      }

      if (!B.isNull(obj) && !B.isNull(obj2) && obj.constructor !== obj2.constructor) return false;

      if (obj === undefined && obj2 === undefined) return true;
      if (obj === undefined && obj2 !== undefined) return false;
      if (obj !== undefined && obj2 === undefined) return false;

      if (obj === false && obj2 === false) return true;
      if (obj === false && obj2 !== false) return false;
      if (obj !== false && obj2 === false) return false;

      if (obj === null && obj2 === null) return true;
      if (obj === null && obj2 !== null) return false;
      if (obj !== null && obj2 === null) return false;

      if (typeof obj === 'string' && typeof obj2 === 'string') return obj === obj2;
      if (typeof obj === 'date' && typeof obj2 === 'date') return obj === obj2;

      if (obj instanceof RegExp) return obj2 instanceof RegExp && obj.toString() === obj2.toString();

      var eq = true, keys = {};
      for (var k in obj){
        keys[k] = true;
        if (obj[k] instanceof RegExp){
          eq = obj[k].toString() === obj2[k].toString();
        } else if (B.isPlainObj(obj[k])){
          eq = B.deepEqual(obj[k], obj2[k]);
        } else if (Array.isArray(obj[k])){
          if (!Array.isArray(obj2[k]) || obj2[k].length !== obj[k].length) return false;

          for (var i = 0; i < obj[k].length; i++) if (!B.deepEqual(obj[k][i], obj2[k][i])) return false;
        } else {
          eq = obj2.hasOwnProperty(k) && B.stringify(obj[k]) === B.stringify(obj2[k]);
        }

        if (!eq) return eq;
      }
      for (var j in obj2)
        if (!keys[j]) return false;

      return eq;
    };

    //alias
    B['equal'] = B.deepEqual;

    /*
      Get deep properties of an object if they exist, returning undefined if they don't.
        Takes object to be inspected as first argument and string of period-delimeted properties 
        as second argument. (i.e. deepProp(someobj, 'foo.bar.baz.0.whoop.whoop'))
  
        String begins with first level of properties. No need for an initial period.
  
        Numeric indexes can be included in property string for arrays.
    */
    B['deepProp'] = function(obj, _pStr) {
      if (!obj || _pStr === '' || _pStr === undefined || _pStr === null
         || _pStr === false || !_pStr.toString){ return obj; }
  
      var pStr = _pStr.toString()
        , props = pStr.replace(/^\./,'') //discard initial . if included
                      .split('.'); //split(/[^\\]\./) - escaping
      if (!props){ return obj; }

      var pobj = obj;
      while (props.length > 0){
        pobj = pobj[props[0]];
        if (!pobj){ break; }
        props.shift();
      }

      return pobj;
    };

    /*
      Is deep property defined?
    */
    B['isPropDefined'] = function(obj, pStr){
      return typeof B.deepProp(obj, pStr) === 'undefined' ? false : true;
    };

    /*
      does object have deep property
    */
    B['has'] = function(obj, pStr){
      var ps = B.pathStat(obj, pStr);
      return B.call(ps, 'parent.hasOwnProperty', B.get(ps, 'lpath'));
    };

    /*
      Set deep properties
        If properties or parent objects are not defined, create objects until
        reaching desired depth and then set property
  
        Takes object to be set upon as first argument, string of period-delimeted 
        properties as second argument, and value to be set as third argument
  
        String begins with first level of properties. No need for an initial period
        , and no need for a trailing period
  
        Blank property string sets obj to val. If obj is undefined, it is defined as
        and object
  
        Returns obj with property set
    */
    B['setDeepProp'] = function(obj, pStr, val){
      if (!obj || !pStr){ obj = val; return obj; }

      var props = (pStr || '').replace(/^\.|\.$/g,'') //discard initial/trailing .
                              .split('.');

      var pobj = obj || {};

      while (props.length > 1){
        if (props[1] === '[]'){
          pobj[props[0]] = pobj[props[0]] || [{}];
          pobj = pobj[props[0]][pobj[props[0]].length - 1];
          props.shift();
        } else {
          if (B.isInt(props[1]) && parseInt(props[1], 10) >= 0
             && B.isNull(B.get(pobj, props[0] + '.' + props[1])) && props[2]){

            props[1] = parseInt(props[1], 10);
            pobj[props[0]] = pobj[props[0]] || [];

            pobj = pobj[props[0]];
            props.shift();
          }

          pobj[props[0]] = typeof pobj[props[0]] === 'object' ? pobj[props[0]] : {};
          pobj = pobj[props[0]];
        }
        props.shift();
      }

      pobj[props[0]] = val;
      return obj;
    };

    /*
      Create an object with supplied keys, with each key defined as a deep copy of def
    */
    B['defObj'] = function(keys, def){
      var obj = {},
          ckeys = B.toArray(B.copy(keys));
  
      ckeys.forEach(function(k){
        return obj[k] = B.copy(def);
      });
  
      return obj;
    };

    /*
      delete a deep object key
    */
    B['delete'] = function(obj, path){
      if (!obj || !path) return obj;

      var pc = path.split('.')
        , l = pc.pop()
        , o = B.get(obj, pc.join('.'));

      if (!o) return obj;

      delete o[l];
      return obj;
    };

    /*
      Get values of an object as an array
    */
    B['objVals'] = function(obj){
      var vals = [];
      if (!obj) return vals;
      for (var k in obj){
        vals.push(obj[k]);
      }
      return vals;
    };

    /*
      Create an object of deeply set properties. Method is passed an object of keys representing
      deep properties and values representing the values to set these deep properties to
    */
    B['deepObj'] = function(keys, values, options){
      var vals = typeof values !== 'undefined' ? values : 
                 (!Array.isArray(keys) ? B.objVals(keys) : [])
        , _keys = Array.isArray(keys) ? keys : Object.keys(keys)
        , obj = {}
        , o = options || {};

      if (o.flat){
        _keys.forEach(function(k, i){
          return obj[k] = vals[i];
        });
      } else {
        _keys.forEach(function(k, i){
          return B.set(obj, k, vals[i]);
        });
      }

      return obj;
    };

    /*
      If a deep property is undefined, set it to the given default
    */
    B['deepDefault'] = function(obj, pStr, def){
      var ret = B.get(obj, pStr);
      if (typeof ret === 'undefined'){
        B.set(obj, pStr, def);
        ret = def;
      }

      return ret;
    };

    /*
      Call a deep property that is a function if it exists, applying arguments
        if property is undefined or not callable, return undefined
        first argument is the object to be inspected (and serves as object binding for function)
        second argument is a property string to call
        subsequent arguments are applied to called function
    */
    B['deepCall'] = function(obj, pStr){
      var pArr = (pStr || '').split('.')
        , pObj = B['deepProp'](obj, pArr.slice(0, pArr.length - 1).join('.'));
      if (!pObj) return undefined;
      var func = B['deepProp'](obj, pStr);
      if (typeof func !== 'function') return undefined;
      return pObj[pArr.pop()].apply(pObj, Array.prototype.slice.call(arguments, 2));
    };

    /*
      Make deep calls in series, each argument after obj is an array of arguments for each
      successive deep call
      If value becomes undefined, chain is exited
    */
    B['chainCall'] = function(obj){
      var args = Array.prototype.slice.call(arguments, 1);
      var val = obj;
      for (var i = 0; i < args.length; i++){
        var _a = B.toArray(args[i]);
        _a.unshift(val);
        val = B.call.apply(B, _a);
        if (typeof val === 'undefined' && _a.length === 2) val = B.get.apply(B, _a);
        if (typeof val === 'undefined') break;
      }
      return val;
    };

    /*
      Flexible keyspacing for deep objects - attempt to find a deep property
      If not found, attempt to find an alternated deep property path that alphanumerically
      matches the property string
        i.e. 'some.deep.property' would match 'somedeep.property' or 'som.edee.pprop.ert.y'
    */
    B['deepFind'] = function(obj, pStr){
      if (!obj) return undefined;
      var prop = B._get(obj, pStr);
      if (typeof prop !== 'undefined') return prop;

      var sPStr = B._call(B.sanitize(pStr), 'replace', /(\W|\s)/g, '');
      prop = obj;

      if (!sPStr) return prop;

      var found;
      do {
        found = false;
        if (typeof prop !== 'object') break;
        var keys = Object.keys(prop);
        for (var i = 0; i < keys.length; i++){
          var re = new RegExp('^' + keys[i], 'i');
          if (!sPStr.match(re)) continue;
          prop = prop[keys[i]];
          sPStr = sPStr.replace(re, '');
          found = true;
          break;
        }
      } while (found && sPStr);
      if (!found && sPStr) prop = undefined;

      return prop;
    };

    /*
      deepMatch - get an object of paths
    */
    B['deepMatch'] = function(obj, path){
      var o = B.objFlatten(obj);
      if (!o || B.isEmpty(o)) return {};
      if (path === '') return {'': obj};
      if (!path) return {};

      var k = Object.keys(o)
        , r = new RegExp(path.replace(/\./g, '\\.').replace(/\$\$/g, '[^\\.]*'));
      k.forEach(function(p){
        if (!p.match(r)) delete o[p];
        return;
      });

      return o;

    };

    /*
      return key or value of object based on index
    */
    B['objIndex'] = function(obj, ind, val){
      if (!obj) return undefined;

      obj = B.cast(obj, 'object');
      ind = ind || 0;

      if (val) return (B.objVals(obj) || [])[ind];
      return (Object.keys(obj) || [])[ind];
    };

    /*
      deepPick - pick out deep properties from an object, pAr is an array of strings
      for deep properties and/or objects where keys represent deep properties to set and
      values are functions to run on obj, returning the value for the deep property
    */
    B['deepPick'] = function(obj, pAr){
      if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
      if (!pAr || pAr.length === 0) return {};

      var nObj = {};
      pAr.forEach(function(p){
        if (typeof p === 'object'){
          var k = Object.keys(p)[0];
          return B.set(nObj, k, p[k].call(obj, k, pAr));
        }

        var pr = B.get(obj, p);
        if (typeof pr === 'undefined') return;
        return B.set(nObj, p, pr);
      });

      return nObj;
    };

    /*
      check if an object "matches" another object -- meaning all keys in other object are found in and equal in obj
    */
    B['objMatch'] = function(obj, mObj){
      if (!obj || typeof obj !== 'object') return false;
      if (!mObj || typeof mObj !== 'object') return false;

      var m = true;
      for (var k in mObj){
        if (!B.deepEqual(obj[k], mObj[k])){
          m = false;
          break;
        }
      }

      return m;
    };

    /*
      is object null or undefined
    */
    B['isNull'] = function(o){
      return o === null || o === undefined;
    };

    /*
      is o an empty object or array
    */
    B['isEmpty'] = function(o){
      return B.isNull(o) || !B.isObj(o) || B.deepEqual(o, {}) || B.deepEqual(o, []);
    };

    /*
      is o a blank string, false, or 0
    */
    B['isBlank'] = function(o){
      var t = B.typeof(o);
      if (t === 'string') return o === '';
      return B.cast(o, 'string') === '';
    };

    /*
      is o a plain object
    */
    B['isPlainObj'] = function(o){
      return !B.isNull(o) && typeof o === 'object' && o.constructor === Object;
    };

    /*
      is o a plain object or array
    */
    B['isObj'] = function(o){
      return B.isPlainObj(o) || Array.isArray(o);
    };

    /*
      flatten an object into an object of all it's deep properties, paired with values
    */
    B['objFlatten'] = function(obj, options, cobj, pre){
      var fobj = cobj || {}
        , _o = options || {}
        , prf = pre || '';
      for (var k in obj){
        var _p = prf + (prf ? '.' : '') + k;
        if (!_o.deepest || !B.isObj(obj[k])){
          fobj[_p] = obj[k];
          if (_o.stop_on_arrays && Array.isArray(obj[k])) continue;
        } else if (
                     (_o.deepest && ((Array.isArray(obj[k]) && obj[k].length === 0) || B.equal({}, obj[k])))
                  || (_o.stop_on_arrays && Array.isArray(obj[k]))
                  )
        {
          fobj[_p] = obj[k];
          continue;
        }
        if (B.isObj(obj[k])) B.objFlatten(obj[k], _o, fobj, _p);
      }
      if (!cobj) fobj = B.objSort(fobj, 'length', {'flat': true});
      return fobj;
    };

    /*
      Aliases for deep property methods
    */
    B['_get'] = B.deepProp;
    B['_set'] = B.setDeepProp;
    B['get'] = B.deepProp;
    B['set'] = B.setDeepProp;
    B['_call'] = B.deepCall;
    B['call'] = B.deepCall;
    B['_chain'] = B.chainCall;
    B['chain'] = B.chainCall;
    B['_find'] = B.deepFind;
    B['find'] = B.deepFind;
    B['def'] = B.deepDefault;
    B['default'] = B.deepDefault;
    B['match'] = B.deepMatch;

    /*
      create a mongodb-style diff object between two objects, including $set & $unset
    */
    B['objDiff'] = function(a, b){
      var d = {};
      if (!a || !B.isObj(a)) a = {};
      if (!b || !B.isObj(b)) return {'$unset': Object.keys(a), '$set': {'': b}, '$type': {'': B.typeof(b)}};
      var _a = B.objFlatten(a), _b = B.objFlatten(b);

      d.$type = {};

      d.$type[''] = B.typeof(b);

      for (var k in _b){
        var __a = B.typeof(_a[k])
          , __b = B.typeof(_b[k]);
        if (__a === __b || !__b.match(/object|array/)) continue;
        d.$type[k] = __b;
      }

      d.$unset = B.difference(Object.keys(_a), Object.keys(_b));
      var i = 0;
      while (i < d.$unset.length){
        var re = new RegExp('^' + d.$unset[i].replace(/\./, '\\.') + '\\.');
        d.$unset = B.filter(d.$unset, function(e){ return !re.test(e); });
        i++;
      }

      d.$set = {};
      _a = B.objFlatten(a, {'deepest': true});
      _b = B.objFlatten(b, {'deepest': true});
      var set = B.difference(Object.keys(_b), d.$unset);
      i = 0;
      while (i < set.length){
        if (!B.deepEqual(_b[set[i]], _a[set[i]])){
          var _re = new RegExp('^' + set[i].replace(/\./, '\\.') + '(\\.|$)');
          d.$unset = B.filter(d.$unset, function(e){ return !_re.test(e); });
          d.$set[set[i]] = _b[set[i]];
        }
        i++;
      }

      //sorting by length to optimize patching
      d.$set = B.objSort(d.$set, 'length', {'flat': true});
      d.$type = B.objSort(d.$type, 'length', {'flat': true});
      d.$unset = B.sort(d.$unset, 'length');

      return d;
    };

    //try to sort and object by its keys (or values)
    B['objSort'] = function(obj, iter, options){
      obj = B.cast(obj, 'object') || {};
      var _o = options || {};

      var ks = B.sort(_o.values ? B.objVals(obj) : Object.keys(obj), iter)
        , vs = B.map(ks, function(s){ return obj[s]; });
      return B.deepObj(ks, vs, _o);
    };

    /*
      convert an object to an array
    */
    B['objToArray'] = function(obj){
      var a = [];
      if (!obj || !B.isObj(obj)) return a;
      var i;
      for (var k in obj){
        i = parseInt(k, 10);
        if (Number.isNaN(i)) continue;
        a[parseInt(k, 10)] = obj[k];
      }
      return a;
    };

    /*
      path stat - stat a path for info
    */
    B['pathStat'] = function(obj, path){
      var e = B.get(obj, path);
      //if (e === undefined) return {};
      var s = {
        'type': B.typeof(e)
      };
      var pc = path.split('.')
        , lp = pc.pop()
        , p = pc.join('.');
      s.val = e;
      s.lpath = lp;
      if (lp !== ''){
        s.ppath = p;
        s.parent = B.get(obj, s.ppath);
        s.ptype = B.typeof(s.parent);
        s.is_el = s.ptype === 'array';
      }
      s.comp = B.pathComp(path);
      s.has = B.call(s, 'parent.hasOwnProperty', s.lpath);

      return s;
    };

    /*
      components of a deep path
    */
    B['pathComp'] = function(path){
      var c = []
        , p = (B.cast(path, 'string') || '').split('.');
      while (p.length > 0){
        c.unshift(p.join('.'));
        p.pop();
      }
      if (c[0] !== '') c.unshift('');
      return c;
    };

    /*
      patch an object based on a diff
    */
    B['objPatch'] = function(obj, patch){
      if (patch.$type[''] === 'array' && !B.isObj(obj)) obj = [];
      if (patch.$type[''] === 'object' && !B.isObj(obj)) obj = {};
      if (patch.$set[''] && !B.isObj(patch.$set[''])) return patch.$set[''];

      for (var k in patch.$set){
        B.set(obj, k, patch.$set[k]);
      }
      for (var _k in patch.$type){
        var _p = B.get(obj, _k);
        if (B.typeof(_p) !== patch.$type[_k])
          obj = B.set(obj, _k, B[patch.$type[_k] === 'array' ? 'objToArray' : 'toObject'](_p));
      }

      var ar = {};

      patch.$unset.forEach(function(e){
        var pstat = B.pathStat(obj, e);
        if (pstat.is_el){
          var _pp = ar[pstat.ppath] || 0;
          return ar[pstat.ppath] = ++_pp;
        }

        return B.delete(obj, e);
      });

      for (var a in ar){
        (B.get(obj, a) || []).splice(ar[a]);
      }

      return obj;
    };

    /*
      conform an object to a specified schema (definition of all path types)
    */
    B['objSchema'] = function(obj, sch){
      sch = B.cast(sch, 'object');
      if (B.isEmpty(sch)) return obj;

      var _sch = B.objSort(sch, 'length', {'flat': true})
        , fo = {'': obj};

      if (_sch['']) obj = B.cast(obj, _sch[''] !== 'mixed' ? _sch[''] : 'object');

      if (B.isPlainObj(obj)){
        fo = B.extend(fo, B.objFlatten(obj, {'stop_on_arrays': true}));

        var dk = B.difference(Object.keys(fo), Object.keys(_sch));

        dk = B.filter(dk, function(k){
          var ps = B.pathStat(obj, k)
            , ob = true, b;

          while (ps.comp.length > 0){
            var __b = _sch[ps.comp.pop()];
            if (B.call(__b, 'match', /^(object|mixed)/)){ ob = false; break; }
            if (__b) break;
          }

          return ob;
        });

        //remove keys of descendents of allowed objects
        dk = B.filter(dk, function(k){
          return !B.find(Object.keys(_sch), function(s){
            return _sch[s].match(/^(object|mixed)$/) && k.match(new RegExp('^' + s.replace(/\./, '\\.')));
          });
        });

        //remove keys of ancestors of allowed objects
        dk = B.filter(dk, function(k){
          return !B.find(Object.keys(_sch), function(s){
            return s.match(new RegExp('^' + k.replace(/\./, '\\.')));
          });
        });

        dk.forEach(function(e){
          do {
            obj = B.delete(obj, e);
            var ps = B.pathStat(obj, e);
            if (ps.ptype === 'array') B.call(B.get(ps.ppath), 'splice', ps.lpath, 1);
          } while (B.has(obj, e));
        });
      }

      delete _sch[''];
      delete fo[''];

      var v, t;
      for (var k in _sch){
        if (_sch[k] === 'mixed'){
          v = B.has(obj, k);
          if (!v) obj = B.set(obj, k, undefined);
        } else {
          v = B.get(obj, k);
          t = B.typeof(v);
          if (t === _sch[k]) continue;
          obj = B.set(obj, k, B.cast(v, _sch[k]));
        }
      }

      return obj;
    };

    //////////////////////////////////////////////////////////////////////////////
    /////////////////////////////COLLECTIONS//////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////

    /*
      Create an array of the results of running the iterator count times
        Iterator is called bound to the in-progress array, first argument is current index
        , second argument is count, third argument is iterator
    */
    B['sequence'] = function(iter, count){
      var a = [];
      for (var i = 0; i < count; i++){
        a.push(iter.call(a, i, count, iter));
      }
      return a;
    };

    /*
      Create an array of null elements of size length. 
        For linters that don't like Array(size)
    */
    B['nullArray'] = function(size){
      return B.sequence(function(){ return undefined; }, size);
    };

    /*
      Create an object of size length with all keys initialized to def
    */
    B['defArray'] = function(size, def){
      return B.sequence(function(){ return B.copy(def); }, size);
    };

    /*
      If obj is an array, keep as is. If not, make an array of one element containing obj
    */
    B['toArray'] = function(obj){
      return Array.isArray(obj) ? obj : [obj];
    };

    /*
      convert an array into an object
    */
    B['toObject'] = function(arr){
      var rv = {};
      if (!Array.isArray(arr)) return rv;

      for (var i = 0; i < arr.length; ++i)
        if (arr[i] !== undefined) rv[i] = arr[i];
      return rv;
    };

    /*
      If obj is an array with one element, return the single element. Otherwise, keep as is.
    */
    B['deArray'] = function(obj){
      return Array.isArray(obj) && obj.length === 1 ? obj[0] : obj;
    };

    //map from Underscore
    B['map'] = function(ar, iter){
      var res = [];
      ar.forEach(function(e, i){
        return res.push(iter(e, i));
      });
      return res;
    };

    //filter from underscore
    B['filter'] = function(ar, iter){
      var res = [];
      if (!ar) return res;
      ar = B.cast(ar, 'array') || [];

      var it = B.typeof(iter);
      if (it !== 'function'){
        var str = B.copy(iter);
        iter = function(a){ return a === str; };
      }

      ar.forEach(function(e, i){
        if (iter.call(ar, e, i)) res.push(e);
        return;
      });
      return res;
    };

    //sort
    B['sort'] = function(ar, iter){
      if (!ar) return [];
      ar = B.cast(ar, 'array') || [];

      var it = B.typeof(iter);
      if (it !== 'function'){
        var str = B.cast(iter, 'string');
        iter = function(a, b){ return B.get(a, str) > B.get(b, str) ? 1 : -1; };
      }

      return ar.sort(iter);
    };

    /*
      Pluck a deep property from each element in an array
    */
    B['deepPluck'] = function(ar, pStr){
      var a = B.toArray(ar);
      return B.map(a, function(e){ return B._get(e, pStr); });
    };

    /* 
      Split an array of arrays of size length, including a final array containing any remainder
    */
    B['splitArray'] = function(array, size){
       var count = array.length / size
         , parts = [];

       if (Math.floor(count) !== count) count++;

       for (var i = 1; i <= count; i++) 
         parts.push(array.slice((i - 1) * size, i * size));

       return parts;
    };

    /*
      Simpler version of find - find an element that has deep equality with value
    */
    B['find'] = function(array, value, options){
      if (!array) return undefined;
      var fd, f, ind = 0, _o = options || {}
        , it;

      it = B.typeof(value);
      if (it !== 'function'){
        it = function(a){ return B.equal(a, value); };
      } else {
        it = value;
      }

      while (!f && ind < array.length){
        if (it(array[ind])){
          fd = array[ind];
          f = true;
        }
        ind++;
      }
      return _o.index && f ? --ind : fd;
    };

    /*
      return the index of a found element
    */
    B['findIndex'] = function(array, value){
      return this.find(array, value, {'index': true});
    };

    /*
      return elements in the first array not present in the second array
    */
    B['difference'] = function(a, __a){
      var d = [], self = this;
      if (!a || !Array.isArray(a)) return d;
      if (!Array.isArray(__a) || !__a) return a;

      var _a = self.copy(__a);

      a.forEach(function(e, i){
        var ind = self.findIndex(_a, e);
        if (self.isNull(ind)) return d.push(e);
        return _a.splice(ind, 1);
      });

      return d;
    };

    B['arrayContained'] = function(a, __a){
      return B.equal([], B.difference(a, __a));
    };

    B['arrayIndifferent'] = function(a, __a){
      return B.arrayContained(a, __a) && B.arrayContained(__a, a);
    };

    /*
      return an array of diff patches transforming a into b
    */
    B['arrayDiff'] = function(a, b){
      var d = {
        '$push': {}
      , '$pull': {}
      , '$position': {}
      }, uuids = {}, self = this;

      var _b = self.copy(b)
        , _a = self.copy(a);
      _a.forEach(function(e, i){
        var ind = self.findIndex(_b, e);
        if (self.isNull(ind)){
          d.$pull[i] = e;
        } else if (ind !== i){
          d.$position[i] = ind;
        }
        var id = B.uuid();
        uuids[id] = true;
        _a[i] = id;
        return _b[ind] = id;
      });

      _b.forEach(function(e, i){
        if (typeof e === 'string' && uuids[e]) return;
        var ind = self.findIndex(_a, e);
        if (self.isNull(ind)) d.$push[i] = e;
        return;
      });

      return d;
    };

    //////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////RANDOM/////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////

    /*
      Return a random integer in a range
    */
    B['random_int'] = function(min_incl, max_excl){
      return Math.floor(Math.random() * (max_excl - min_incl)) + min_incl;
    };

    /*
      Return a random boolean value
    */
    B['random_bool'] = function(){
      return B.random_int(0, 2) % 2 === 0 ? true : false;
    };

    /*
      Return random elements from array. If included, count elements are returned
    */
    B['random_els'] = function(array, count){
      count = count || 1;
      var sample = [], copy = B.copy(array);
      for (var i = 0; i < count; i++)
        sample.splice(sample.length, 0, copy.splice(B.random_int(0, copy.length), 1)[0]);
      return count === 1 ? sample[0] : sample;
    };

    /* 
      Random string of length size. If chars are passed, these letters are used
        Otherwise, defaults to the Javascript-safe variable naming characters
    */
    B['random_string'] = function(size, chars){
      var rand_chars = chars ? B.copy(chars) : '0123456789$_ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
      if (!Array.isArray(rand_chars)) rand_chars = rand_chars.split('');
      return B.toArray(B.random_els(rand_chars, size)).join('');
    };

    //////////////////////////////////////////////////////////////////////////////
    //////////////////////////////STRINGS/////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////

    /*
      Sanitize string by removing apostrophes, replacing non-word characters with spaces
        and lowercasing string
    */
    B['sanitize'] = function(str){
      return B._chain(str, ['replace', /\'/g], ['replace', /\W/g, ' '], ['toLowerCase']);
    };

    /*
      Alphanumeric match - returns a regular expression which matches on the alphanumeric characters
        of str, regardless of non-alphanumeric characters or case
    */
    B['alpha_match'] = function(str){
      return new RegExp(B.cail(str, 'replace', /\W/g, '[\\W]*') || '', 'gi');
    };

    /*
      Capitalize each word in a string
    */
    B['capitalize'] = function(str){
      return B._call(str, 'replace', /\w\S*/g, function(s){ return s.charAt(0).toUpperCase() + s.substr(1).toLowerCase(); });
    };

    //////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////MISC///////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////

    /*
      Generate a UUID 
      credit: http://slavik.meltser.info/the-efficient-way-to-create-guid-uuid-in-javascript-with-explanation/
    */
    B['uuid'] = function(){
      var _seq = function(mid){
        var i = (Math.random().toString(16) + '000000000').substr(2, 8);
        return mid ? '-' + i.substr(0, 4) + '-' + i.substr(4, 4) : i;
      };
      return _seq() + _seq(true) + _seq(true) + _seq();
    };

    /*
      Fix wonky precisions and eliminate trailing zeroes
        precision defaults to 5
    */
    B['fix_precision'] = function(float, precision){
      precision = typeof precision === 'undefined' ? 5 : parseInt(precision, 10);
      return parseFloat(parseFloat(float).toFixed(precision).toString());
    };

    /*
      Email regular express
    */
    B['email_regexp'] = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

    /*
      Check if a string is valid JSON
    */
    B['isValidJSON'] = function(jStr){
      if (typeof jStr !== 'string') return false;

      return (/^[\],:{}\s]*$/).test(
                                     jStr.replace(/\\["\\\/bfnrtu]/g, '@')
                                         .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
                                         .replace(/(?:^|:|,)(?:\s*\[)+/g, '')
                                   );
    };

    /*
      Safely parse valid JSON or return an error if it is invalid
    */
    B['parseJSON'] = function(jStr){
      return B.isValidJSON(jStr) ? JSON.parse(jStr) : new Error('Invalid JSON');
    };

    /*
      checks if value is a Number or contains string equivalent to a number
    */
    B['isNumber'] = function(val){
      if (typeof val === 'number' && !Number.isNaN(val)) return true;

      var pi = parseInt(val, 10);
      if (typeof pi !== 'undefined' && pi.toString() === val) return true;
      if (typeof pi === 'undefined') return false;

      pi = parseFloat(val, 10);
      if (typeof pi !== 'undefined' && pi.toString() === val) return true;

      return false;
    };

    /*
      checks if value is n integer (Number or string)
    */
    B['isInt'] = function(val){
      var pi = parseInt(val, 10);

      if (typeof pi !== 'undefined' && !Number.isNaN(pi)
         && ((typeof val === 'number' && val === pi) || pi.toString() === val)) return true;

      return false;
    };

    /*
      more detailed typeof
    */
    B['typeof'] = function(val){
      var t = typeof val;
      if (t.match(/string|number|boolean|function|undefined/)) return t;
      if (val === null) return 'null';
      if (Array.isArray(val)) return 'array';
      var n = B.get(val, 'constructor.name');
      if (n === 'Date') return 'date';
      if (n === 'RegExp') return 'regexp';
      return t;
    };

    /*
      robustly cast a parameter into the type specified
    */
    B['cast'] = function(a, type){
      type = String(type) || '';
      if (!type.match(/^(string|number|boolean|date|regexp|object|array|function|undefined|null)$/)) return a;

      var _a, ta = B.typeof(a);

      if (ta === type) return a;

      if (type === 'object'){
        if (ta === 'array') return B.toObject(a);
        if (B.isNull(a)) return {};
        return a ? B.deepObj([B.cast(a, 'string')], [a]) : {};
      }

      if (type === 'array'){
        if (ta === 'object'){
          _a = B.objToArray(a);
          return _a.length > 0 ? _a : B.objVals(a);
        }
        if (B.isNull(a)) return [];
        return a ? [a] : [];
      }

      if (type === 'string'){
        if (B.isNull(a)) return '';
        if (ta === 'object') return Object.keys(a).length > 0 ? B.stringify(a) : '';
        if (ta === 'array') return a.length > 0 ? B.stringify(a) : '';
        if (B.isNull(a)) return '';
        return String(a);
      }

      if (type === 'number'){
        if (B.isNull(a) || B.isBlank(a)) return undefined;
        if (ta === 'object' && Object.keys(a).length <= 0) return undefined;
        if (ta === 'array' && a.length <= 0) return undefined;
        return Number(a);
      }

      if (type === 'boolean'){
        if (ta === 'object' && Object.keys(a).length <= 0) return false;
        if (ta === 'array' && a.length <= 0) return false;
        return a ? true : false;
      }

      if (type === 'date'){
        if (B.isNull(a) || B.isBlank(a)) return undefined;
        if (ta === 'object' && Object.keys(a).length <= 0) return undefined;
        if (ta === 'array' && a.length <= 0) return undefined;
        return new Date(a);
      }

      if (type === 'regexp'){
        if (B.isNull(a) || B.isBlank(a)) return undefined;
        if (ta === 'object' && Object.keys(a).length <= 0) return undefined;
        if (ta === 'array' && a.length <= 0) return undefined;
        return RegExp(a);
      }

      if (type === 'function'){
        if (!a) return undefined;
        if (ta === 'object' && Object.keys(a).length <= 0) return undefined;
        if (ta === 'array' && a.length <= 0) return undefined;
        return B.np;
      }

      if (type === 'undefined'){
        return undefined;
      }

      if (type === 'null'){
        return null;
      }

      return a;
    };

    //////////////////////////////////////////////////////////////////////////////
    /////////////////////////////UTILITIES////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////

    /*
      Lint arguments
        Takes native arguments object and optional options object.
  
        Returns an object of arguments with names. Useful for handling optional
        arguments, validations, and boilerplate (options, callback)
  
        * Last function is treated as 'callback'. If not found, noop is used.
        * Last object is treated as 'options'. If not found, empty object is used.
  
        i.e. returns {'options': <last argument that was an object>
                     , 'callback': <last argument that was a function>}

        Options:
          * no_callback: do not define a callback
          * callback: use as the callback
          * no_options: do not define options
          * options: use as options
          * no_clone_options: do not make a deep copy of the options object
          * defaults: object of default values for linted arguments, which are overridden
              if defined elsewhere.
          * templates: object of functions for defining arguments. Keys are
              argument names. Values are integers of argument indexes or
              functions that get passed the arguments and options parameters passed 
              initially, bound to an in-progress object of linted arguments. 
              Template functions override other definitions.
              Templates are called after defaults are populated.
          * validators: object of functions (or objects) that are run to validate
              linted arguments. If value is a function, function is bound to the
              specified key in the linted arguments and passed the linted arguments
              object, the original arguments object, and original options object.
              If validator returns false, an error is thrown. If value is an object, 
              'validator' key must be a function as described, 'error' is a key with
              the error object to be thrown if validator returns false.
              Validators are AFTER defaults are populated.

    */
    B['argulint'] = function(args, options){
      var opts = options || {},
          largs = opts.defaults ? B.copy(opts.defaults) : {}; //the linted arguments object
  
      if (opts.templates){
        Object.keys(opts.templates).forEach(function(k){
          if (typeof opts.templates[k] !== 'function'){
            return largs[k] = args[opts.templates[k]];
          }
          return largs[k] = opts.templates[k].call(largs, args, options);
        });
      }

      //sniff out the callback
      if (!largs.callback && !opts.no_callback && !(largs.callback = opts.callback)){
        for (var a = args.length - 1; a >= 0; a--){
          if (typeof args[a] !== 'function'){ continue; }
          largs.callback = args[a];
          break;
        }
        if (typeof largs.callback === 'undefined') largs.callback = B.noop;
      }

      //sniff out the options
      if (!largs.options && !opts.no_options && !(largs.options = opts.options)){
        for (var b = args.length - 1; b >= 0; b--){
          if (typeof args[b] !== 'object' || Array.isArray(args[b])){ continue; }
          largs.options = args[b];
          break;
        }
        if (typeof largs.options === 'undefined') largs.options = {};
      }

      if (opts.validators){
        Object.keys(opts.validators).forEach(function(k){
          var func, err, v = B.toArray(opts.validators[k]);

          return v.forEach(function(vs){
            if (typeof vs === 'function'){
              func = vs;
            } else {
              func = vs.validator;
              err = vs.error;
            }
  
            if (!func.call(largs[k], largs, args, options)){
              throw new Error(err || 'Argument "' + k + '" is invalid');
            }
  
            return;
          });
        });
      }

      //clone options, unless specified not to, prevents overwritting options when extending, etc.
      //if (!opts.no_clone_options){ largs.options = B.copy(largs.options); }

      //create aliases
      if (!opts.no_aliases){ largs.o = largs.options; largs.cb = largs.callback; }

      return largs;
    };

    return B;
  };

  if (typeof module !== 'undefined'){ module.exports = new Belt(); } //server
  else { this.Belt = new Belt(); }

}).call(this);
