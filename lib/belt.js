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
      if (typeof obj !== typeof obj2) return false;

      if (obj === undefined && obj2 === undefined) return true;
      if (obj === undefined && obj2 !== undefined) return false;
      if (obj !== undefined && obj2 === undefined) return false;

      if (obj === false && obj2 === false) return true;
      if (obj === false && obj2 !== false) return false;
      if (obj !== false && obj2 === false) return false;

      if (obj === null && obj2 === null) return true;
      if (obj === null && obj2 !== null) return false;
      if (obj !== null && obj2 === null) return false;

      if (obj === 0 && obj2 === 0) return true;
      if (obj === 0 && obj2 !== 0) return false;
      if (obj !== 0 && obj2 === 0) return false;

      if (obj === Infinity && obj2 === Infinity) return true;
      if (obj === Infinity && obj2 !== Infinity) return false;
      if (obj !== Infinity && obj2 === Infinity) return false;

      if (obj === -Infinity && obj2 === -Infinity) return true;
      if (obj === -Infinity && obj2 !== -Infinity) return false;
      if (obj !== -Infinity && obj2 === -Infinity) return false;

      if (typeof obj === 'number' && typeof obj2 === 'number') return obj === obj2;
      if (typeof obj === 'string' && typeof obj2 === 'string') return obj === obj2;
      if (typeof obj === 'date' && typeof obj2 === 'date') return obj === obj2;

      if (typeof obj !== 'object' && (!B._get(obj, 'toString') || !B._get(obj2, 'toString'))) return false;

      var str1 = typeof obj === 'object' ? B.stringify(obj) : B._call(obj, 'toString')
        , str2 = typeof obj2 === 'object' ? B.stringify(obj2) : B._call(obj, 'toString');

      return str1 === str2;
    };

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
                      .split('.');
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
          if (B.isInt(props[1]) && parseInt(props[1], 10) >= 0){
            props[1] = parseInt(props[1], 10);
            pobj[props[0]] = [];
            pobj = pobj[props[0]];
            props.shift();
            for (var i = 0; i <= props[0] && pobj.length < props[0] + 1; i++)
              pobj.push(undefined);
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
    B['deepObj'] = function(keys, values){
      var vals = typeof values !== 'undefined' ? values : 
                 (!Array.isArray(keys) ? B.objVals(keys) : [])
        , _keys = Array.isArray(keys) ? keys : Object.keys(keys)
        , obj = {};

      _keys.forEach(function(k, i){
        return B._set(obj, k, vals[i]);
      });
      return obj;
    };

    /*
      If a deep property is undefined, set it to the given default
    */
    B['deepDefault'] = function(obj, pStr, def){
      if (typeof B.deepProp(obj, pStr) === 'undefined'){
        obj = B.setDeepProp(obj, pStr, def);
      }

      return obj;
    };

    /*
      Call a deep property that is a function if it exists, applying arguments
        if property is undefined or not callable, return undefined
        first argument is the object to be inspected (and serves as object binding for function)
        second argument is a property string to call
        subsequent arguments are applied to called function
    */
    B['deepCall'] = function(obj, pStr){
      var pArr = pStr.split('.')
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
        args[i].unshift(val);
        val = B.deepCall.apply(null, args[i]);
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
      return B.deepEqual(o, {}) || B.deepEqual(o, []);
    };

    /*
      is o a blank string, false, or 0
    */
    B['isBlank'] = function(o){
      return o === '' || o === false || o === 0;
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
    B['objFlatten'] = function(obj, cobj, pre){
      var fobj = cobj || {}
        , prf = pre || '';
      for (var k in obj){
        var _p = prf + (prf ? '.' : '') + k;
        fobj[_p] = obj[k];
        if (B.isObj(obj[k])) B.objFlatten(obj[k], fobj, _p);
      }
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
    B['_find'] = B.deepFind;

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
    B['find'] = function(array, value){
      if (!array) return undefined;
      var fd, f, ind = 0;
      while (!f && ind < array.length){
        if (B.deepEqual(array[ind], value)){ fd = array[ind]; f = true; }
        ind++;
      }
      return fd;
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
