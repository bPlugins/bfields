/**
 * Codestar Framework 2.3.1 — the dependency code, extracted VERBATIM.
 *
 * Source: 3d-viewer-premium/vendor/codestar-framework/assets/js/
 *   - main.js    lines 402-413  (reading a field's data-* attributes into rules)
 *   - plugins.js lines 4393-4479 (Rule.prototype.evalCondition, checkBoolean)
 *
 * Codestar Framework is GPL-2.0-or-later (codestarframework.com), like bfields.
 * Only the minimum jQuery surface those lines touch is shimmed below. Do not
 * edit the extracted blocks: tests/ts/codestar-parity.test.ts asserts that
 * bfields agrees with THIS code, so a "fix" here would test bfields against
 * something that is not Codestar. Re-extract with the sed ranges above.
 */

'use strict';

// The jQuery surface the extracted lines use. `$(this)` returns the field
// stand-in readRules() sets; $.inArray is indexOf (strict).
var current = null;
var $ = function () {
	return current;
};
$.isArray = Array.isArray;
$.inArray = function (item, list) {
	return list.indexOf(item);
};
$.each = function (list, callback) {
	list.forEach(function (item, index) {
		callback.call(item, index, item);
	});
};

/**
 * main.js:402-413, around a stand-in for the field element. `attrs` are the
 * data-* attribute strings CSF::field() printed. jQuery's .data() would turn
 * "1" into 1 first; .toString() / split() give the same strings back for
 * every attribute bfields' fixture contains.
 */
function readRules(attrs) {
	var rules = [];
	current = {
		data: function (name) {
			return attrs[name];
		},
	};
	var ruleset = {
		createRule: function (selector, condition, value) {
			rules.push({ selector: selector, condition: condition, value: value });
			return ruleset;
		},
		include: function () {},
	};
	var normal_ruleset = ruleset, global_ruleset = ruleset;
	var normal_depends = [], global_depends = [];

	          var $field      = $(this),
	              controllers = $field.data('controller').split('|'),
	              conditions  = $field.data('condition').split('|'),
	              values      = $field.data('value').toString().split('|'),
	              is_global   = $field.data('depend-global') ? true : false,
	              ruleset     = ( is_global ) ? global_ruleset : normal_ruleset;
	
	          $.each(controllers, function( index, depend_id ) {
	
	            var value     = values[index] || '',
	                condition = conditions[index] || conditions[0];
	
	            ruleset = ruleset.createRule('[data-depend-id="'+ depend_id +'"]', condition, value);
	
	            ruleset.include($field);
	
	            if ( is_global ) {
	              global_depends.push(depend_id);
	            } else {
	              normal_depends.push(depend_id);
	            }
	
	          });

	return { rules: rules, global: global_depends.length > 0 };
}

var Rule = {
    evalCondition: function(context, control, condition, val1, val2) {

      if( condition == '==' ) {

        return this.checkBoolean(val1) == this.checkBoolean(val2);

      } else if( condition == '!=' ) {

        return this.checkBoolean(val1) != this.checkBoolean(val2);

      } else if( condition == '>=' ) {

        return Number(val2) >= Number(val1);

      } else if( condition == '<=' ) {

        return Number(val2) <= Number(val1);

      } else if( condition == '>' ) {

        return Number(val2) > Number(val1);

      } else if( condition == '<' ) {

        return Number(val2) < Number(val1);

      } else if( condition == '()' ) {

        return window[val1](context, control, val2);

      } else if( condition == 'any' ) {

        if( $.isArray( val2 ) ) {
          for (var i = val2.length - 1; i >= 0; i--) {
            if( $.inArray( val2[i], val1.split(',') ) !== -1 ) {
              return true;
            }
          }
        } else {
          if( $.inArray( val2, val1.split(',') ) !== -1 ) {
            return true;
          }
        }

      } else if( condition == 'not-any' ) {

        if( $.isArray( val2 ) ) {
          for (var i = val2.length - 1; i >= 0; i--) {
            if( $.inArray( val2[i], val1.split(',') ) == -1 ) {
              return true;
            }
          }
        } else {
          if( $.inArray( val2, val1.split(',') ) == -1 ) {
            return true;
          }
        }

      }

      return false;

    },

    checkBoolean: function(value) {

      switch( value ) {

        case true:
        case 'true':
        case 1:
        case '1':
          value = true;
        break;

        case null:
        case false:
        case 'false':
        case 0:
        case '0':
          value = false;
        break;

      }

      return value;
    },
};

module.exports = { readRules: readRules, Rule: Rule };
