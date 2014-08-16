/*
 * jsbelt
 * 
 *
 * Copyright (c) 2014 Ben Sack
 * Licensed under the MIT license.
 */

'use strict';

(function(){

  var Belt = function(){
    var _M_ = {};
  
    //////////////////////////////////////////////////////////////////////////////
    /////////////////////////////FUNCTIONS////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////
  
    /*
    * Noop - nothing to see here
    */
    _M_['noop'] = function(){ return; };
  
    /*
    * Log arguments sent to a callback
    *   Useful for when a callback doesn't really matter, but it'd be nice to see
    *   what's up
    */
    if (typeof console !== 'undefined' && console.log){
      _M_['callog'] = function(){ return console.log(arguments); };
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
    _M_['callwrap'] = function(func, index, thisObj){
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
    _M_['callset'] = function(func, obj, key, set_index, call_index, thisObj){
      return function(){
        obj[key] = arguments[set_index];
        return _M_.callwrap.call(null, func, call_index, thisObj).apply(thisObj, arguments);
      };
    };
  
    //////////////////////////////////////////////////////////////////////////////
    /////////////////////////////OBJECTS//////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////
  
    /*
      Copy/clone an object or array - pass true as second argument make a shallow
        copy, otherwise defaults to a deep copy
    */
    _M_['copy'] = function(obj, shallow_copy){
      if (typeof obj !== 'object'){ return obj; }
  
      if (!shallow_copy){ return JSON.parse(JSON.stringify(obj)); }
  
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

    /*
      Are two objects deeply equal?
    */
    _M_['deepEqual'] = function(obj, obj2){
      return JSON.stringify(obj) === JSON.stringify(obj2);
    };

    /*
      Get deep properties of an object if they exist, returning undefined if they don't.
        Takes object to be inspected as first argument and string of period-delimeted properties 
        as second argument. (i.e. deepProp(someobj, 'foo.bar.baz.0.whoop.whoop'))
  
        String begins with first level of properties. No need for an initial period.
  
        Numeric indexes can be included in property string for arrays.
    */
    _M_['deepProp'] = function(obj, pStr) {
      if (!obj || !pStr){ return obj; }
  
      var props = pStr.replace(/^\./,'') //discard initial . if included
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
    _M_['isPropDefined'] = function(obj, pStr){
      return typeof _M_.deepProp(obj, pStr) === 'undefined' ? false : true;
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
    _M_['setDeepProp'] = function(obj, pStr, val){
      if (!obj || !pStr){ obj = val; return obj; }

      var props = (pStr || '').replace(/^\.|\.$/g,'') //discard initial/trailing .
                              .split('.');

      var pobj = obj || {};
      while (props.length > 1){
        pobj[props[0]] = typeof pobj[props[0]] === 'object' ? pobj[props[0]] : {};
        pobj = pobj[props[0]];
        props.shift();
      }

      pobj[props[0]] = val;
      return obj;
    };

    /*
      If a deep property is undefined, set it to the given default
    */
    _M_['deepDefault'] = function(obj, pStr, def){
      if (typeof _M_.deepProp(obj, pStr) === 'undefined'){
        obj = _M_.setDeepProp(obj, pStr, def);
      }

      return obj;
    };

    /*
      Create an array of the results of running the iterator count times
        Iterator is called bound to the in-progress array, first argument is current index
        , second argument is count, third argument is iterator
    */
    _M_['sequence'] = function(iter, count){
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
    _M_['nullArray'] = function(size){
      return _M_.sequence(function(){ return undefined; }, size);
    };

    /*
      If obj is an array, keep as is. If not, make an array of one element containing obj
    */
    _M_['toArray'] = function(obj){
      return Array.isArray(obj) ? obj : [obj];
    };

    /*
      Create an object with supplied keys, with each key defined as a deep copy of def
    */
    _M_['defObj'] = function(keys, def){
      var obj = {},
          ckeys = _M_.toArray(_M_.copy(keys));
  
      ckeys.forEach(function(k){
        return obj[k] = _M_.copy(def);
      });
  
      return obj;
    };

    /*
      Extend an object with another object.
        Shared keys will be overwritten with each iteration of extension
        extender can be a single object or an array of objects, which will be used
        to extend obj in sequence

      credit: underscore + jquery
    */
    _M_['extend'] = function(obj, extender){
      var ext = _M_.toArray(extender);
      ext.forEach(function(e){
        var _e = e || {};
        for (var k in _e){
          if (typeof _e[k] === 'undefined'){ continue; }
          obj[k] = _e[k];
        }
        return;
      });
  
      return obj;
    };

    //////////////////////////////////////////////////////////////////////////////
    ///////////////////////////////HACKS//////////////////////////////////////////
    //////////////////////////////////////////////////////////////////////////////

    /*
      Generate a UUID 
      credit: http://slavik.meltser.info/the-efficient-way-to-create-guid-uuid-in-javascript-with-explanation/
    */
    _M_['uuid'] = function(){
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
    _M_['fix_precision'] = function(float, precision){
      precision = typeof precision === 'undefined' ? 5 : parseInt(precision, 10);
      return parseFloat(parseFloat(float).toFixed(precision).toString());
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
    _M_['argulint'] = function(args, options){
      var opts = options || {},
          largs = opts.defaults ? _M_.copy(opts.defaults) : {}; //the linted arguments object
  
      if (opts.templates){
        Object.keys(opts.templates).forEach(function(k){
          if (typeof opts.templates[k] !== 'function'){
            return largs[k] = arguments[opts.temlates[k]];
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
        if (typeof largs.callback === 'undefined') largs.callback = _M_.noop;
      }

      //sniff out the options
      if (!largs.options && !opts.no_options && !(largs.options = opts.options)){
        for (var b = args.length - 1; b >= 0; b--){
          if (typeof args[b] !== 'object'){ continue; }
          largs.options = args[b];
          break;
        }
        if (typeof largs.options === 'undefined') largs.options = {};
      }

      if (opts.validators){
        Object.keys(opts.validators).forEach(function(k){
          var func, err;
          if (typeof opts.validators[k] === 'function'){
            func = opts.validators[k];
          } else {
            func = opts.validators[k].validator;
            err = opts.validators[k].error;
          }
  
          if (!func.call(largs[k], largs, args, options)){
            throw new Error(err || 'Argument "' + k + '" is invalid');
          }
  
          return;
        });
      }

      //clone options, unless specified not to, prevents overwritting options when extending, etc.
      if (!opts.no_clone_options){ largs.options = _M_.copy(largs.options); }
  
      return largs;
    };
  
    return _M_;
  };

  if (typeof module !== 'undefined'){ module.exports = new Belt(); } //server

  var window = window || undefined;
  if (typeof window !== 'undefined'){ window.jsBelt = new Belt(); } //browser
}.call());
