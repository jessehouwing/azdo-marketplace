#!/usr/bin/env node
'use strict';

var require$$1 = require('path');
var require$$2 = require('fs');
var require$$0 = require('util');
var require$$0$1 = require('os');

var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

function getDefaultExportFromCjs (x) {
	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

var tfxCli$1 = {};

var app = {};

var command = {};

var common = {};

var hasRequiredCommon;

function requireCommon () {
	if (hasRequiredCommon) return common;
	hasRequiredCommon = 1;
	Object.defineProperty(common, "__esModule", { value: true });
	common.repeatStr = common.newGuid = common.endsWith = common.EXEC_PATH = common.NO_PROMPT = common.APP_ROOT = void 0;
	function endsWith(str, end) {
	    return str.slice(-end.length) == end;
	}
	common.endsWith = endsWith;
	/**
	 * Generate a new rfc4122 version 4 compliant GUID.
	 */
	function newGuid() {
	    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
	        var r = (Math.random() * 16) | 0, v = c == "x" ? r : (r & 0x3) | 0x8;
	        return v.toString(16);
	    });
	}
	common.newGuid = newGuid;
	/**
	 * Repeat a string <count> times.
	 */
	function repeatStr(str, count) {
	    let result = [];
	    for (let i = 0; i < count; ++i) {
	        result.push(str);
	    }
	    return result.join("");
	}
	common.repeatStr = repeatStr;
	
	return common;
}

var hasRequiredCommand;

function requireCommand () {
	if (hasRequiredCommand) return command;
	hasRequiredCommand = 1;
	Object.defineProperty(command, "__esModule", { value: true });
	command.getCommand = void 0;
	const common = requireCommon();
	const path = require$$1;
	const fs_1 = require$$2;
	const util_1 = require$$0;
	function getCommand() {
	    let args = process.argv.slice(2);
	    return getCommandHierarchy(path.resolve(common.APP_ROOT, "exec")).then(hierarchy => {
	        let execPath = [];
	        let commandArgs = [];
	        let currentHierarchy = hierarchy;
	        let inArgs = false;
	        args.forEach(arg => {
	            if (arg.substr(0, 1) === "-" || inArgs) {
	                commandArgs.push(arg);
	                inArgs = true;
	            }
	            else if (currentHierarchy && currentHierarchy[arg] !== undefined) {
	                currentHierarchy = currentHierarchy[arg];
	                execPath.push(arg);
	            }
	            else {
	                throw "Command '" + arg + "' not found. For help, type tfx " + execPath.join(" ") + " --help";
	            }
	        });
	        return {
	            execPath: execPath,
	            args: commandArgs,
	            commandHierarchy: hierarchy,
	        };
	    });
	}
	command.getCommand = getCommand;
	function getCommandHierarchy(root) {
	    let hierarchy = {};
	    return (0, util_1.promisify)(fs_1.readdir)(root).then(files => {
	        let filePromises = [];
	        files.forEach(file => {
	            if (file.startsWith("_") || file.endsWith(".map")) {
	                return;
	            }
	            let fullPath = path.resolve(root, file);
	            let parsedPath = path.parse(fullPath);
	            let promise = (0, util_1.promisify)(fs_1.lstat)(fullPath).then(stats => {
	                if (stats.isDirectory()) {
	                    return getCommandHierarchy(fullPath).then(subHierarchy => {
	                        hierarchy[parsedPath.name] = subHierarchy;
	                    });
	                }
	                else {
	                    hierarchy[parsedPath.name] = null;
	                    return null;
	                }
	            });
	            filePromises.push(promise);
	        });
	        return Promise.all(filePromises).then(() => {
	            return hierarchy;
	        });
	    });
	}
	
	return command;
}

var errorhandler = {};

var trace = {};

var lib = {exports: {}};

var colors = {exports: {}};

var styles = {exports: {}};

/*
The MIT License (MIT)

Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (sindresorhus.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/

var hasRequiredStyles;

function requireStyles () {
	if (hasRequiredStyles) return styles.exports;
	hasRequiredStyles = 1;
	(function (module) {
		var styles = {};
		module['exports'] = styles;

		var codes = {
		  reset: [0, 0],

		  bold: [1, 22],
		  dim: [2, 22],
		  italic: [3, 23],
		  underline: [4, 24],
		  inverse: [7, 27],
		  hidden: [8, 28],
		  strikethrough: [9, 29],

		  black: [30, 39],
		  red: [31, 39],
		  green: [32, 39],
		  yellow: [33, 39],
		  blue: [34, 39],
		  magenta: [35, 39],
		  cyan: [36, 39],
		  white: [37, 39],
		  gray: [90, 39],
		  grey: [90, 39],

		  bgBlack: [40, 49],
		  bgRed: [41, 49],
		  bgGreen: [42, 49],
		  bgYellow: [43, 49],
		  bgBlue: [44, 49],
		  bgMagenta: [45, 49],
		  bgCyan: [46, 49],
		  bgWhite: [47, 49],

		  // legacy styles for colors pre v1.0.0
		  blackBG: [40, 49],
		  redBG: [41, 49],
		  greenBG: [42, 49],
		  yellowBG: [43, 49],
		  blueBG: [44, 49],
		  magentaBG: [45, 49],
		  cyanBG: [46, 49],
		  whiteBG: [47, 49],

		};

		Object.keys(codes).forEach(function(key) {
		  var val = codes[key];
		  var style = styles[key] = [];
		  style.open = '\u001b[' + val[0] + 'm';
		  style.close = '\u001b[' + val[1] + 'm';
		}); 
	} (styles));
	return styles.exports;
}

/*
MIT License

Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (sindresorhus.com)

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
of the Software, and to permit persons to whom the Software is furnished to do
so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

var hasFlag;
var hasRequiredHasFlag;

function requireHasFlag () {
	if (hasRequiredHasFlag) return hasFlag;
	hasRequiredHasFlag = 1;

	hasFlag = function(flag, argv) {
	  argv = argv || process.argv;

	  var terminatorPos = argv.indexOf('--');
	  var prefix = /^-{1,2}/.test(flag) ? '' : '--';
	  var pos = argv.indexOf(prefix + flag);

	  return pos !== -1 && (terminatorPos === -1 ? true : pos < terminatorPos);
	};
	return hasFlag;
}

/*
The MIT License (MIT)

Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (sindresorhus.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/

var supportsColors;
var hasRequiredSupportsColors;

function requireSupportsColors () {
	if (hasRequiredSupportsColors) return supportsColors;
	hasRequiredSupportsColors = 1;

	var os = require$$0$1;
	var hasFlag = requireHasFlag();

	var env = process.env;

	var forceColor = void 0;
	if (hasFlag('no-color') || hasFlag('no-colors') || hasFlag('color=false')) {
	  forceColor = false;
	} else if (hasFlag('color') || hasFlag('colors') || hasFlag('color=true')
	           || hasFlag('color=always')) {
	  forceColor = true;
	}
	if ('FORCE_COLOR' in env) {
	  forceColor = env.FORCE_COLOR.length === 0
	    || parseInt(env.FORCE_COLOR, 10) !== 0;
	}

	function translateLevel(level) {
	  if (level === 0) {
	    return false;
	  }

	  return {
	    level: level,
	    hasBasic: true,
	    has256: level >= 2,
	    has16m: level >= 3,
	  };
	}

	function supportsColor(stream) {
	  if (forceColor === false) {
	    return 0;
	  }

	  if (hasFlag('color=16m') || hasFlag('color=full')
	      || hasFlag('color=truecolor')) {
	    return 3;
	  }

	  if (hasFlag('color=256')) {
	    return 2;
	  }

	  if (stream && !stream.isTTY && forceColor !== true) {
	    return 0;
	  }

	  var min = forceColor ? 1 : 0;

	  if (process.platform === 'win32') {
	    // Node.js 7.5.0 is the first version of Node.js to include a patch to
	    // libuv that enables 256 color output on Windows. Anything earlier and it
	    // won't work. However, here we target Node.js 8 at minimum as it is an LTS
	    // release, and Node.js 7 is not. Windows 10 build 10586 is the first
	    // Windows release that supports 256 colors. Windows 10 build 14931 is the
	    // first release that supports 16m/TrueColor.
	    var osRelease = os.release().split('.');
	    if (Number(process.versions.node.split('.')[0]) >= 8
	        && Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) {
	      return Number(osRelease[2]) >= 14931 ? 3 : 2;
	    }

	    return 1;
	  }

	  if ('CI' in env) {
	    if (['TRAVIS', 'CIRCLECI', 'APPVEYOR', 'GITLAB_CI'].some(function(sign) {
	      return sign in env;
	    }) || env.CI_NAME === 'codeship') {
	      return 1;
	    }

	    return min;
	  }

	  if ('TEAMCITY_VERSION' in env) {
	    return (/^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0
	    );
	  }

	  if ('TERM_PROGRAM' in env) {
	    var version = parseInt((env.TERM_PROGRAM_VERSION || '').split('.')[0], 10);

	    switch (env.TERM_PROGRAM) {
	      case 'iTerm.app':
	        return version >= 3 ? 3 : 2;
	      case 'Hyper':
	        return 3;
	      case 'Apple_Terminal':
	        return 2;
	      // No default
	    }
	  }

	  if (/-256(color)?$/i.test(env.TERM)) {
	    return 2;
	  }

	  if (/^screen|^xterm|^vt100|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
	    return 1;
	  }

	  if ('COLORTERM' in env) {
	    return 1;
	  }

	  if (env.TERM === 'dumb') {
	    return min;
	  }

	  return min;
	}

	function getSupportLevel(stream) {
	  var level = supportsColor(stream);
	  return translateLevel(level);
	}

	supportsColors = {
	  supportsColor: getSupportLevel,
	  stdout: getSupportLevel(process.stdout),
	  stderr: getSupportLevel(process.stderr),
	};
	return supportsColors;
}

var trap = {exports: {}};

var hasRequiredTrap;

function requireTrap () {
	if (hasRequiredTrap) return trap.exports;
	hasRequiredTrap = 1;
	(function (module) {
		module['exports'] = function runTheTrap(text, options) {
		  var result = '';
		  text = text || 'Run the trap, drop the bass';
		  text = text.split('');
		  var trap = {
		    a: ['\u0040', '\u0104', '\u023a', '\u0245', '\u0394', '\u039b', '\u0414'],
		    b: ['\u00df', '\u0181', '\u0243', '\u026e', '\u03b2', '\u0e3f'],
		    c: ['\u00a9', '\u023b', '\u03fe'],
		    d: ['\u00d0', '\u018a', '\u0500', '\u0501', '\u0502', '\u0503'],
		    e: ['\u00cb', '\u0115', '\u018e', '\u0258', '\u03a3', '\u03be', '\u04bc',
		      '\u0a6c'],
		    f: ['\u04fa'],
		    g: ['\u0262'],
		    h: ['\u0126', '\u0195', '\u04a2', '\u04ba', '\u04c7', '\u050a'],
		    i: ['\u0f0f'],
		    j: ['\u0134'],
		    k: ['\u0138', '\u04a0', '\u04c3', '\u051e'],
		    l: ['\u0139'],
		    m: ['\u028d', '\u04cd', '\u04ce', '\u0520', '\u0521', '\u0d69'],
		    n: ['\u00d1', '\u014b', '\u019d', '\u0376', '\u03a0', '\u048a'],
		    o: ['\u00d8', '\u00f5', '\u00f8', '\u01fe', '\u0298', '\u047a', '\u05dd',
		      '\u06dd', '\u0e4f'],
		    p: ['\u01f7', '\u048e'],
		    q: ['\u09cd'],
		    r: ['\u00ae', '\u01a6', '\u0210', '\u024c', '\u0280', '\u042f'],
		    s: ['\u00a7', '\u03de', '\u03df', '\u03e8'],
		    t: ['\u0141', '\u0166', '\u0373'],
		    u: ['\u01b1', '\u054d'],
		    v: ['\u05d8'],
		    w: ['\u0428', '\u0460', '\u047c', '\u0d70'],
		    x: ['\u04b2', '\u04fe', '\u04fc', '\u04fd'],
		    y: ['\u00a5', '\u04b0', '\u04cb'],
		    z: ['\u01b5', '\u0240'],
		  };
		  text.forEach(function(c) {
		    c = c.toLowerCase();
		    var chars = trap[c] || [' '];
		    var rand = Math.floor(Math.random() * chars.length);
		    if (typeof trap[c] !== 'undefined') {
		      result += trap[c][rand];
		    } else {
		      result += c;
		    }
		  });
		  return result;
		}; 
	} (trap));
	return trap.exports;
}

var zalgo = {exports: {}};

var hasRequiredZalgo;

function requireZalgo () {
	if (hasRequiredZalgo) return zalgo.exports;
	hasRequiredZalgo = 1;
	(function (module) {
		// please no
		module['exports'] = function zalgo(text, options) {
		  text = text || '   he is here   ';
		  var soul = {
		    'up': [
		      '̍', '̎', '̄', '̅',
		      '̿', '̑', '̆', '̐',
		      '͒', '͗', '͑', '̇',
		      '̈', '̊', '͂', '̓',
		      '̈', '͊', '͋', '͌',
		      '̃', '̂', '̌', '͐',
		      '̀', '́', '̋', '̏',
		      '̒', '̓', '̔', '̽',
		      '̉', 'ͣ', 'ͤ', 'ͥ',
		      'ͦ', 'ͧ', 'ͨ', 'ͩ',
		      'ͪ', 'ͫ', 'ͬ', 'ͭ',
		      'ͮ', 'ͯ', '̾', '͛',
		      '͆', '̚',
		    ],
		    'down': [
		      '̖', '̗', '̘', '̙',
		      '̜', '̝', '̞', '̟',
		      '̠', '̤', '̥', '̦',
		      '̩', '̪', '̫', '̬',
		      '̭', '̮', '̯', '̰',
		      '̱', '̲', '̳', '̹',
		      '̺', '̻', '̼', 'ͅ',
		      '͇', '͈', '͉', '͍',
		      '͎', '͓', '͔', '͕',
		      '͖', '͙', '͚', '̣',
		    ],
		    'mid': [
		      '̕', '̛', '̀', '́',
		      '͘', '̡', '̢', '̧',
		      '̨', '̴', '̵', '̶',
		      '͜', '͝', '͞',
		      '͟', '͠', '͢', '̸',
		      '̷', '͡', ' ҉',
		    ],
		  };
		  var all = [].concat(soul.up, soul.down, soul.mid);

		  function randomNumber(range) {
		    var r = Math.floor(Math.random() * range);
		    return r;
		  }

		  function isChar(character) {
		    var bool = false;
		    all.filter(function(i) {
		      bool = (i === character);
		    });
		    return bool;
		  }


		  function heComes(text, options) {
		    var result = '';
		    var counts;
		    var l;
		    options = options || {};
		    options['up'] =
		      typeof options['up'] !== 'undefined' ? options['up'] : true;
		    options['mid'] =
		      typeof options['mid'] !== 'undefined' ? options['mid'] : true;
		    options['down'] =
		      typeof options['down'] !== 'undefined' ? options['down'] : true;
		    options['size'] =
		      typeof options['size'] !== 'undefined' ? options['size'] : 'maxi';
		    text = text.split('');
		    for (l in text) {
		      if (isChar(l)) {
		        continue;
		      }
		      result = result + text[l];
		      counts = {'up': 0, 'down': 0, 'mid': 0};
		      switch (options.size) {
		        case 'mini':
		          counts.up = randomNumber(8);
		          counts.mid = randomNumber(2);
		          counts.down = randomNumber(8);
		          break;
		        case 'maxi':
		          counts.up = randomNumber(16) + 3;
		          counts.mid = randomNumber(4) + 1;
		          counts.down = randomNumber(64) + 3;
		          break;
		        default:
		          counts.up = randomNumber(8) + 1;
		          counts.mid = randomNumber(6) / 2;
		          counts.down = randomNumber(8) + 1;
		          break;
		      }

		      var arr = ['up', 'mid', 'down'];
		      for (var d in arr) {
		        var index = arr[d];
		        for (var i = 0; i <= counts[index]; i++) {
		          if (options[index]) {
		            result = result + soul[index][randomNumber(soul[index].length)];
		          }
		        }
		      }
		    }
		    return result;
		  }
		  // don't summon him
		  return heComes(text, options);
		}; 
	} (zalgo));
	return zalgo.exports;
}

var america = {exports: {}};

var hasRequiredAmerica;

function requireAmerica () {
	if (hasRequiredAmerica) return america.exports;
	hasRequiredAmerica = 1;
	(function (module) {
		module['exports'] = function(colors) {
		  return function(letter, i, exploded) {
		    if (letter === ' ') return letter;
		    switch (i%3) {
		      case 0: return colors.red(letter);
		      case 1: return colors.white(letter);
		      case 2: return colors.blue(letter);
		    }
		  };
		}; 
	} (america));
	return america.exports;
}

var zebra = {exports: {}};

var hasRequiredZebra;

function requireZebra () {
	if (hasRequiredZebra) return zebra.exports;
	hasRequiredZebra = 1;
	(function (module) {
		module['exports'] = function(colors) {
		  return function(letter, i, exploded) {
		    return i % 2 === 0 ? letter : colors.inverse(letter);
		  };
		}; 
	} (zebra));
	return zebra.exports;
}

var rainbow = {exports: {}};

var hasRequiredRainbow;

function requireRainbow () {
	if (hasRequiredRainbow) return rainbow.exports;
	hasRequiredRainbow = 1;
	(function (module) {
		module['exports'] = function(colors) {
		  // RoY G BiV
		  var rainbowColors = ['red', 'yellow', 'green', 'blue', 'magenta'];
		  return function(letter, i, exploded) {
		    if (letter === ' ') {
		      return letter;
		    } else {
		      return colors[rainbowColors[i++ % rainbowColors.length]](letter);
		    }
		  };
		}; 
	} (rainbow));
	return rainbow.exports;
}

var random = {exports: {}};

var hasRequiredRandom;

function requireRandom () {
	if (hasRequiredRandom) return random.exports;
	hasRequiredRandom = 1;
	(function (module) {
		module['exports'] = function(colors) {
		  var available = ['underline', 'inverse', 'grey', 'yellow', 'red', 'green',
		    'blue', 'white', 'cyan', 'magenta'];
		  return function(letter, i, exploded) {
		    return letter === ' ' ? letter :
		      colors[
		          available[Math.round(Math.random() * (available.length - 2))]
		      ](letter);
		  };
		}; 
	} (random));
	return random.exports;
}

/*

The MIT License (MIT)

Original Library
  - Copyright (c) Marak Squires

Additional functionality
 - Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (sindresorhus.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

*/

var hasRequiredColors;

function requireColors () {
	if (hasRequiredColors) return colors.exports;
	hasRequiredColors = 1;
	(function (module) {
		var colors = {};
		module['exports'] = colors;

		colors.themes = {};

		var util = require$$0;
		var ansiStyles = colors.styles = requireStyles();
		var defineProps = Object.defineProperties;
		var newLineRegex = new RegExp(/[\r\n]+/g);

		colors.supportsColor = requireSupportsColors().supportsColor;

		if (typeof colors.enabled === 'undefined') {
		  colors.enabled = colors.supportsColor() !== false;
		}

		colors.enable = function() {
		  colors.enabled = true;
		};

		colors.disable = function() {
		  colors.enabled = false;
		};

		colors.stripColors = colors.strip = function(str) {
		  return ('' + str).replace(/\x1B\[\d+m/g, '');
		};

		// eslint-disable-next-line no-unused-vars
		colors.stylize = function stylize(str, style) {
		  if (!colors.enabled) {
		    return str+'';
		  }

		  return ansiStyles[style].open + str + ansiStyles[style].close;
		};

		var matchOperatorsRe = /[|\\{}()[\]^$+*?.]/g;
		var escapeStringRegexp = function(str) {
		  if (typeof str !== 'string') {
		    throw new TypeError('Expected a string');
		  }
		  return str.replace(matchOperatorsRe, '\\$&');
		};

		function build(_styles) {
		  var builder = function builder() {
		    return applyStyle.apply(builder, arguments);
		  };
		  builder._styles = _styles;
		  // __proto__ is used because we must return a function, but there is
		  // no way to create a function with a different prototype.
		  builder.__proto__ = proto;
		  return builder;
		}

		var styles = (function() {
		  var ret = {};
		  ansiStyles.grey = ansiStyles.gray;
		  Object.keys(ansiStyles).forEach(function(key) {
		    ansiStyles[key].closeRe =
		      new RegExp(escapeStringRegexp(ansiStyles[key].close), 'g');
		    ret[key] = {
		      get: function() {
		        return build(this._styles.concat(key));
		      },
		    };
		  });
		  return ret;
		})();

		var proto = defineProps(function colors() {}, styles);

		function applyStyle() {
		  var args = Array.prototype.slice.call(arguments);

		  var str = args.map(function(arg) {
		    if (arg !== undefined && arg.constructor === String) {
		      return arg;
		    } else {
		      return util.inspect(arg);
		    }
		  }).join(' ');

		  if (!colors.enabled || !str) {
		    return str;
		  }

		  var newLinesPresent = str.indexOf('\n') != -1;

		  var nestedStyles = this._styles;

		  var i = nestedStyles.length;
		  while (i--) {
		    var code = ansiStyles[nestedStyles[i]];
		    str = code.open + str.replace(code.closeRe, code.open) + code.close;
		    if (newLinesPresent) {
		      str = str.replace(newLineRegex, function(match) {
		        return code.close + match + code.open;
		      });
		    }
		  }

		  return str;
		}

		colors.setTheme = function(theme) {
		  if (typeof theme === 'string') {
		    console.log('colors.setTheme now only accepts an object, not a string.  ' +
		      'If you are trying to set a theme from a file, it is now your (the ' +
		      'caller\'s) responsibility to require the file.  The old syntax ' +
		      'looked like colors.setTheme(__dirname + ' +
		      '\'/../themes/generic-logging.js\'); The new syntax looks like '+
		      'colors.setTheme(require(__dirname + ' +
		      '\'/../themes/generic-logging.js\'));');
		    return;
		  }
		  for (var style in theme) {
		    (function(style) {
		      colors[style] = function(str) {
		        if (typeof theme[style] === 'object') {
		          var out = str;
		          for (var i in theme[style]) {
		            out = colors[theme[style][i]](out);
		          }
		          return out;
		        }
		        return colors[theme[style]](str);
		      };
		    })(style);
		  }
		};

		function init() {
		  var ret = {};
		  Object.keys(styles).forEach(function(name) {
		    ret[name] = {
		      get: function() {
		        return build([name]);
		      },
		    };
		  });
		  return ret;
		}

		var sequencer = function sequencer(map, str) {
		  var exploded = str.split('');
		  exploded = exploded.map(map);
		  return exploded.join('');
		};

		// custom formatter methods
		colors.trap = requireTrap();
		colors.zalgo = requireZalgo();

		// maps
		colors.maps = {};
		colors.maps.america = requireAmerica()(colors);
		colors.maps.zebra = requireZebra()(colors);
		colors.maps.rainbow = requireRainbow()(colors);
		colors.maps.random = requireRandom()(colors);

		for (var map in colors.maps) {
		  (function(map) {
		    colors[map] = function(str) {
		      return sequencer(colors.maps[map], str);
		    };
		  })(map);
		}

		defineProps(colors, init()); 
	} (colors));
	return colors.exports;
}

var extendStringPrototype = {exports: {}};

var hasRequiredExtendStringPrototype;

function requireExtendStringPrototype () {
	if (hasRequiredExtendStringPrototype) return extendStringPrototype.exports;
	hasRequiredExtendStringPrototype = 1;
	(function (module) {
		var colors = requireColors();

		module['exports'] = function() {
		  //
		  // Extends prototype of native string object to allow for "foo".red syntax
		  //
		  var addProperty = function(color, func) {
		    String.prototype.__defineGetter__(color, func);
		  };

		  addProperty('strip', function() {
		    return colors.strip(this);
		  });

		  addProperty('stripColors', function() {
		    return colors.strip(this);
		  });

		  addProperty('trap', function() {
		    return colors.trap(this);
		  });

		  addProperty('zalgo', function() {
		    return colors.zalgo(this);
		  });

		  addProperty('zebra', function() {
		    return colors.zebra(this);
		  });

		  addProperty('rainbow', function() {
		    return colors.rainbow(this);
		  });

		  addProperty('random', function() {
		    return colors.random(this);
		  });

		  addProperty('america', function() {
		    return colors.america(this);
		  });

		  //
		  // Iterate through all default styles and colors
		  //
		  var x = Object.keys(colors.styles);
		  x.forEach(function(style) {
		    addProperty(style, function() {
		      return colors.stylize(this, style);
		    });
		  });

		  function applyTheme(theme) {
		    //
		    // Remark: This is a list of methods that exist
		    // on String that you should not overwrite.
		    //
		    var stringPrototypeBlacklist = [
		      '__defineGetter__', '__defineSetter__', '__lookupGetter__',
		      '__lookupSetter__', 'charAt', 'constructor', 'hasOwnProperty',
		      'isPrototypeOf', 'propertyIsEnumerable', 'toLocaleString', 'toString',
		      'valueOf', 'charCodeAt', 'indexOf', 'lastIndexOf', 'length',
		      'localeCompare', 'match', 'repeat', 'replace', 'search', 'slice',
		      'split', 'substring', 'toLocaleLowerCase', 'toLocaleUpperCase',
		      'toLowerCase', 'toUpperCase', 'trim', 'trimLeft', 'trimRight',
		    ];

		    Object.keys(theme).forEach(function(prop) {
		      if (stringPrototypeBlacklist.indexOf(prop) !== -1) {
		        console.log('warn: '.red + ('String.prototype' + prop).magenta +
		          ' is probably something you don\'t want to override.  ' +
		          'Ignoring style name');
		      } else {
		        if (typeof(theme[prop]) === 'string') {
		          colors[prop] = colors[theme[prop]];
		          addProperty(prop, function() {
		            return colors[prop](this);
		          });
		        } else {
		          var themePropApplicator = function(str) {
		            var ret = str || this;
		            for (var t = 0; t < theme[prop].length; t++) {
		              ret = colors[theme[prop][t]](ret);
		            }
		            return ret;
		          };
		          addProperty(prop, themePropApplicator);
		          colors[prop] = function(str) {
		            return themePropApplicator(str);
		          };
		        }
		      }
		    });
		  }

		  colors.setTheme = function(theme) {
		    if (typeof theme === 'string') {
		      console.log('colors.setTheme now only accepts an object, not a string. ' +
		        'If you are trying to set a theme from a file, it is now your (the ' +
		        'caller\'s) responsibility to require the file.  The old syntax ' +
		        'looked like colors.setTheme(__dirname + ' +
		        '\'/../themes/generic-logging.js\'); The new syntax looks like '+
		        'colors.setTheme(require(__dirname + ' +
		        '\'/../themes/generic-logging.js\'));');
		      return;
		    } else {
		      applyTheme(theme);
		    }
		  };
		}; 
	} (extendStringPrototype));
	return extendStringPrototype.exports;
}

var hasRequiredLib;

function requireLib () {
	if (hasRequiredLib) return lib.exports;
	hasRequiredLib = 1;
	(function (module) {
		var colors = requireColors();
		module['exports'] = colors;

		// Remark: By default, colors will add style properties to String.prototype.
		//
		// If you don't wish to extend String.prototype, you can do this instead and
		// native String will not be touched:
		//
		//   var colors = require('colors/safe);
		//   colors.red("foo")
		//
		//
		requireExtendStringPrototype()(); 
	} (lib));
	return lib.exports;
}

var hasRequiredTrace;

function requireTrace () {
	if (hasRequiredTrace) return trace;
	hasRequiredTrace = 1;
	(function (exports$1) {
		Object.defineProperty(exports$1, "__esModule", { value: true });
		exports$1.format = exports$1.debug = exports$1.debugArea = exports$1.warn = exports$1.info = exports$1.success = exports$1.error = exports$1.println = exports$1.debugLogStream = exports$1.traceLevel = void 0;
		const colors = requireLib();
		const os = require$$0$1;
		function isTraceEnabled(envVar) {
		    if (!envVar)
		        return false;
		    const val = envVar.trim().toLowerCase();
		    return val === '1' || val === 'true';
		}
		let debugTracingEnvVar = process.env["TFX_TRACE"];
		exports$1.traceLevel = isTraceEnabled(debugTracingEnvVar) ? 2 /* TraceLevel.Debug */ : 1 /* TraceLevel.Info */;
		exports$1.debugLogStream = console.log;
		function println() {
		    info("");
		}
		exports$1.println = println;
		function error(msg, ...replacements) {
		    log("error: ", msg, colors.bgRed, replacements, console.error);
		}
		exports$1.error = error;
		function success(msg, ...replacements) {
		    log("", msg, colors.green, replacements);
		}
		exports$1.success = success;
		function info(msg, ...replacements) {
		    if (exports$1.traceLevel >= 1 /* TraceLevel.Info */) {
		        log("", msg, colors.white, replacements);
		    }
		}
		exports$1.info = info;
		function warn(msg, ...replacements) {
		    log("warning: ", msg, colors.bgYellow.black, replacements);
		}
		exports$1.warn = warn;
		function debugArea(msg, area) {
		    debugTracingEnvVar = process.env["TFX_TRACE_" + area.toUpperCase()];
		    if (debugTracingEnvVar) {
		        log(colors.cyan(new Date().toISOString() + " : "), msg, colors.grey, [], exports$1.debugLogStream);
		    }
		    debugTracingEnvVar = process.env["TFX_TRACE"];
		}
		exports$1.debugArea = debugArea;
		function debug(msg, ...replacements) {
		    if (exports$1.traceLevel >= 2 /* TraceLevel.Debug */) {
		        log(colors.cyan(new Date().toISOString() + " : "), msg, colors.grey, replacements, exports$1.debugLogStream);
		    }
		}
		exports$1.debug = debug;
		function log(prefix, msg, color, replacements, method = console.log) {
		    var t = typeof msg;
		    if (t === "string") {
		        write(prefix, msg, color, replacements, method);
		    }
		    else if (msg instanceof Array) {
		        msg.forEach(function (line) {
		            if (typeof line === "string") {
		                write(prefix, line, color, replacements, method);
		            }
		        });
		    }
		    else if (t === "object") {
		        write(prefix, JSON.stringify(msg, null, 2), color, replacements, method);
		    }
		}
		function write(prefix, msg, color, replacements, method = console.log) {
		    let toLog = format(msg, ...replacements);
		    toLog = toLog
		        .split(/\n|\r\n/)
		        .map(line => prefix + line)
		        .join(os.EOL);
		    method(color(toLog));
		}
		function format(str, ...replacements) {
		    let lcRepl = str.replace(/%S/g, "%s");
		    let split = lcRepl.split("%s");
		    if (split.length - 1 !== replacements.length) {
		        throw new Error("The number of replacements (" +
		            replacements.length +
		            ") does not match the number of placeholders (" +
		            (split.length - 1) +
		            ")");
		    }
		    let resultArr = [];
		    split.forEach((piece, index) => {
		        resultArr.push(piece);
		        if (index < split.length - 1) {
		            resultArr.push(replacements[index]);
		        }
		    });
		    return resultArr.join("");
		}
		exports$1.format = format;
		
	} (trace));
	return trace;
}

var hasRequiredErrorhandler;

function requireErrorhandler () {
	if (hasRequiredErrorhandler) return errorhandler;
	hasRequiredErrorhandler = 1;
	Object.defineProperty(errorhandler, "__esModule", { value: true });
	errorhandler.errLog = errorhandler.httpErr = void 0;
	const trace = requireTrace();
	/**
	 * Formats any error type into a readable string message.
	 * Handles AggregateError, Error, strings, objects, and other types.
	 */
	function formatError(err) {
	    // Handle AggregateError (from Promise.all/Promise.any failures)
	    if (err && err.name === "AggregateError" && Array.isArray(err.errors)) {
	        const messages = err.errors.map((e, index) => `  [${index + 1}] ${formatError(e)}`);
	        return `Multiple errors occurred:\n${messages.join("\n")}`;
	    }
	    // Handle plain strings
	    if (typeof err === "string") {
	        return err;
	    }
	    // Handle Error instances - use toString() to preserve "Error: message" format
	    if (err instanceof Error) {
	        return err.toString();
	    }
	    // Handle objects with a custom toString method (not the default Object.prototype.toString)
	    if (err !== null && typeof err === "object" && typeof err.toString === "function" && err.toString !== Object.prototype.toString) {
	        const result = err.toString();
	        // Make sure it's not returning "[object Object]" (the default)
	        if (result !== "[object Object]") {
	            return result;
	        }
	    }
	    // Handle objects with a message property (error-like objects)
	    if (typeof (err === null || err === void 0 ? void 0 : err.message) === "string") {
	        return err.message;
	    }
	    // Handle plain objects - try JSON serialization
	    if (typeof err === "object" && err !== null) {
	        try {
	            return JSON.stringify(err, null, 2);
	        }
	        catch (e) {
	            return String(err);
	        }
	    }
	    // Fallback for any other type
	    return String(err);
	}
	function httpErr(obj) {
	    let errorAsObj = obj;
	    if (typeof errorAsObj === "string") {
	        try {
	            errorAsObj = JSON.parse(errorAsObj);
	        }
	        catch (parseError) {
	            throw errorAsObj;
	        }
	    }
	    let statusCode = errorAsObj.statusCode;
	    if (statusCode === 401) {
	        throw "Received response 401 (Not Authorized). Check that your personal access token is correct and hasn't expired.";
	    }
	    if (statusCode === 403) {
	        throw "Received response 403 (Forbidden). Check that you have access to this resource. Message from server: " +
	            errorAsObj.message;
	    }
	    let errorBodyObj = errorAsObj.body;
	    if (errorBodyObj) {
	        if (typeof errorBodyObj === "string") {
	            try {
	                errorBodyObj = JSON.parse(errorBodyObj);
	            }
	            catch (parseError) {
	                throw errorBodyObj;
	            }
	        }
	        if (errorBodyObj.message) {
	            let message = errorBodyObj.message;
	            if (message) {
	                throw message;
	            }
	            else {
	                throw errorBodyObj;
	            }
	        }
	    }
	    else {
	        throw errorAsObj.message || "Encountered an unknown failure issuing an HTTP request.";
	    }
	}
	errorhandler.httpErr = httpErr;
	function errLog(arg) {
	    trace.debug(arg === null || arg === void 0 ? void 0 : arg.stack);
	    trace.error(formatError(arg));
	    process.exit(-1);
	}
	errorhandler.errLog = errLog;
	
	return errorhandler;
}

var loader = {};

var fsUtils = {};

var hasRequiredFsUtils;

function requireFsUtils () {
	if (hasRequiredFsUtils) return fsUtils;
	hasRequiredFsUtils = 1;
	(function (exports$1) {
		Object.defineProperty(exports$1, "__esModule", { value: true });
		exports$1.canWriteTo = exports$1.fileAccess = exports$1.exists = exports$1.F_OK = exports$1.X_OK = exports$1.R_OK = exports$1.W_OK = void 0;
		const fs = require$$2;
		// This is an fs lib that uses Q instead of callbacks.
		exports$1.W_OK = fs.constants ? fs.constants.W_OK : fs.W_OK; // back-compat
		exports$1.R_OK = fs.constants ? fs.constants.R_OK : fs.R_OK; // back-compat
		exports$1.X_OK = fs.constants ? fs.constants.X_OK : fs.X_OK; // back-compat
		exports$1.F_OK = fs.constants ? fs.constants.F_OK : fs.F_OK; // back-compat
		function exists(path) {
		    return new Promise(resolve => {
		        fs.exists(path, fileExists => {
		            resolve(fileExists);
		        });
		    });
		}
		exports$1.exists = exists;
		/**
		 * Returns a promise resolved true or false if a file is accessible
		 * with the given mode (F_OK, R_OK, W_OK, X_OK)
		 */
		function fileAccess(path, mode = exports$1.F_OK) {
		    return new Promise(resolve => {
		        fs.access(path, mode, err => {
		            if (err) {
		                resolve(false);
		            }
		            else {
		                resolve(true);
		            }
		        });
		    });
		}
		exports$1.fileAccess = fileAccess;
		/**
		 * Given a valid path, resolves true if the file represented by the path
		 * can be written to. Files that do not exist are assumed writable.
		 */
		function canWriteTo(path) {
		    return exists(path).then(exists => {
		        if (exists) {
		            return fileAccess(path, exports$1.W_OK);
		        }
		        else {
		            return true;
		        }
		    });
		}
		exports$1.canWriteTo = canWriteTo;
		
	} (fsUtils));
	return fsUtils;
}

var hasRequiredLoader;

function requireLoader () {
	if (hasRequiredLoader) return loader;
	hasRequiredLoader = 1;
	Object.defineProperty(loader, "__esModule", { value: true });
	loader.load = void 0;
	const common = requireCommon();
	const fsUtils = requireFsUtils();
	const path = require$$1;
	const trace = requireTrace();
	const util_1 = require$$0;
	const fs_1 = require$$2;
	/**
	 * Load the module given by execPath and instantiate a TfCommand using args.
	 * @param {string[]} execPath: path to the module to load. This module must implement CommandFactory.
	 * @param {string[]} args: args to pass to the command factory to instantiate the TfCommand
	 * @return {Promise<TfCommand>} Promise that is resolved with the module's command
	 */
	function load(execPath, args) {
	    trace.debug("loader.load");
	    let commandModulePath = path.resolve(common.APP_ROOT, "exec", execPath.join("/"));
	    return fsUtils.exists(commandModulePath).then(exists => {
	        let resolveDefaultPromise = Promise.resolve(commandModulePath);
	        if (exists) {
	            // If this extensionless path exists, it should be a directory.
	            // If the path doesn't exist, for now we assume that a file with a .js extension
	            // exists (if it doens't, we will find out below).
	            resolveDefaultPromise = (0, util_1.promisify)(fs_1.lstat)(commandModulePath).then(stats => {
	                if (stats.isDirectory()) {
	                    return path.join(commandModulePath, "default");
	                }
	                return commandModulePath;
	            });
	        }
	        return resolveDefaultPromise.then((commandModulePath) => {
	            let commandModule;
	            return fsUtils.exists(path.resolve(commandModulePath + ".js")).then(exists => {
	                if (!exists) {
	                    throw new Error(commandModulePath + " is not a recognized command. Run with --help to see available commands.");
	                }
	                try {
	                    commandModule = require(commandModulePath);
	                }
	                catch (e) {
	                    trace.error(commandModulePath + " could not be fully loaded as a tfx command.");
	                    throw e;
	                }
	                if (!commandModule.getCommand) {
	                    throw new Error("Command modules must export a function, getCommand, that takes no arguments and returns an instance of TfCommand");
	                }
	                return commandModule.getCommand(args);
	            });
	        });
	    });
	}
	loader.load = load;
	
	return loader;
}

var implementation$5 = {exports: {}};

var isCallable;
var hasRequiredIsCallable$1;

function requireIsCallable$1 () {
	if (hasRequiredIsCallable$1) return isCallable;
	hasRequiredIsCallable$1 = 1;

	var fnToStr = Function.prototype.toString;
	var reflectApply = typeof Reflect === 'object' && Reflect !== null && Reflect.apply;
	var badArrayLike;
	var isCallableMarker;
	if (typeof reflectApply === 'function' && typeof Object.defineProperty === 'function') {
		try {
			badArrayLike = Object.defineProperty({}, 'length', {
				get: function () {
					throw isCallableMarker;
				}
			});
			isCallableMarker = {};
			// eslint-disable-next-line no-throw-literal
			reflectApply(function () { throw 42; }, null, badArrayLike);
		} catch (_) {
			if (_ !== isCallableMarker) {
				reflectApply = null;
			}
		}
	} else {
		reflectApply = null;
	}

	var constructorRegex = /^\s*class\b/;
	var isES6ClassFn = function isES6ClassFunction(value) {
		try {
			var fnStr = fnToStr.call(value);
			return constructorRegex.test(fnStr);
		} catch (e) {
			return false; // not a function
		}
	};

	var tryFunctionObject = function tryFunctionToStr(value) {
		try {
			if (isES6ClassFn(value)) { return false; }
			fnToStr.call(value);
			return true;
		} catch (e) {
			return false;
		}
	};
	var toStr = Object.prototype.toString;
	var objectClass = '[object Object]';
	var fnClass = '[object Function]';
	var genClass = '[object GeneratorFunction]';
	var ddaClass = '[object HTMLAllCollection]'; // IE 11
	var ddaClass2 = '[object HTML document.all class]';
	var ddaClass3 = '[object HTMLCollection]'; // IE 9-10
	var hasToStringTag = typeof Symbol === 'function' && !!Symbol.toStringTag; // better: use `has-tostringtag`

	var isIE68 = !(0 in [,]); // eslint-disable-line no-sparse-arrays, comma-spacing

	var isDDA = function isDocumentDotAll() { return false; };
	if (typeof document === 'object') {
		// Firefox 3 canonicalizes DDA to undefined when it's not accessed directly
		var all = document.all;
		if (toStr.call(all) === toStr.call(document.all)) {
			isDDA = function isDocumentDotAll(value) {
				/* globals document: false */
				// in IE 6-8, typeof document.all is "object" and it's truthy
				if ((isIE68 || !value) && (typeof value === 'undefined' || typeof value === 'object')) {
					try {
						var str = toStr.call(value);
						return (
							str === ddaClass
							|| str === ddaClass2
							|| str === ddaClass3 // opera 12.16
							|| str === objectClass // IE 6-8
						) && value('') == null; // eslint-disable-line eqeqeq
					} catch (e) { /**/ }
				}
				return false;
			};
		}
	}

	isCallable = reflectApply
		? function isCallable(value) {
			if (isDDA(value)) { return true; }
			if (!value) { return false; }
			if (typeof value !== 'function' && typeof value !== 'object') { return false; }
			try {
				reflectApply(value, null, badArrayLike);
			} catch (e) {
				if (e !== isCallableMarker) { return false; }
			}
			return !isES6ClassFn(value) && tryFunctionObject(value);
		}
		: function isCallable(value) {
			if (isDDA(value)) { return true; }
			if (!value) { return false; }
			if (typeof value !== 'function' && typeof value !== 'object') { return false; }
			if (hasToStringTag) { return tryFunctionObject(value); }
			if (isES6ClassFn(value)) { return false; }
			var strClass = toStr.call(value);
			if (strClass !== fnClass && strClass !== genClass && !(/^\[object HTML/).test(strClass)) { return false; }
			return tryFunctionObject(value);
		};
	return isCallable;
}

var forEach_1;
var hasRequiredForEach;

function requireForEach () {
	if (hasRequiredForEach) return forEach_1;
	hasRequiredForEach = 1;

	var isCallable = requireIsCallable$1();

	var toStr = Object.prototype.toString;
	var hasOwnProperty = Object.prototype.hasOwnProperty;

	var forEachArray = function forEachArray(array, iterator, receiver) {
	    for (var i = 0, len = array.length; i < len; i++) {
	        if (hasOwnProperty.call(array, i)) {
	            if (receiver == null) {
	                iterator(array[i], i, array);
	            } else {
	                iterator.call(receiver, array[i], i, array);
	            }
	        }
	    }
	};

	var forEachString = function forEachString(string, iterator, receiver) {
	    for (var i = 0, len = string.length; i < len; i++) {
	        // no such thing as a sparse string.
	        if (receiver == null) {
	            iterator(string.charAt(i), i, string);
	        } else {
	            iterator.call(receiver, string.charAt(i), i, string);
	        }
	    }
	};

	var forEachObject = function forEachObject(object, iterator, receiver) {
	    for (var k in object) {
	        if (hasOwnProperty.call(object, k)) {
	            if (receiver == null) {
	                iterator(object[k], k, object);
	            } else {
	                iterator.call(receiver, object[k], k, object);
	            }
	        }
	    }
	};

	var forEach = function forEach(list, iterator, thisArg) {
	    if (!isCallable(iterator)) {
	        throw new TypeError('iterator must be a function');
	    }

	    var receiver;
	    if (arguments.length >= 3) {
	        receiver = thisArg;
	    }

	    if (toStr.call(list) === '[object Array]') {
	        forEachArray(list, iterator, receiver);
	    } else if (typeof list === 'string') {
	        forEachString(list, iterator, receiver);
	    } else {
	        forEachObject(list, iterator, receiver);
	    }
	};

	forEach_1 = forEach;
	return forEach_1;
}

var esObjectAtoms;
var hasRequiredEsObjectAtoms;

function requireEsObjectAtoms () {
	if (hasRequiredEsObjectAtoms) return esObjectAtoms;
	hasRequiredEsObjectAtoms = 1;

	/** @type {import('.')} */
	esObjectAtoms = Object;
	return esObjectAtoms;
}

var hasProto;
var hasRequiredHasProto;

function requireHasProto () {
	if (hasRequiredHasProto) return hasProto;
	hasRequiredHasProto = 1;

	var test = {
		__proto__: null,
		foo: {}
	};

	// @ts-expect-error: TS errors on an inherited property for some reason
	var result = { __proto__: test }.foo === test.foo
		&& !(test instanceof Object);

	/** @type {import('.')} */
	hasProto = function hasProto() {
		return result;
	};
	return hasProto;
}

var isArguments;
var hasRequiredIsArguments;

function requireIsArguments () {
	if (hasRequiredIsArguments) return isArguments;
	hasRequiredIsArguments = 1;

	var toStr = Object.prototype.toString;

	isArguments = function isArguments(value) {
		var str = toStr.call(value);
		var isArgs = str === '[object Arguments]';
		if (!isArgs) {
			isArgs = str !== '[object Array]' &&
				value !== null &&
				typeof value === 'object' &&
				typeof value.length === 'number' &&
				value.length >= 0 &&
				toStr.call(value.callee) === '[object Function]';
		}
		return isArgs;
	};
	return isArguments;
}

var implementation$4;
var hasRequiredImplementation$5;

function requireImplementation$5 () {
	if (hasRequiredImplementation$5) return implementation$4;
	hasRequiredImplementation$5 = 1;

	var keysShim;
	if (!Object.keys) {
		// modified from https://github.com/es-shims/es5-shim
		var has = Object.prototype.hasOwnProperty;
		var toStr = Object.prototype.toString;
		var isArgs = requireIsArguments(); // eslint-disable-line global-require
		var isEnumerable = Object.prototype.propertyIsEnumerable;
		var hasDontEnumBug = !isEnumerable.call({ toString: null }, 'toString');
		var hasProtoEnumBug = isEnumerable.call(function () {}, 'prototype');
		var dontEnums = [
			'toString',
			'toLocaleString',
			'valueOf',
			'hasOwnProperty',
			'isPrototypeOf',
			'propertyIsEnumerable',
			'constructor'
		];
		var equalsConstructorPrototype = function (o) {
			var ctor = o.constructor;
			return ctor && ctor.prototype === o;
		};
		var excludedKeys = {
			$applicationCache: true,
			$console: true,
			$external: true,
			$frame: true,
			$frameElement: true,
			$frames: true,
			$innerHeight: true,
			$innerWidth: true,
			$onmozfullscreenchange: true,
			$onmozfullscreenerror: true,
			$outerHeight: true,
			$outerWidth: true,
			$pageXOffset: true,
			$pageYOffset: true,
			$parent: true,
			$scrollLeft: true,
			$scrollTop: true,
			$scrollX: true,
			$scrollY: true,
			$self: true,
			$webkitIndexedDB: true,
			$webkitStorageInfo: true,
			$window: true
		};
		var hasAutomationEqualityBug = (function () {
			/* global window */
			if (typeof window === 'undefined') { return false; }
			for (var k in window) {
				try {
					if (!excludedKeys['$' + k] && has.call(window, k) && window[k] !== null && typeof window[k] === 'object') {
						try {
							equalsConstructorPrototype(window[k]);
						} catch (e) {
							return true;
						}
					}
				} catch (e) {
					return true;
				}
			}
			return false;
		}());
		var equalsConstructorPrototypeIfNotBuggy = function (o) {
			/* global window */
			if (typeof window === 'undefined' || !hasAutomationEqualityBug) {
				return equalsConstructorPrototype(o);
			}
			try {
				return equalsConstructorPrototype(o);
			} catch (e) {
				return false;
			}
		};

		keysShim = function keys(object) {
			var isObject = object !== null && typeof object === 'object';
			var isFunction = toStr.call(object) === '[object Function]';
			var isArguments = isArgs(object);
			var isString = isObject && toStr.call(object) === '[object String]';
			var theKeys = [];

			if (!isObject && !isFunction && !isArguments) {
				throw new TypeError('Object.keys called on a non-object');
			}

			var skipProto = hasProtoEnumBug && isFunction;
			if (isString && object.length > 0 && !has.call(object, 0)) {
				for (var i = 0; i < object.length; ++i) {
					theKeys.push(String(i));
				}
			}

			if (isArguments && object.length > 0) {
				for (var j = 0; j < object.length; ++j) {
					theKeys.push(String(j));
				}
			} else {
				for (var name in object) {
					if (!(skipProto && name === 'prototype') && has.call(object, name)) {
						theKeys.push(String(name));
					}
				}
			}

			if (hasDontEnumBug) {
				var skipConstructor = equalsConstructorPrototypeIfNotBuggy(object);

				for (var k = 0; k < dontEnums.length; ++k) {
					if (!(skipConstructor && dontEnums[k] === 'constructor') && has.call(object, dontEnums[k])) {
						theKeys.push(dontEnums[k]);
					}
				}
			}
			return theKeys;
		};
	}
	implementation$4 = keysShim;
	return implementation$4;
}

var objectKeys;
var hasRequiredObjectKeys;

function requireObjectKeys () {
	if (hasRequiredObjectKeys) return objectKeys;
	hasRequiredObjectKeys = 1;

	var slice = Array.prototype.slice;
	var isArgs = requireIsArguments();

	var origKeys = Object.keys;
	var keysShim = origKeys ? function keys(o) { return origKeys(o); } : requireImplementation$5();

	var originalKeys = Object.keys;

	keysShim.shim = function shimObjectKeys() {
		if (Object.keys) {
			var keysWorksWithArguments = (function () {
				// Safari 5.0 bug
				var args = Object.keys(arguments);
				return args && args.length === arguments.length;
			}(1, 2));
			if (!keysWorksWithArguments) {
				Object.keys = function keys(object) { // eslint-disable-line func-name-matching
					if (isArgs(object)) {
						return originalKeys(slice.call(object));
					}
					return originalKeys(object);
				};
			}
		} else {
			Object.keys = keysShim;
		}
		return Object.keys || keysShim;
	};

	objectKeys = keysShim;
	return objectKeys;
}

var esDefineProperty;
var hasRequiredEsDefineProperty;

function requireEsDefineProperty () {
	if (hasRequiredEsDefineProperty) return esDefineProperty;
	hasRequiredEsDefineProperty = 1;

	/** @type {import('.')} */
	var $defineProperty = Object.defineProperty || false;
	if ($defineProperty) {
		try {
			$defineProperty({}, 'a', { value: 1 });
		} catch (e) {
			// IE 8 has a broken defineProperty
			$defineProperty = false;
		}
	}

	esDefineProperty = $defineProperty;
	return esDefineProperty;
}

var syntax;
var hasRequiredSyntax;

function requireSyntax () {
	if (hasRequiredSyntax) return syntax;
	hasRequiredSyntax = 1;

	/** @type {import('./syntax')} */
	syntax = SyntaxError;
	return syntax;
}

var type;
var hasRequiredType$2;

function requireType$2 () {
	if (hasRequiredType$2) return type;
	hasRequiredType$2 = 1;

	/** @type {import('./type')} */
	type = TypeError;
	return type;
}

var gOPD;
var hasRequiredGOPD;

function requireGOPD () {
	if (hasRequiredGOPD) return gOPD;
	hasRequiredGOPD = 1;

	/** @type {import('./gOPD')} */
	gOPD = Object.getOwnPropertyDescriptor;
	return gOPD;
}

var gopd;
var hasRequiredGopd;

function requireGopd () {
	if (hasRequiredGopd) return gopd;
	hasRequiredGopd = 1;

	/** @type {import('.')} */
	var $gOPD = /*@__PURE__*/ requireGOPD();

	if ($gOPD) {
		try {
			$gOPD([], 'length');
		} catch (e) {
			// IE 8 has a broken gOPD
			$gOPD = null;
		}
	}

	gopd = $gOPD;
	return gopd;
}

var defineDataProperty;
var hasRequiredDefineDataProperty;

function requireDefineDataProperty () {
	if (hasRequiredDefineDataProperty) return defineDataProperty;
	hasRequiredDefineDataProperty = 1;

	var $defineProperty = /*@__PURE__*/ requireEsDefineProperty();

	var $SyntaxError = /*@__PURE__*/ requireSyntax();
	var $TypeError = /*@__PURE__*/ requireType$2();

	var gopd = /*@__PURE__*/ requireGopd();

	/** @type {import('.')} */
	defineDataProperty = function defineDataProperty(
		obj,
		property,
		value
	) {
		if (!obj || (typeof obj !== 'object' && typeof obj !== 'function')) {
			throw new $TypeError('`obj` must be an object or a function`');
		}
		if (typeof property !== 'string' && typeof property !== 'symbol') {
			throw new $TypeError('`property` must be a string or a symbol`');
		}
		if (arguments.length > 3 && typeof arguments[3] !== 'boolean' && arguments[3] !== null) {
			throw new $TypeError('`nonEnumerable`, if provided, must be a boolean or null');
		}
		if (arguments.length > 4 && typeof arguments[4] !== 'boolean' && arguments[4] !== null) {
			throw new $TypeError('`nonWritable`, if provided, must be a boolean or null');
		}
		if (arguments.length > 5 && typeof arguments[5] !== 'boolean' && arguments[5] !== null) {
			throw new $TypeError('`nonConfigurable`, if provided, must be a boolean or null');
		}
		if (arguments.length > 6 && typeof arguments[6] !== 'boolean') {
			throw new $TypeError('`loose`, if provided, must be a boolean');
		}

		var nonEnumerable = arguments.length > 3 ? arguments[3] : null;
		var nonWritable = arguments.length > 4 ? arguments[4] : null;
		var nonConfigurable = arguments.length > 5 ? arguments[5] : null;
		var loose = arguments.length > 6 ? arguments[6] : false;

		/* @type {false | TypedPropertyDescriptor<unknown>} */
		var desc = !!gopd && gopd(obj, property);

		if ($defineProperty) {
			$defineProperty(obj, property, {
				configurable: nonConfigurable === null && desc ? desc.configurable : !nonConfigurable,
				enumerable: nonEnumerable === null && desc ? desc.enumerable : !nonEnumerable,
				value: value,
				writable: nonWritable === null && desc ? desc.writable : !nonWritable
			});
		} else if (loose || (!nonEnumerable && !nonWritable && !nonConfigurable)) {
			// must fall back to [[Set]], and was not explicitly asked to make non-enumerable, non-writable, or non-configurable
			obj[property] = value; // eslint-disable-line no-param-reassign
		} else {
			throw new $SyntaxError('This environment does not support defining a property as non-configurable, non-writable, or non-enumerable.');
		}
	};
	return defineDataProperty;
}

var hasPropertyDescriptors_1;
var hasRequiredHasPropertyDescriptors;

function requireHasPropertyDescriptors () {
	if (hasRequiredHasPropertyDescriptors) return hasPropertyDescriptors_1;
	hasRequiredHasPropertyDescriptors = 1;

	var $defineProperty = /*@__PURE__*/ requireEsDefineProperty();

	var hasPropertyDescriptors = function hasPropertyDescriptors() {
		return !!$defineProperty;
	};

	hasPropertyDescriptors.hasArrayLengthDefineBug = function hasArrayLengthDefineBug() {
		// node v0.6 has a bug where array lengths can be Set but not Defined
		if (!$defineProperty) {
			return null;
		}
		try {
			return $defineProperty([], 'length', { value: 1 }).length !== 1;
		} catch (e) {
			// In Firefox 4-22, defining length on an array throws an exception.
			return true;
		}
	};

	hasPropertyDescriptors_1 = hasPropertyDescriptors;
	return hasPropertyDescriptors_1;
}

var defineProperties_1;
var hasRequiredDefineProperties;

function requireDefineProperties () {
	if (hasRequiredDefineProperties) return defineProperties_1;
	hasRequiredDefineProperties = 1;

	var keys = requireObjectKeys();
	var hasSymbols = typeof Symbol === 'function' && typeof Symbol('foo') === 'symbol';

	var toStr = Object.prototype.toString;
	var concat = Array.prototype.concat;
	var defineDataProperty = /*@__PURE__*/ requireDefineDataProperty();

	var isFunction = function (fn) {
		return typeof fn === 'function' && toStr.call(fn) === '[object Function]';
	};

	var supportsDescriptors = /*@__PURE__*/ requireHasPropertyDescriptors()();

	var defineProperty = function (object, name, value, predicate) {
		if (name in object) {
			if (predicate === true) {
				if (object[name] === value) {
					return;
				}
			} else if (!isFunction(predicate) || !predicate()) {
				return;
			}
		}

		if (supportsDescriptors) {
			defineDataProperty(object, name, value, true);
		} else {
			defineDataProperty(object, name, value);
		}
	};

	var defineProperties = function (object, map) {
		var predicates = arguments.length > 2 ? arguments[2] : {};
		var props = keys(map);
		if (hasSymbols) {
			props = concat.call(props, Object.getOwnPropertySymbols(map));
		}
		for (var i = 0; i < props.length; i += 1) {
			defineProperty(object, props[i], map[props[i]], predicates[props[i]]);
		}
	};

	defineProperties.supportsDescriptors = !!supportsDescriptors;

	defineProperties_1 = defineProperties;
	return defineProperties_1;
}

var callBind = {exports: {}};

var esErrors;
var hasRequiredEsErrors;

function requireEsErrors () {
	if (hasRequiredEsErrors) return esErrors;
	hasRequiredEsErrors = 1;

	/** @type {import('.')} */
	esErrors = Error;
	return esErrors;
}

var _eval;
var hasRequired_eval;

function require_eval () {
	if (hasRequired_eval) return _eval;
	hasRequired_eval = 1;

	/** @type {import('./eval')} */
	_eval = EvalError;
	return _eval;
}

var range;
var hasRequiredRange;

function requireRange () {
	if (hasRequiredRange) return range;
	hasRequiredRange = 1;

	/** @type {import('./range')} */
	range = RangeError;
	return range;
}

var ref;
var hasRequiredRef;

function requireRef () {
	if (hasRequiredRef) return ref;
	hasRequiredRef = 1;

	/** @type {import('./ref')} */
	ref = ReferenceError;
	return ref;
}

var uri;
var hasRequiredUri;

function requireUri () {
	if (hasRequiredUri) return uri;
	hasRequiredUri = 1;

	/** @type {import('./uri')} */
	uri = URIError;
	return uri;
}

var abs;
var hasRequiredAbs;

function requireAbs () {
	if (hasRequiredAbs) return abs;
	hasRequiredAbs = 1;

	/** @type {import('./abs')} */
	abs = Math.abs;
	return abs;
}

var floor$1;
var hasRequiredFloor$1;

function requireFloor$1 () {
	if (hasRequiredFloor$1) return floor$1;
	hasRequiredFloor$1 = 1;

	/** @type {import('./floor')} */
	floor$1 = Math.floor;
	return floor$1;
}

var max;
var hasRequiredMax;

function requireMax () {
	if (hasRequiredMax) return max;
	hasRequiredMax = 1;

	/** @type {import('./max')} */
	max = Math.max;
	return max;
}

var min;
var hasRequiredMin;

function requireMin () {
	if (hasRequiredMin) return min;
	hasRequiredMin = 1;

	/** @type {import('./min')} */
	min = Math.min;
	return min;
}

var pow;
var hasRequiredPow;

function requirePow () {
	if (hasRequiredPow) return pow;
	hasRequiredPow = 1;

	/** @type {import('./pow')} */
	pow = Math.pow;
	return pow;
}

var round;
var hasRequiredRound;

function requireRound () {
	if (hasRequiredRound) return round;
	hasRequiredRound = 1;

	/** @type {import('./round')} */
	round = Math.round;
	return round;
}

var _isNaN;
var hasRequired_isNaN;

function require_isNaN () {
	if (hasRequired_isNaN) return _isNaN;
	hasRequired_isNaN = 1;

	/** @type {import('./isNaN')} */
	_isNaN = Number.isNaN || function isNaN(a) {
		return a !== a;
	};
	return _isNaN;
}

var sign;
var hasRequiredSign;

function requireSign () {
	if (hasRequiredSign) return sign;
	hasRequiredSign = 1;

	var $isNaN = /*@__PURE__*/ require_isNaN();

	/** @type {import('./sign')} */
	sign = function sign(number) {
		if ($isNaN(number) || number === 0) {
			return number;
		}
		return number < 0 ? -1 : 1;
	};
	return sign;
}

var shams$1;
var hasRequiredShams$1;

function requireShams$1 () {
	if (hasRequiredShams$1) return shams$1;
	hasRequiredShams$1 = 1;

	/** @type {import('./shams')} */
	/* eslint complexity: [2, 18], max-statements: [2, 33] */
	shams$1 = function hasSymbols() {
		if (typeof Symbol !== 'function' || typeof Object.getOwnPropertySymbols !== 'function') { return false; }
		if (typeof Symbol.iterator === 'symbol') { return true; }

		/** @type {{ [k in symbol]?: unknown }} */
		var obj = {};
		var sym = Symbol('test');
		var symObj = Object(sym);
		if (typeof sym === 'string') { return false; }

		if (Object.prototype.toString.call(sym) !== '[object Symbol]') { return false; }
		if (Object.prototype.toString.call(symObj) !== '[object Symbol]') { return false; }

		// temp disabled per https://github.com/ljharb/object.assign/issues/17
		// if (sym instanceof Symbol) { return false; }
		// temp disabled per https://github.com/WebReflection/get-own-property-symbols/issues/4
		// if (!(symObj instanceof Symbol)) { return false; }

		// if (typeof Symbol.prototype.toString !== 'function') { return false; }
		// if (String(sym) !== Symbol.prototype.toString.call(sym)) { return false; }

		var symVal = 42;
		obj[sym] = symVal;
		for (var _ in obj) { return false; } // eslint-disable-line no-restricted-syntax, no-unreachable-loop
		if (typeof Object.keys === 'function' && Object.keys(obj).length !== 0) { return false; }

		if (typeof Object.getOwnPropertyNames === 'function' && Object.getOwnPropertyNames(obj).length !== 0) { return false; }

		var syms = Object.getOwnPropertySymbols(obj);
		if (syms.length !== 1 || syms[0] !== sym) { return false; }

		if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) { return false; }

		if (typeof Object.getOwnPropertyDescriptor === 'function') {
			// eslint-disable-next-line no-extra-parens
			var descriptor = /** @type {PropertyDescriptor} */ (Object.getOwnPropertyDescriptor(obj, sym));
			if (descriptor.value !== symVal || descriptor.enumerable !== true) { return false; }
		}

		return true;
	};
	return shams$1;
}

var hasSymbols;
var hasRequiredHasSymbols;

function requireHasSymbols () {
	if (hasRequiredHasSymbols) return hasSymbols;
	hasRequiredHasSymbols = 1;

	var origSymbol = typeof Symbol !== 'undefined' && Symbol;
	var hasSymbolSham = requireShams$1();

	/** @type {import('.')} */
	hasSymbols = function hasNativeSymbols() {
		if (typeof origSymbol !== 'function') { return false; }
		if (typeof Symbol !== 'function') { return false; }
		if (typeof origSymbol('foo') !== 'symbol') { return false; }
		if (typeof Symbol('bar') !== 'symbol') { return false; }

		return hasSymbolSham();
	};
	return hasSymbols;
}

var Reflect_getPrototypeOf;
var hasRequiredReflect_getPrototypeOf;

function requireReflect_getPrototypeOf () {
	if (hasRequiredReflect_getPrototypeOf) return Reflect_getPrototypeOf;
	hasRequiredReflect_getPrototypeOf = 1;

	/** @type {import('./Reflect.getPrototypeOf')} */
	Reflect_getPrototypeOf = (typeof Reflect !== 'undefined' && Reflect.getPrototypeOf) || null;
	return Reflect_getPrototypeOf;
}

var Object_getPrototypeOf;
var hasRequiredObject_getPrototypeOf;

function requireObject_getPrototypeOf () {
	if (hasRequiredObject_getPrototypeOf) return Object_getPrototypeOf;
	hasRequiredObject_getPrototypeOf = 1;

	var $Object = /*@__PURE__*/ requireEsObjectAtoms();

	/** @type {import('./Object.getPrototypeOf')} */
	Object_getPrototypeOf = $Object.getPrototypeOf || null;
	return Object_getPrototypeOf;
}

var implementation$3;
var hasRequiredImplementation$4;

function requireImplementation$4 () {
	if (hasRequiredImplementation$4) return implementation$3;
	hasRequiredImplementation$4 = 1;

	/* eslint no-invalid-this: 1 */

	var ERROR_MESSAGE = 'Function.prototype.bind called on incompatible ';
	var toStr = Object.prototype.toString;
	var max = Math.max;
	var funcType = '[object Function]';

	var concatty = function concatty(a, b) {
	    var arr = [];

	    for (var i = 0; i < a.length; i += 1) {
	        arr[i] = a[i];
	    }
	    for (var j = 0; j < b.length; j += 1) {
	        arr[j + a.length] = b[j];
	    }

	    return arr;
	};

	var slicy = function slicy(arrLike, offset) {
	    var arr = [];
	    for (var i = offset, j = 0; i < arrLike.length; i += 1, j += 1) {
	        arr[j] = arrLike[i];
	    }
	    return arr;
	};

	var joiny = function (arr, joiner) {
	    var str = '';
	    for (var i = 0; i < arr.length; i += 1) {
	        str += arr[i];
	        if (i + 1 < arr.length) {
	            str += joiner;
	        }
	    }
	    return str;
	};

	implementation$3 = function bind(that) {
	    var target = this;
	    if (typeof target !== 'function' || toStr.apply(target) !== funcType) {
	        throw new TypeError(ERROR_MESSAGE + target);
	    }
	    var args = slicy(arguments, 1);

	    var bound;
	    var binder = function () {
	        if (this instanceof bound) {
	            var result = target.apply(
	                this,
	                concatty(args, arguments)
	            );
	            if (Object(result) === result) {
	                return result;
	            }
	            return this;
	        }
	        return target.apply(
	            that,
	            concatty(args, arguments)
	        );

	    };

	    var boundLength = max(0, target.length - args.length);
	    var boundArgs = [];
	    for (var i = 0; i < boundLength; i++) {
	        boundArgs[i] = '$' + i;
	    }

	    bound = Function('binder', 'return function (' + joiny(boundArgs, ',') + '){ return binder.apply(this,arguments); }')(binder);

	    if (target.prototype) {
	        var Empty = function Empty() {};
	        Empty.prototype = target.prototype;
	        bound.prototype = new Empty();
	        Empty.prototype = null;
	    }

	    return bound;
	};
	return implementation$3;
}

var functionBind;
var hasRequiredFunctionBind;

function requireFunctionBind () {
	if (hasRequiredFunctionBind) return functionBind;
	hasRequiredFunctionBind = 1;

	var implementation = requireImplementation$4();

	functionBind = Function.prototype.bind || implementation;
	return functionBind;
}

var functionCall;
var hasRequiredFunctionCall;

function requireFunctionCall () {
	if (hasRequiredFunctionCall) return functionCall;
	hasRequiredFunctionCall = 1;

	/** @type {import('./functionCall')} */
	functionCall = Function.prototype.call;
	return functionCall;
}

var functionApply;
var hasRequiredFunctionApply;

function requireFunctionApply () {
	if (hasRequiredFunctionApply) return functionApply;
	hasRequiredFunctionApply = 1;

	/** @type {import('./functionApply')} */
	functionApply = Function.prototype.apply;
	return functionApply;
}

var reflectApply;
var hasRequiredReflectApply;

function requireReflectApply () {
	if (hasRequiredReflectApply) return reflectApply;
	hasRequiredReflectApply = 1;

	/** @type {import('./reflectApply')} */
	reflectApply = typeof Reflect !== 'undefined' && Reflect && Reflect.apply;
	return reflectApply;
}

var actualApply;
var hasRequiredActualApply;

function requireActualApply () {
	if (hasRequiredActualApply) return actualApply;
	hasRequiredActualApply = 1;

	var bind = requireFunctionBind();

	var $apply = requireFunctionApply();
	var $call = requireFunctionCall();
	var $reflectApply = requireReflectApply();

	/** @type {import('./actualApply')} */
	actualApply = $reflectApply || bind.call($call, $apply);
	return actualApply;
}

var callBindApplyHelpers;
var hasRequiredCallBindApplyHelpers;

function requireCallBindApplyHelpers () {
	if (hasRequiredCallBindApplyHelpers) return callBindApplyHelpers;
	hasRequiredCallBindApplyHelpers = 1;

	var bind = requireFunctionBind();
	var $TypeError = /*@__PURE__*/ requireType$2();

	var $call = requireFunctionCall();
	var $actualApply = requireActualApply();

	/** @type {import('.')} */
	callBindApplyHelpers = function callBindBasic(args) {
		if (args.length < 1 || typeof args[0] !== 'function') {
			throw new $TypeError('a function is required');
		}
		return $actualApply(bind, $call, args);
	};
	return callBindApplyHelpers;
}

var get;
var hasRequiredGet$1;

function requireGet$1 () {
	if (hasRequiredGet$1) return get;
	hasRequiredGet$1 = 1;

	var callBind = requireCallBindApplyHelpers();
	var gOPD = /*@__PURE__*/ requireGopd();

	var hasProtoAccessor;
	try {
		// eslint-disable-next-line no-extra-parens, no-proto
		hasProtoAccessor = /** @type {{ __proto__?: typeof Array.prototype }} */ ([]).__proto__ === Array.prototype;
	} catch (e) {
		if (!e || typeof e !== 'object' || !('code' in e) || e.code !== 'ERR_PROTO_ACCESS') {
			throw e;
		}
	}

	// eslint-disable-next-line no-extra-parens
	var desc = !!hasProtoAccessor && gOPD && gOPD(Object.prototype, /** @type {keyof typeof Object.prototype} */ ('__proto__'));

	var $Object = Object;
	var $getPrototypeOf = $Object.getPrototypeOf;

	/** @type {import('./get')} */
	get = desc && typeof desc.get === 'function'
		? callBind([desc.get])
		: typeof $getPrototypeOf === 'function'
			? /** @type {import('./get')} */ function getDunder(value) {
				// eslint-disable-next-line eqeqeq
				return $getPrototypeOf(value == null ? value : $Object(value));
			}
			: false;
	return get;
}

var getProto;
var hasRequiredGetProto;

function requireGetProto () {
	if (hasRequiredGetProto) return getProto;
	hasRequiredGetProto = 1;

	var reflectGetProto = requireReflect_getPrototypeOf();
	var originalGetProto = requireObject_getPrototypeOf();

	var getDunderProto = /*@__PURE__*/ requireGet$1();

	/** @type {import('.')} */
	getProto = reflectGetProto
		? function getProto(O) {
			// @ts-expect-error TS can't narrow inside a closure, for some reason
			return reflectGetProto(O);
		}
		: originalGetProto
			? function getProto(O) {
				if (!O || (typeof O !== 'object' && typeof O !== 'function')) {
					throw new TypeError('getProto: not an object');
				}
				// @ts-expect-error TS can't narrow inside a closure, for some reason
				return originalGetProto(O);
			}
			: getDunderProto
				? function getProto(O) {
					// @ts-expect-error TS can't narrow inside a closure, for some reason
					return getDunderProto(O);
				}
				: null;
	return getProto;
}

var hasown;
var hasRequiredHasown;

function requireHasown () {
	if (hasRequiredHasown) return hasown;
	hasRequiredHasown = 1;

	var call = Function.prototype.call;
	var $hasOwn = Object.prototype.hasOwnProperty;
	var bind = requireFunctionBind();

	/** @type {import('.')} */
	hasown = bind.call(call, $hasOwn);
	return hasown;
}

var getIntrinsic;
var hasRequiredGetIntrinsic;

function requireGetIntrinsic () {
	if (hasRequiredGetIntrinsic) return getIntrinsic;
	hasRequiredGetIntrinsic = 1;

	var undefined$1;

	var $Object = /*@__PURE__*/ requireEsObjectAtoms();

	var $Error = /*@__PURE__*/ requireEsErrors();
	var $EvalError = /*@__PURE__*/ require_eval();
	var $RangeError = /*@__PURE__*/ requireRange();
	var $ReferenceError = /*@__PURE__*/ requireRef();
	var $SyntaxError = /*@__PURE__*/ requireSyntax();
	var $TypeError = /*@__PURE__*/ requireType$2();
	var $URIError = /*@__PURE__*/ requireUri();

	var abs = /*@__PURE__*/ requireAbs();
	var floor = /*@__PURE__*/ requireFloor$1();
	var max = /*@__PURE__*/ requireMax();
	var min = /*@__PURE__*/ requireMin();
	var pow = /*@__PURE__*/ requirePow();
	var round = /*@__PURE__*/ requireRound();
	var sign = /*@__PURE__*/ requireSign();

	var $Function = Function;

	// eslint-disable-next-line consistent-return
	var getEvalledConstructor = function (expressionSyntax) {
		try {
			return $Function('"use strict"; return (' + expressionSyntax + ').constructor;')();
		} catch (e) {}
	};

	var $gOPD = /*@__PURE__*/ requireGopd();
	var $defineProperty = /*@__PURE__*/ requireEsDefineProperty();

	var throwTypeError = function () {
		throw new $TypeError();
	};
	var ThrowTypeError = $gOPD
		? (function () {
			try {
				// eslint-disable-next-line no-unused-expressions, no-caller, no-restricted-properties
				arguments.callee; // IE 8 does not throw here
				return throwTypeError;
			} catch (calleeThrows) {
				try {
					// IE 8 throws on Object.getOwnPropertyDescriptor(arguments, '')
					return $gOPD(arguments, 'callee').get;
				} catch (gOPDthrows) {
					return throwTypeError;
				}
			}
		}())
		: throwTypeError;

	var hasSymbols = requireHasSymbols()();

	var getProto = requireGetProto();
	var $ObjectGPO = requireObject_getPrototypeOf();
	var $ReflectGPO = requireReflect_getPrototypeOf();

	var $apply = requireFunctionApply();
	var $call = requireFunctionCall();

	var needsEval = {};

	var TypedArray = typeof Uint8Array === 'undefined' || !getProto ? undefined$1 : getProto(Uint8Array);

	var INTRINSICS = {
		__proto__: null,
		'%AggregateError%': typeof AggregateError === 'undefined' ? undefined$1 : AggregateError,
		'%Array%': Array,
		'%ArrayBuffer%': typeof ArrayBuffer === 'undefined' ? undefined$1 : ArrayBuffer,
		'%ArrayIteratorPrototype%': hasSymbols && getProto ? getProto([][Symbol.iterator]()) : undefined$1,
		'%AsyncFromSyncIteratorPrototype%': undefined$1,
		'%AsyncFunction%': needsEval,
		'%AsyncGenerator%': needsEval,
		'%AsyncGeneratorFunction%': needsEval,
		'%AsyncIteratorPrototype%': needsEval,
		'%Atomics%': typeof Atomics === 'undefined' ? undefined$1 : Atomics,
		'%BigInt%': typeof BigInt === 'undefined' ? undefined$1 : BigInt,
		'%BigInt64Array%': typeof BigInt64Array === 'undefined' ? undefined$1 : BigInt64Array,
		'%BigUint64Array%': typeof BigUint64Array === 'undefined' ? undefined$1 : BigUint64Array,
		'%Boolean%': Boolean,
		'%DataView%': typeof DataView === 'undefined' ? undefined$1 : DataView,
		'%Date%': Date,
		'%decodeURI%': decodeURI,
		'%decodeURIComponent%': decodeURIComponent,
		'%encodeURI%': encodeURI,
		'%encodeURIComponent%': encodeURIComponent,
		'%Error%': $Error,
		'%eval%': eval, // eslint-disable-line no-eval
		'%EvalError%': $EvalError,
		'%Float32Array%': typeof Float32Array === 'undefined' ? undefined$1 : Float32Array,
		'%Float64Array%': typeof Float64Array === 'undefined' ? undefined$1 : Float64Array,
		'%FinalizationRegistry%': typeof FinalizationRegistry === 'undefined' ? undefined$1 : FinalizationRegistry,
		'%Function%': $Function,
		'%GeneratorFunction%': needsEval,
		'%Int8Array%': typeof Int8Array === 'undefined' ? undefined$1 : Int8Array,
		'%Int16Array%': typeof Int16Array === 'undefined' ? undefined$1 : Int16Array,
		'%Int32Array%': typeof Int32Array === 'undefined' ? undefined$1 : Int32Array,
		'%isFinite%': isFinite,
		'%isNaN%': isNaN,
		'%IteratorPrototype%': hasSymbols && getProto ? getProto(getProto([][Symbol.iterator]())) : undefined$1,
		'%JSON%': typeof JSON === 'object' ? JSON : undefined$1,
		'%Map%': typeof Map === 'undefined' ? undefined$1 : Map,
		'%MapIteratorPrototype%': typeof Map === 'undefined' || !hasSymbols || !getProto ? undefined$1 : getProto(new Map()[Symbol.iterator]()),
		'%Math%': Math,
		'%Number%': Number,
		'%Object%': $Object,
		'%Object.getOwnPropertyDescriptor%': $gOPD,
		'%parseFloat%': parseFloat,
		'%parseInt%': parseInt,
		'%Promise%': typeof Promise === 'undefined' ? undefined$1 : Promise,
		'%Proxy%': typeof Proxy === 'undefined' ? undefined$1 : Proxy,
		'%RangeError%': $RangeError,
		'%ReferenceError%': $ReferenceError,
		'%Reflect%': typeof Reflect === 'undefined' ? undefined$1 : Reflect,
		'%RegExp%': RegExp,
		'%Set%': typeof Set === 'undefined' ? undefined$1 : Set,
		'%SetIteratorPrototype%': typeof Set === 'undefined' || !hasSymbols || !getProto ? undefined$1 : getProto(new Set()[Symbol.iterator]()),
		'%SharedArrayBuffer%': typeof SharedArrayBuffer === 'undefined' ? undefined$1 : SharedArrayBuffer,
		'%String%': String,
		'%StringIteratorPrototype%': hasSymbols && getProto ? getProto(''[Symbol.iterator]()) : undefined$1,
		'%Symbol%': hasSymbols ? Symbol : undefined$1,
		'%SyntaxError%': $SyntaxError,
		'%ThrowTypeError%': ThrowTypeError,
		'%TypedArray%': TypedArray,
		'%TypeError%': $TypeError,
		'%Uint8Array%': typeof Uint8Array === 'undefined' ? undefined$1 : Uint8Array,
		'%Uint8ClampedArray%': typeof Uint8ClampedArray === 'undefined' ? undefined$1 : Uint8ClampedArray,
		'%Uint16Array%': typeof Uint16Array === 'undefined' ? undefined$1 : Uint16Array,
		'%Uint32Array%': typeof Uint32Array === 'undefined' ? undefined$1 : Uint32Array,
		'%URIError%': $URIError,
		'%WeakMap%': typeof WeakMap === 'undefined' ? undefined$1 : WeakMap,
		'%WeakRef%': typeof WeakRef === 'undefined' ? undefined$1 : WeakRef,
		'%WeakSet%': typeof WeakSet === 'undefined' ? undefined$1 : WeakSet,

		'%Function.prototype.call%': $call,
		'%Function.prototype.apply%': $apply,
		'%Object.defineProperty%': $defineProperty,
		'%Object.getPrototypeOf%': $ObjectGPO,
		'%Math.abs%': abs,
		'%Math.floor%': floor,
		'%Math.max%': max,
		'%Math.min%': min,
		'%Math.pow%': pow,
		'%Math.round%': round,
		'%Math.sign%': sign,
		'%Reflect.getPrototypeOf%': $ReflectGPO
	};

	if (getProto) {
		try {
			null.error; // eslint-disable-line no-unused-expressions
		} catch (e) {
			// https://github.com/tc39/proposal-shadowrealm/pull/384#issuecomment-1364264229
			var errorProto = getProto(getProto(e));
			INTRINSICS['%Error.prototype%'] = errorProto;
		}
	}

	var doEval = function doEval(name) {
		var value;
		if (name === '%AsyncFunction%') {
			value = getEvalledConstructor('async function () {}');
		} else if (name === '%GeneratorFunction%') {
			value = getEvalledConstructor('function* () {}');
		} else if (name === '%AsyncGeneratorFunction%') {
			value = getEvalledConstructor('async function* () {}');
		} else if (name === '%AsyncGenerator%') {
			var fn = doEval('%AsyncGeneratorFunction%');
			if (fn) {
				value = fn.prototype;
			}
		} else if (name === '%AsyncIteratorPrototype%') {
			var gen = doEval('%AsyncGenerator%');
			if (gen && getProto) {
				value = getProto(gen.prototype);
			}
		}

		INTRINSICS[name] = value;

		return value;
	};

	var LEGACY_ALIASES = {
		__proto__: null,
		'%ArrayBufferPrototype%': ['ArrayBuffer', 'prototype'],
		'%ArrayPrototype%': ['Array', 'prototype'],
		'%ArrayProto_entries%': ['Array', 'prototype', 'entries'],
		'%ArrayProto_forEach%': ['Array', 'prototype', 'forEach'],
		'%ArrayProto_keys%': ['Array', 'prototype', 'keys'],
		'%ArrayProto_values%': ['Array', 'prototype', 'values'],
		'%AsyncFunctionPrototype%': ['AsyncFunction', 'prototype'],
		'%AsyncGenerator%': ['AsyncGeneratorFunction', 'prototype'],
		'%AsyncGeneratorPrototype%': ['AsyncGeneratorFunction', 'prototype', 'prototype'],
		'%BooleanPrototype%': ['Boolean', 'prototype'],
		'%DataViewPrototype%': ['DataView', 'prototype'],
		'%DatePrototype%': ['Date', 'prototype'],
		'%ErrorPrototype%': ['Error', 'prototype'],
		'%EvalErrorPrototype%': ['EvalError', 'prototype'],
		'%Float32ArrayPrototype%': ['Float32Array', 'prototype'],
		'%Float64ArrayPrototype%': ['Float64Array', 'prototype'],
		'%FunctionPrototype%': ['Function', 'prototype'],
		'%Generator%': ['GeneratorFunction', 'prototype'],
		'%GeneratorPrototype%': ['GeneratorFunction', 'prototype', 'prototype'],
		'%Int8ArrayPrototype%': ['Int8Array', 'prototype'],
		'%Int16ArrayPrototype%': ['Int16Array', 'prototype'],
		'%Int32ArrayPrototype%': ['Int32Array', 'prototype'],
		'%JSONParse%': ['JSON', 'parse'],
		'%JSONStringify%': ['JSON', 'stringify'],
		'%MapPrototype%': ['Map', 'prototype'],
		'%NumberPrototype%': ['Number', 'prototype'],
		'%ObjectPrototype%': ['Object', 'prototype'],
		'%ObjProto_toString%': ['Object', 'prototype', 'toString'],
		'%ObjProto_valueOf%': ['Object', 'prototype', 'valueOf'],
		'%PromisePrototype%': ['Promise', 'prototype'],
		'%PromiseProto_then%': ['Promise', 'prototype', 'then'],
		'%Promise_all%': ['Promise', 'all'],
		'%Promise_reject%': ['Promise', 'reject'],
		'%Promise_resolve%': ['Promise', 'resolve'],
		'%RangeErrorPrototype%': ['RangeError', 'prototype'],
		'%ReferenceErrorPrototype%': ['ReferenceError', 'prototype'],
		'%RegExpPrototype%': ['RegExp', 'prototype'],
		'%SetPrototype%': ['Set', 'prototype'],
		'%SharedArrayBufferPrototype%': ['SharedArrayBuffer', 'prototype'],
		'%StringPrototype%': ['String', 'prototype'],
		'%SymbolPrototype%': ['Symbol', 'prototype'],
		'%SyntaxErrorPrototype%': ['SyntaxError', 'prototype'],
		'%TypedArrayPrototype%': ['TypedArray', 'prototype'],
		'%TypeErrorPrototype%': ['TypeError', 'prototype'],
		'%Uint8ArrayPrototype%': ['Uint8Array', 'prototype'],
		'%Uint8ClampedArrayPrototype%': ['Uint8ClampedArray', 'prototype'],
		'%Uint16ArrayPrototype%': ['Uint16Array', 'prototype'],
		'%Uint32ArrayPrototype%': ['Uint32Array', 'prototype'],
		'%URIErrorPrototype%': ['URIError', 'prototype'],
		'%WeakMapPrototype%': ['WeakMap', 'prototype'],
		'%WeakSetPrototype%': ['WeakSet', 'prototype']
	};

	var bind = requireFunctionBind();
	var hasOwn = /*@__PURE__*/ requireHasown();
	var $concat = bind.call($call, Array.prototype.concat);
	var $spliceApply = bind.call($apply, Array.prototype.splice);
	var $replace = bind.call($call, String.prototype.replace);
	var $strSlice = bind.call($call, String.prototype.slice);
	var $exec = bind.call($call, RegExp.prototype.exec);

	/* adapted from https://github.com/lodash/lodash/blob/4.17.15/dist/lodash.js#L6735-L6744 */
	var rePropName = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g;
	var reEscapeChar = /\\(\\)?/g; /** Used to match backslashes in property paths. */
	var stringToPath = function stringToPath(string) {
		var first = $strSlice(string, 0, 1);
		var last = $strSlice(string, -1);
		if (first === '%' && last !== '%') {
			throw new $SyntaxError('invalid intrinsic syntax, expected closing `%`');
		} else if (last === '%' && first !== '%') {
			throw new $SyntaxError('invalid intrinsic syntax, expected opening `%`');
		}
		var result = [];
		$replace(string, rePropName, function (match, number, quote, subString) {
			result[result.length] = quote ? $replace(subString, reEscapeChar, '$1') : number || match;
		});
		return result;
	};
	/* end adaptation */

	var getBaseIntrinsic = function getBaseIntrinsic(name, allowMissing) {
		var intrinsicName = name;
		var alias;
		if (hasOwn(LEGACY_ALIASES, intrinsicName)) {
			alias = LEGACY_ALIASES[intrinsicName];
			intrinsicName = '%' + alias[0] + '%';
		}

		if (hasOwn(INTRINSICS, intrinsicName)) {
			var value = INTRINSICS[intrinsicName];
			if (value === needsEval) {
				value = doEval(intrinsicName);
			}
			if (typeof value === 'undefined' && !allowMissing) {
				throw new $TypeError('intrinsic ' + name + ' exists, but is not available. Please file an issue!');
			}

			return {
				alias: alias,
				name: intrinsicName,
				value: value
			};
		}

		throw new $SyntaxError('intrinsic ' + name + ' does not exist!');
	};

	getIntrinsic = function GetIntrinsic(name, allowMissing) {
		if (typeof name !== 'string' || name.length === 0) {
			throw new $TypeError('intrinsic name must be a non-empty string');
		}
		if (arguments.length > 1 && typeof allowMissing !== 'boolean') {
			throw new $TypeError('"allowMissing" argument must be a boolean');
		}

		if ($exec(/^%?[^%]*%?$/, name) === null) {
			throw new $SyntaxError('`%` may not be present anywhere but at the beginning and end of the intrinsic name');
		}
		var parts = stringToPath(name);
		var intrinsicBaseName = parts.length > 0 ? parts[0] : '';

		var intrinsic = getBaseIntrinsic('%' + intrinsicBaseName + '%', allowMissing);
		var intrinsicRealName = intrinsic.name;
		var value = intrinsic.value;
		var skipFurtherCaching = false;

		var alias = intrinsic.alias;
		if (alias) {
			intrinsicBaseName = alias[0];
			$spliceApply(parts, $concat([0, 1], alias));
		}

		for (var i = 1, isOwn = true; i < parts.length; i += 1) {
			var part = parts[i];
			var first = $strSlice(part, 0, 1);
			var last = $strSlice(part, -1);
			if (
				(
					(first === '"' || first === "'" || first === '`')
					|| (last === '"' || last === "'" || last === '`')
				)
				&& first !== last
			) {
				throw new $SyntaxError('property names with quotes must have matching quotes');
			}
			if (part === 'constructor' || !isOwn) {
				skipFurtherCaching = true;
			}

			intrinsicBaseName += '.' + part;
			intrinsicRealName = '%' + intrinsicBaseName + '%';

			if (hasOwn(INTRINSICS, intrinsicRealName)) {
				value = INTRINSICS[intrinsicRealName];
			} else if (value != null) {
				if (!(part in value)) {
					if (!allowMissing) {
						throw new $TypeError('base intrinsic for ' + name + ' exists, but the property is not available.');
					}
					return void undefined$1;
				}
				if ($gOPD && (i + 1) >= parts.length) {
					var desc = $gOPD(value, part);
					isOwn = !!desc;

					// By convention, when a data property is converted to an accessor
					// property to emulate a data property that does not suffer from
					// the override mistake, that accessor's getter is marked with
					// an `originalValue` property. Here, when we detect this, we
					// uphold the illusion by pretending to see that original data
					// property, i.e., returning the value rather than the getter
					// itself.
					if (isOwn && 'get' in desc && !('originalValue' in desc.get)) {
						value = desc.get;
					} else {
						value = value[part];
					}
				} else {
					isOwn = hasOwn(value, part);
					value = value[part];
				}

				if (isOwn && !skipFurtherCaching) {
					INTRINSICS[intrinsicRealName] = value;
				}
			}
		}
		return value;
	};
	return getIntrinsic;
}

var setFunctionLength;
var hasRequiredSetFunctionLength;

function requireSetFunctionLength () {
	if (hasRequiredSetFunctionLength) return setFunctionLength;
	hasRequiredSetFunctionLength = 1;

	var GetIntrinsic = /*@__PURE__*/ requireGetIntrinsic();
	var define = /*@__PURE__*/ requireDefineDataProperty();
	var hasDescriptors = /*@__PURE__*/ requireHasPropertyDescriptors()();
	var gOPD = /*@__PURE__*/ requireGopd();

	var $TypeError = /*@__PURE__*/ requireType$2();
	var $floor = GetIntrinsic('%Math.floor%');

	/** @type {import('.')} */
	setFunctionLength = function setFunctionLength(fn, length) {
		if (typeof fn !== 'function') {
			throw new $TypeError('`fn` is not a function');
		}
		if (typeof length !== 'number' || length < 0 || length > 0xFFFFFFFF || $floor(length) !== length) {
			throw new $TypeError('`length` must be a positive 32-bit integer');
		}

		var loose = arguments.length > 2 && !!arguments[2];

		var functionLengthIsConfigurable = true;
		var functionLengthIsWritable = true;
		if ('length' in fn && gOPD) {
			var desc = gOPD(fn, 'length');
			if (desc && !desc.configurable) {
				functionLengthIsConfigurable = false;
			}
			if (desc && !desc.writable) {
				functionLengthIsWritable = false;
			}
		}

		if (functionLengthIsConfigurable || functionLengthIsWritable || !loose) {
			if (hasDescriptors) {
				define(/** @type {Parameters<define>[0]} */ (fn), 'length', length, true, true);
			} else {
				define(/** @type {Parameters<define>[0]} */ (fn), 'length', length);
			}
		}
		return fn;
	};
	return setFunctionLength;
}

var applyBind;
var hasRequiredApplyBind;

function requireApplyBind () {
	if (hasRequiredApplyBind) return applyBind;
	hasRequiredApplyBind = 1;

	var bind = requireFunctionBind();
	var $apply = requireFunctionApply();
	var actualApply = requireActualApply();

	/** @type {import('./applyBind')} */
	applyBind = function applyBind() {
		return actualApply(bind, $apply, arguments);
	};
	return applyBind;
}

var hasRequiredCallBind;

function requireCallBind () {
	if (hasRequiredCallBind) return callBind.exports;
	hasRequiredCallBind = 1;
	(function (module) {

		var setFunctionLength = /*@__PURE__*/ requireSetFunctionLength();

		var $defineProperty = /*@__PURE__*/ requireEsDefineProperty();

		var callBindBasic = requireCallBindApplyHelpers();
		var applyBind = requireApplyBind();

		module.exports = function callBind(originalFunction) {
			var func = callBindBasic(arguments);
			var adjustedLength = originalFunction.length - (arguments.length - 1);
			return setFunctionLength(
				func,
				1 + (adjustedLength > 0 ? adjustedLength : 0),
				true
			);
		};

		if ($defineProperty) {
			$defineProperty(module.exports, 'apply', { value: applyBind });
		} else {
			module.exports.apply = applyBind;
		} 
	} (callBind));
	return callBind.exports;
}

var isPropertyKey;
var hasRequiredIsPropertyKey;

function requireIsPropertyKey () {
	if (hasRequiredIsPropertyKey) return isPropertyKey;
	hasRequiredIsPropertyKey = 1;

	isPropertyKey = function isPropertyKey(argument) {
		return typeof argument === 'string' || typeof argument === 'symbol';
	};
	return isPropertyKey;
}

var propertyDescriptor;
var hasRequiredPropertyDescriptor;

function requirePropertyDescriptor () {
	if (hasRequiredPropertyDescriptor) return propertyDescriptor;
	hasRequiredPropertyDescriptor = 1;

	var $TypeError = /*@__PURE__*/ requireType$2();

	var hasOwn = /*@__PURE__*/ requireHasown();

	var allowed = {
		__proto__: null,
		'[[Configurable]]': true,
		'[[Enumerable]]': true,
		'[[Get]]': true,
		'[[Set]]': true,
		'[[Value]]': true,
		'[[Writable]]': true
	};

	// https://262.ecma-international.org/6.0/#sec-property-descriptor-specification-type

	propertyDescriptor = function isPropertyDescriptor(Desc) {
		if (!Desc || typeof Desc !== 'object') {
			return false;
		}

		for (var key in Desc) { // eslint-disable-line
			if (hasOwn(Desc, key) && !allowed[key]) {
				return false;
			}
		}

		var isData = hasOwn(Desc, '[[Value]]') || hasOwn(Desc, '[[Writable]]');
		var IsAccessor = hasOwn(Desc, '[[Get]]') || hasOwn(Desc, '[[Set]]');
		if (isData && IsAccessor) {
			throw new $TypeError('Property Descriptors may not be both accessor and data descriptors');
		}
		return true;
	};
	return propertyDescriptor;
}

var IsAccessorDescriptor;
var hasRequiredIsAccessorDescriptor;

function requireIsAccessorDescriptor () {
	if (hasRequiredIsAccessorDescriptor) return IsAccessorDescriptor;
	hasRequiredIsAccessorDescriptor = 1;

	var $TypeError = /*@__PURE__*/ requireType$2();

	var hasOwn = /*@__PURE__*/ requireHasown();

	var isPropertyDescriptor = /*@__PURE__*/ requirePropertyDescriptor();

	// https://262.ecma-international.org/5.1/#sec-8.10.1

	IsAccessorDescriptor = function IsAccessorDescriptor(Desc) {
		if (typeof Desc === 'undefined') {
			return false;
		}

		if (!isPropertyDescriptor(Desc)) {
			throw new $TypeError('Assertion failed: `Desc` must be a Property Descriptor');
		}

		if (!hasOwn(Desc, '[[Get]]') && !hasOwn(Desc, '[[Set]]')) {
			return false;
		}

		return true;
	};
	return IsAccessorDescriptor;
}

var isPrimitive$1;
var hasRequiredIsPrimitive$1;

function requireIsPrimitive$1 () {
	if (hasRequiredIsPrimitive$1) return isPrimitive$1;
	hasRequiredIsPrimitive$1 = 1;

	isPrimitive$1 = function isPrimitive(value) {
		return value === null || (typeof value !== 'function' && typeof value !== 'object');
	};
	return isPrimitive$1;
}

var IsExtensible;
var hasRequiredIsExtensible;

function requireIsExtensible () {
	if (hasRequiredIsExtensible) return IsExtensible;
	hasRequiredIsExtensible = 1;

	var GetIntrinsic = /*@__PURE__*/ requireGetIntrinsic();

	var $preventExtensions = GetIntrinsic('%Object.preventExtensions%', true);
	var $isExtensible = GetIntrinsic('%Object.isExtensible%', true);

	var isPrimitive = /*@__PURE__*/ requireIsPrimitive$1();

	// https://262.ecma-international.org/6.0/#sec-isextensible-o

	IsExtensible = $preventExtensions
		? function IsExtensible(obj) {
			return !isPrimitive(obj) && $isExtensible(obj);
		}
		: function IsExtensible(obj) {
			return !isPrimitive(obj);
		};
	return IsExtensible;
}

var IsCallable;
var hasRequiredIsCallable;

function requireIsCallable () {
	if (hasRequiredIsCallable) return IsCallable;
	hasRequiredIsCallable = 1;

	// http://262.ecma-international.org/5.1/#sec-9.11

	IsCallable = requireIsCallable$1();
	return IsCallable;
}

var ToBoolean;
var hasRequiredToBoolean;

function requireToBoolean () {
	if (hasRequiredToBoolean) return ToBoolean;
	hasRequiredToBoolean = 1;

	// http://262.ecma-international.org/5.1/#sec-9.2

	ToBoolean = function ToBoolean(value) { return !!value; };
	return ToBoolean;
}

var isObject;
var hasRequiredIsObject;

function requireIsObject () {
	if (hasRequiredIsObject) return isObject;
	hasRequiredIsObject = 1;

	isObject = function isObject(x) {
		return !!x && (typeof x === 'function' || typeof x === 'object');
	};
	return isObject;
}

var ToPropertyDescriptor;
var hasRequiredToPropertyDescriptor;

function requireToPropertyDescriptor () {
	if (hasRequiredToPropertyDescriptor) return ToPropertyDescriptor;
	hasRequiredToPropertyDescriptor = 1;

	var hasOwn = /*@__PURE__*/ requireHasown();

	var $TypeError = /*@__PURE__*/ requireType$2();

	var IsCallable = /*@__PURE__*/ requireIsCallable();
	var ToBoolean = /*@__PURE__*/ requireToBoolean();

	var isObject = /*@__PURE__*/ requireIsObject();

	// https://262.ecma-international.org/5.1/#sec-8.10.5

	ToPropertyDescriptor = function ToPropertyDescriptor(Obj) {
		if (!isObject(Obj)) {
			throw new $TypeError('ToPropertyDescriptor requires an object');
		}

		var desc = {};
		if (hasOwn(Obj, 'enumerable')) {
			desc['[[Enumerable]]'] = ToBoolean(Obj.enumerable);
		}
		if (hasOwn(Obj, 'configurable')) {
			desc['[[Configurable]]'] = ToBoolean(Obj.configurable);
		}
		if (hasOwn(Obj, 'value')) {
			desc['[[Value]]'] = Obj.value;
		}
		if (hasOwn(Obj, 'writable')) {
			desc['[[Writable]]'] = ToBoolean(Obj.writable);
		}
		if (hasOwn(Obj, 'get')) {
			var getter = Obj.get;
			if (typeof getter !== 'undefined' && !IsCallable(getter)) {
				throw new $TypeError('getter must be a function');
			}
			desc['[[Get]]'] = getter;
		}
		if (hasOwn(Obj, 'set')) {
			var setter = Obj.set;
			if (typeof setter !== 'undefined' && !IsCallable(setter)) {
				throw new $TypeError('setter must be a function');
			}
			desc['[[Set]]'] = setter;
		}

		if ((hasOwn(desc, '[[Get]]') || hasOwn(desc, '[[Set]]')) && (hasOwn(desc, '[[Value]]') || hasOwn(desc, '[[Writable]]'))) {
			throw new $TypeError('Invalid property descriptor. Cannot both specify accessors and a value or writable attribute');
		}
		return desc;
	};
	return ToPropertyDescriptor;
}

var SameValue;
var hasRequiredSameValue;

function requireSameValue () {
	if (hasRequiredSameValue) return SameValue;
	hasRequiredSameValue = 1;

	var $isNaN = /*@__PURE__*/ require_isNaN();

	// http://262.ecma-international.org/5.1/#sec-9.12

	SameValue = function SameValue(x, y) {
		if (x === y) { // 0 === -0, but they are not identical.
			if (x === 0) { return 1 / x === 1 / y; }
			return true;
		}
		return $isNaN(x) && $isNaN(y);
	};
	return SameValue;
}

var callBound$1;
var hasRequiredCallBound$1;

function requireCallBound$1 () {
	if (hasRequiredCallBound$1) return callBound$1;
	hasRequiredCallBound$1 = 1;

	var GetIntrinsic = /*@__PURE__*/ requireGetIntrinsic();

	var callBindBasic = requireCallBindApplyHelpers();

	/** @type {(thisArg: string, searchString: string, position?: number) => number} */
	var $indexOf = callBindBasic([GetIntrinsic('%String.prototype.indexOf%')]);

	/** @type {import('.')} */
	callBound$1 = function callBoundIntrinsic(name, allowMissing) {
		// eslint-disable-next-line no-extra-parens
		var intrinsic = /** @type {Parameters<typeof callBindBasic>[0][0]} */ (GetIntrinsic(name, !!allowMissing));
		if (typeof intrinsic === 'function' && $indexOf(name, '.prototype.') > -1) {
			return callBindBasic([intrinsic]);
		}
		return intrinsic;
	};
	return callBound$1;
}

var IsArray$1;
var hasRequiredIsArray$1;

function requireIsArray$1 () {
	if (hasRequiredIsArray$1) return IsArray$1;
	hasRequiredIsArray$1 = 1;

	var GetIntrinsic = /*@__PURE__*/ requireGetIntrinsic();

	var $Array = GetIntrinsic('%Array%');

	// eslint-disable-next-line global-require
	var toStr = !$Array.isArray && /*@__PURE__*/ requireCallBound$1()('Object.prototype.toString');

	IsArray$1 = $Array.isArray || function IsArray(argument) {
		return toStr(argument) === '[object Array]';
	};
	return IsArray$1;
}

var DefineOwnProperty;
var hasRequiredDefineOwnProperty;

function requireDefineOwnProperty () {
	if (hasRequiredDefineOwnProperty) return DefineOwnProperty;
	hasRequiredDefineOwnProperty = 1;

	var hasPropertyDescriptors = /*@__PURE__*/ requireHasPropertyDescriptors();

	var $defineProperty = /*@__PURE__*/ requireEsDefineProperty();

	var hasArrayLengthDefineBug = hasPropertyDescriptors.hasArrayLengthDefineBug();

	// eslint-disable-next-line global-require
	var isArray = hasArrayLengthDefineBug && /*@__PURE__*/ requireIsArray$1();

	var callBound = /*@__PURE__*/ requireCallBound$1();

	var $isEnumerable = callBound('Object.prototype.propertyIsEnumerable');

	// eslint-disable-next-line max-params
	DefineOwnProperty = function DefineOwnProperty(IsDataDescriptor, SameValue, FromPropertyDescriptor, O, P, desc) {
		if (!$defineProperty) {
			if (!IsDataDescriptor(desc)) {
				// ES3 does not support getters/setters
				return false;
			}
			if (!desc['[[Configurable]]'] || !desc['[[Writable]]']) {
				return false;
			}

			// fallback for ES3
			if (P in O && $isEnumerable(O, P) !== !!desc['[[Enumerable]]']) {
				// a non-enumerable existing property
				return false;
			}

			// property does not exist at all, or exists but is enumerable
			var V = desc['[[Value]]'];
			// eslint-disable-next-line no-param-reassign
			O[P] = V; // will use [[Define]]
			return SameValue(O[P], V);
		}
		if (
			hasArrayLengthDefineBug
			&& P === 'length'
			&& '[[Value]]' in desc
			&& isArray(O)
			&& O.length !== desc['[[Value]]']
		) {
			// eslint-disable-next-line no-param-reassign
			O.length = desc['[[Value]]'];
			return O.length === desc['[[Value]]'];
		}

		$defineProperty(O, P, FromPropertyDescriptor(desc));
		return true;
	};
	return DefineOwnProperty;
}

var isFullyPopulatedPropertyDescriptor;
var hasRequiredIsFullyPopulatedPropertyDescriptor;

function requireIsFullyPopulatedPropertyDescriptor () {
	if (hasRequiredIsFullyPopulatedPropertyDescriptor) return isFullyPopulatedPropertyDescriptor;
	hasRequiredIsFullyPopulatedPropertyDescriptor = 1;

	var isPropertyDescriptor = /*@__PURE__*/ requirePropertyDescriptor();

	isFullyPopulatedPropertyDescriptor = function isFullyPopulatedPropertyDescriptor(ES, Desc) {
		return isPropertyDescriptor(Desc)
			&& '[[Enumerable]]' in Desc
			&& '[[Configurable]]' in Desc
			&& (ES.IsAccessorDescriptor(Desc) || ES.IsDataDescriptor(Desc));
	};
	return isFullyPopulatedPropertyDescriptor;
}

var fromPropertyDescriptor;
var hasRequiredFromPropertyDescriptor$1;

function requireFromPropertyDescriptor$1 () {
	if (hasRequiredFromPropertyDescriptor$1) return fromPropertyDescriptor;
	hasRequiredFromPropertyDescriptor$1 = 1;

	fromPropertyDescriptor = function fromPropertyDescriptor(Desc) {
		if (typeof Desc === 'undefined') {
			return Desc;
		}
		var obj = {};
		if ('[[Value]]' in Desc) {
			obj.value = Desc['[[Value]]'];
		}
		if ('[[Writable]]' in Desc) {
			obj.writable = !!Desc['[[Writable]]'];
		}
		if ('[[Get]]' in Desc) {
			obj.get = Desc['[[Get]]'];
		}
		if ('[[Set]]' in Desc) {
			obj.set = Desc['[[Set]]'];
		}
		if ('[[Enumerable]]' in Desc) {
			obj.enumerable = !!Desc['[[Enumerable]]'];
		}
		if ('[[Configurable]]' in Desc) {
			obj.configurable = !!Desc['[[Configurable]]'];
		}
		return obj;
	};
	return fromPropertyDescriptor;
}

var FromPropertyDescriptor;
var hasRequiredFromPropertyDescriptor;

function requireFromPropertyDescriptor () {
	if (hasRequiredFromPropertyDescriptor) return FromPropertyDescriptor;
	hasRequiredFromPropertyDescriptor = 1;

	var $TypeError = /*@__PURE__*/ requireType$2();

	var isPropertyDescriptor = /*@__PURE__*/ requirePropertyDescriptor();
	var fromPropertyDescriptor = /*@__PURE__*/ requireFromPropertyDescriptor$1();

	// https://262.ecma-international.org/6.0/#sec-frompropertydescriptor

	FromPropertyDescriptor = function FromPropertyDescriptor(Desc) {
		if (typeof Desc !== 'undefined' && !isPropertyDescriptor(Desc)) {
			throw new $TypeError('Assertion failed: `Desc` must be a Property Descriptor');
		}

		return fromPropertyDescriptor(Desc);
	};
	return FromPropertyDescriptor;
}

var IsDataDescriptor;
var hasRequiredIsDataDescriptor;

function requireIsDataDescriptor () {
	if (hasRequiredIsDataDescriptor) return IsDataDescriptor;
	hasRequiredIsDataDescriptor = 1;

	var $TypeError = /*@__PURE__*/ requireType$2();

	var hasOwn = /*@__PURE__*/ requireHasown();

	var isPropertyDescriptor = /*@__PURE__*/ requirePropertyDescriptor();

	// https://262.ecma-international.org/5.1/#sec-8.10.2

	IsDataDescriptor = function IsDataDescriptor(Desc) {
		if (typeof Desc === 'undefined') {
			return false;
		}

		if (!isPropertyDescriptor(Desc)) {
			throw new $TypeError('Assertion failed: `Desc` must be a Property Descriptor');
		}

		if (!hasOwn(Desc, '[[Value]]') && !hasOwn(Desc, '[[Writable]]')) {
			return false;
		}

		return true;
	};
	return IsDataDescriptor;
}

var IsGenericDescriptor;
var hasRequiredIsGenericDescriptor;

function requireIsGenericDescriptor () {
	if (hasRequiredIsGenericDescriptor) return IsGenericDescriptor;
	hasRequiredIsGenericDescriptor = 1;

	var $TypeError = /*@__PURE__*/ requireType$2();

	var IsAccessorDescriptor = /*@__PURE__*/ requireIsAccessorDescriptor();
	var IsDataDescriptor = /*@__PURE__*/ requireIsDataDescriptor();

	var isPropertyDescriptor = /*@__PURE__*/ requirePropertyDescriptor();

	// https://262.ecma-international.org/6.0/#sec-isgenericdescriptor

	IsGenericDescriptor = function IsGenericDescriptor(Desc) {
		if (typeof Desc === 'undefined') {
			return false;
		}

		if (!isPropertyDescriptor(Desc)) {
			throw new $TypeError('Assertion failed: `Desc` must be a Property Descriptor');
		}

		if (!IsAccessorDescriptor(Desc) && !IsDataDescriptor(Desc)) {
			return true;
		}

		return false;
	};
	return IsGenericDescriptor;
}

var Type$1;
var hasRequiredType$1;

function requireType$1 () {
	if (hasRequiredType$1) return Type$1;
	hasRequiredType$1 = 1;

	var isObject = /*@__PURE__*/ requireIsObject();

	// https://262.ecma-international.org/5.1/#sec-8

	Type$1 = function Type(x) {
		if (x === null) {
			return 'Null';
		}
		if (typeof x === 'undefined') {
			return 'Undefined';
		}
		if (isObject(x)) {
			return 'Object';
		}
		if (typeof x === 'number') {
			return 'Number';
		}
		if (typeof x === 'boolean') {
			return 'Boolean';
		}
		if (typeof x === 'string') {
			return 'String';
		}
	};
	return Type$1;
}

var Type;
var hasRequiredType;

function requireType () {
	if (hasRequiredType) return Type;
	hasRequiredType = 1;

	var ES5Type = /*@__PURE__*/ requireType$1();

	// https://262.ecma-international.org/11.0/#sec-ecmascript-data-types-and-values

	Type = function Type(x) {
		if (typeof x === 'symbol') {
			return 'Symbol';
		}
		if (typeof x === 'bigint') {
			return 'BigInt';
		}
		return ES5Type(x);
	};
	return Type;
}

var ValidateAndApplyPropertyDescriptor;
var hasRequiredValidateAndApplyPropertyDescriptor;

function requireValidateAndApplyPropertyDescriptor () {
	if (hasRequiredValidateAndApplyPropertyDescriptor) return ValidateAndApplyPropertyDescriptor;
	hasRequiredValidateAndApplyPropertyDescriptor = 1;

	var $TypeError = /*@__PURE__*/ requireType$2();

	var DefineOwnProperty = /*@__PURE__*/ requireDefineOwnProperty();
	var isFullyPopulatedPropertyDescriptor = /*@__PURE__*/ requireIsFullyPopulatedPropertyDescriptor();
	var isPropertyDescriptor = /*@__PURE__*/ requirePropertyDescriptor();

	var FromPropertyDescriptor = /*@__PURE__*/ requireFromPropertyDescriptor();
	var IsAccessorDescriptor = /*@__PURE__*/ requireIsAccessorDescriptor();
	var IsDataDescriptor = /*@__PURE__*/ requireIsDataDescriptor();
	var IsGenericDescriptor = /*@__PURE__*/ requireIsGenericDescriptor();
	var isPropertyKey = /*@__PURE__*/ requireIsPropertyKey();
	var SameValue = /*@__PURE__*/ requireSameValue();
	var Type = /*@__PURE__*/ requireType();

	var isObject = /*@__PURE__*/ requireIsObject();

	// https://262.ecma-international.org/13.0/#sec-validateandapplypropertydescriptor

	// see https://github.com/tc39/ecma262/pull/2468 for ES2022 changes

	// eslint-disable-next-line max-lines-per-function, max-statements
	ValidateAndApplyPropertyDescriptor = function ValidateAndApplyPropertyDescriptor(O, P, extensible, Desc, current) {
		var oType = Type(O);
		if (typeof O !== 'undefined' && !isObject(O)) {
			throw new $TypeError('Assertion failed: O must be undefined or an Object');
		}
		if (!isPropertyKey(P)) {
			throw new $TypeError('Assertion failed: P must be a Property Key');
		}
		if (typeof extensible !== 'boolean') {
			throw new $TypeError('Assertion failed: extensible must be a Boolean');
		}
		if (!isPropertyDescriptor(Desc)) {
			throw new $TypeError('Assertion failed: Desc must be a Property Descriptor');
		}
		if (typeof current !== 'undefined' && !isPropertyDescriptor(current)) {
			throw new $TypeError('Assertion failed: current must be a Property Descriptor, or undefined');
		}

		if (typeof current === 'undefined') { // step 2
			if (!extensible) {
				return false; // step 2.a
			}
			if (oType === 'Undefined') {
				return true; // step 2.b
			}
			if (IsAccessorDescriptor(Desc)) { // step 2.c
				return DefineOwnProperty(
					IsDataDescriptor,
					SameValue,
					FromPropertyDescriptor,
					O,
					P,
					Desc
				);
			}
			// step 2.d
			return DefineOwnProperty(
				IsDataDescriptor,
				SameValue,
				FromPropertyDescriptor,
				O,
				P,
				{
					'[[Configurable]]': !!Desc['[[Configurable]]'],
					'[[Enumerable]]': !!Desc['[[Enumerable]]'],
					'[[Value]]': Desc['[[Value]]'],
					'[[Writable]]': !!Desc['[[Writable]]']
				}
			);
		}

		// 3. Assert: current is a fully populated Property Descriptor.
		if (
			!isFullyPopulatedPropertyDescriptor(
				{
					IsAccessorDescriptor: IsAccessorDescriptor,
					IsDataDescriptor: IsDataDescriptor
				},
				current
			)
		) {
			throw new $TypeError('`current`, when present, must be a fully populated and valid Property Descriptor');
		}

		// 4. If every field in Desc is absent, return true.
		// this can't really match the assertion that it's a Property Descriptor in our JS implementation

		// 5. If current.[[Configurable]] is false, then
		if (!current['[[Configurable]]']) {
			if ('[[Configurable]]' in Desc && Desc['[[Configurable]]']) {
				// step 5.a
				return false;
			}
			if ('[[Enumerable]]' in Desc && !SameValue(Desc['[[Enumerable]]'], current['[[Enumerable]]'])) {
				// step 5.b
				return false;
			}
			if (!IsGenericDescriptor(Desc) && !SameValue(IsAccessorDescriptor(Desc), IsAccessorDescriptor(current))) {
				// step 5.c
				return false;
			}
			if (IsAccessorDescriptor(current)) { // step 5.d
				if ('[[Get]]' in Desc && !SameValue(Desc['[[Get]]'], current['[[Get]]'])) {
					return false;
				}
				if ('[[Set]]' in Desc && !SameValue(Desc['[[Set]]'], current['[[Set]]'])) {
					return false;
				}
			} else if (!current['[[Writable]]']) { // step 5.e
				if ('[[Writable]]' in Desc && Desc['[[Writable]]']) {
					return false;
				}
				if ('[[Value]]' in Desc && !SameValue(Desc['[[Value]]'], current['[[Value]]'])) {
					return false;
				}
			}
		}

		// 6. If O is not undefined, then
		if (oType !== 'Undefined') {
			var configurable;
			var enumerable;
			if (IsDataDescriptor(current) && IsAccessorDescriptor(Desc)) { // step 6.a
				configurable = ('[[Configurable]]' in Desc ? Desc : current)['[[Configurable]]'];
				enumerable = ('[[Enumerable]]' in Desc ? Desc : current)['[[Enumerable]]'];
				// Replace the property named P of object O with an accessor property having [[Configurable]] and [[Enumerable]] attributes as described by current and each other attribute set to its default value.
				return DefineOwnProperty(
					IsDataDescriptor,
					SameValue,
					FromPropertyDescriptor,
					O,
					P,
					{
						'[[Configurable]]': !!configurable,
						'[[Enumerable]]': !!enumerable,
						'[[Get]]': ('[[Get]]' in Desc ? Desc : current)['[[Get]]'],
						'[[Set]]': ('[[Set]]' in Desc ? Desc : current)['[[Set]]']
					}
				);
			} else if (IsAccessorDescriptor(current) && IsDataDescriptor(Desc)) {
				configurable = ('[[Configurable]]' in Desc ? Desc : current)['[[Configurable]]'];
				enumerable = ('[[Enumerable]]' in Desc ? Desc : current)['[[Enumerable]]'];
				// i. Replace the property named P of object O with a data property having [[Configurable]] and [[Enumerable]] attributes as described by current and each other attribute set to its default value.
				return DefineOwnProperty(
					IsDataDescriptor,
					SameValue,
					FromPropertyDescriptor,
					O,
					P,
					{
						'[[Configurable]]': !!configurable,
						'[[Enumerable]]': !!enumerable,
						'[[Value]]': ('[[Value]]' in Desc ? Desc : current)['[[Value]]'],
						'[[Writable]]': !!('[[Writable]]' in Desc ? Desc : current)['[[Writable]]']
					}
				);
			}

			// For each field of Desc that is present, set the corresponding attribute of the property named P of object O to the value of the field.
			return DefineOwnProperty(
				IsDataDescriptor,
				SameValue,
				FromPropertyDescriptor,
				O,
				P,
				Desc
			);
		}

		return true; // step 7
	};
	return ValidateAndApplyPropertyDescriptor;
}

var OrdinaryDefineOwnProperty;
var hasRequiredOrdinaryDefineOwnProperty;

function requireOrdinaryDefineOwnProperty () {
	if (hasRequiredOrdinaryDefineOwnProperty) return OrdinaryDefineOwnProperty;
	hasRequiredOrdinaryDefineOwnProperty = 1;

	var $gOPD = /*@__PURE__*/ requireGopd();
	var $SyntaxError = /*@__PURE__*/ requireSyntax();
	var $TypeError = /*@__PURE__*/ requireType$2();

	var isPropertyDescriptor = /*@__PURE__*/ requirePropertyDescriptor();

	var IsAccessorDescriptor = /*@__PURE__*/ requireIsAccessorDescriptor();
	var IsExtensible = /*@__PURE__*/ requireIsExtensible();
	var isPropertyKey = /*@__PURE__*/ requireIsPropertyKey();
	var ToPropertyDescriptor = /*@__PURE__*/ requireToPropertyDescriptor();
	var SameValue = /*@__PURE__*/ requireSameValue();
	var ValidateAndApplyPropertyDescriptor = /*@__PURE__*/ requireValidateAndApplyPropertyDescriptor();

	var isObject = /*@__PURE__*/ requireIsObject();

	// https://262.ecma-international.org/6.0/#sec-ordinarydefineownproperty

	OrdinaryDefineOwnProperty = function OrdinaryDefineOwnProperty(O, P, Desc) {
		if (!isObject(O)) {
			throw new $TypeError('Assertion failed: O must be an Object');
		}
		if (!isPropertyKey(P)) {
			throw new $TypeError('Assertion failed: P must be a Property Key');
		}
		if (!isPropertyDescriptor(Desc)) {
			throw new $TypeError('Assertion failed: Desc must be a Property Descriptor');
		}
		if (!$gOPD) {
			// ES3/IE 8 fallback
			if (IsAccessorDescriptor(Desc)) {
				throw new $SyntaxError('This environment does not support accessor property descriptors.');
			}
			var creatingNormalDataProperty = !(P in O)
				&& Desc['[[Writable]]']
				&& Desc['[[Enumerable]]']
				&& Desc['[[Configurable]]']
				&& '[[Value]]' in Desc;
			var settingExistingDataProperty = (P in O)
				&& (!('[[Configurable]]' in Desc) || Desc['[[Configurable]]'])
				&& (!('[[Enumerable]]' in Desc) || Desc['[[Enumerable]]'])
				&& (!('[[Writable]]' in Desc) || Desc['[[Writable]]'])
				&& '[[Value]]' in Desc;
			if (creatingNormalDataProperty || settingExistingDataProperty) {
				O[P] = Desc['[[Value]]']; // eslint-disable-line no-param-reassign
				return SameValue(O[P], Desc['[[Value]]']);
			}
			throw new $SyntaxError('This environment does not support defining non-writable, non-enumerable, or non-configurable properties');
		}
		var desc = $gOPD(O, P);
		var current = desc && ToPropertyDescriptor(desc);
		var extensible = IsExtensible(O);
		return ValidateAndApplyPropertyDescriptor(O, P, extensible, Desc, current);
	};
	return OrdinaryDefineOwnProperty;
}

var CreateDataProperty;
var hasRequiredCreateDataProperty;

function requireCreateDataProperty () {
	if (hasRequiredCreateDataProperty) return CreateDataProperty;
	hasRequiredCreateDataProperty = 1;

	var $TypeError = /*@__PURE__*/ requireType$2();

	var isPropertyKey = /*@__PURE__*/ requireIsPropertyKey();
	var OrdinaryDefineOwnProperty = /*@__PURE__*/ requireOrdinaryDefineOwnProperty();

	var isObject = /*@__PURE__*/ requireIsObject();

	// https://262.ecma-international.org/6.0/#sec-createdataproperty

	CreateDataProperty = function CreateDataProperty(O, P, V) {
		if (!isObject(O)) {
			throw new $TypeError('Assertion failed: Type(O) is not Object');
		}
		if (!isPropertyKey(P)) {
			throw new $TypeError('Assertion failed: P is not a Property Key');
		}
		var newDesc = {
			'[[Configurable]]': true,
			'[[Enumerable]]': true,
			'[[Value]]': V,
			'[[Writable]]': true
		};
		return OrdinaryDefineOwnProperty(O, P, newDesc);
	};
	return CreateDataProperty;
}

var RequireObjectCoercible$1;
var hasRequiredRequireObjectCoercible$1;

function requireRequireObjectCoercible$1 () {
	if (hasRequiredRequireObjectCoercible$1) return RequireObjectCoercible$1;
	hasRequiredRequireObjectCoercible$1 = 1;

	var $TypeError = /*@__PURE__*/ requireType$2();

	/** @type {import('./RequireObjectCoercible')} */
	RequireObjectCoercible$1 = function RequireObjectCoercible(value) {
		if (value == null) {
			throw new $TypeError((arguments.length > 0 && arguments[1]) || ('Cannot call method on ' + value));
		}
		return value;
	};
	return RequireObjectCoercible$1;
}

var ToObject;
var hasRequiredToObject;

function requireToObject () {
	if (hasRequiredToObject) return ToObject;
	hasRequiredToObject = 1;

	var $Object = /*@__PURE__*/ requireEsObjectAtoms();
	var RequireObjectCoercible = /*@__PURE__*/ requireRequireObjectCoercible$1();

	/** @type {import('./ToObject')} */
	ToObject = function ToObject(value) {
		RequireObjectCoercible(value);
		return $Object(value);
	};
	return ToObject;
}

var isarray;
var hasRequiredIsarray;

function requireIsarray () {
	if (hasRequiredIsarray) return isarray;
	hasRequiredIsarray = 1;
	var toString = {}.toString;

	isarray = Array.isArray || function (arr) {
	  return toString.call(arr) == '[object Array]';
	};
	return isarray;
}

var safeArrayConcat;
var hasRequiredSafeArrayConcat;

function requireSafeArrayConcat () {
	if (hasRequiredSafeArrayConcat) return safeArrayConcat;
	hasRequiredSafeArrayConcat = 1;

	var GetIntrinsic = /*@__PURE__*/ requireGetIntrinsic();
	var $concat = GetIntrinsic('%Array.prototype.concat%');

	var callBind = requireCallBind();

	var callBound = /*@__PURE__*/ requireCallBound$1();
	var $slice = callBound('Array.prototype.slice');

	var hasSymbols = requireShams$1()();
	var isConcatSpreadable = hasSymbols && Symbol.isConcatSpreadable;

	/** @type {never[]} */ var empty = [];
	var $concatApply = isConcatSpreadable ? callBind.apply($concat, empty) : null;

	// eslint-disable-next-line no-extra-parens
	var isArray = isConcatSpreadable ? /** @type {(value: unknown) => value is unknown[]} */ (requireIsarray()) : null;

	/** @type {import('.')} */
	safeArrayConcat = isConcatSpreadable
		// eslint-disable-next-line no-unused-vars
		? function safeArrayConcat(item) {
			for (var i = 0; i < arguments.length; i += 1) {
				/** @type {typeof item} */ var arg = arguments[i];
				// @ts-expect-error ts(2538) see https://github.com/microsoft/TypeScript/issues/9998#issuecomment-1890787975; works if `const`
				if (arg && typeof arg === 'object' && typeof arg[isConcatSpreadable] === 'boolean') {
					// @ts-expect-error ts(7015) TS doesn't yet support Symbol indexing
					if (!empty[isConcatSpreadable]) {
						// @ts-expect-error ts(7015) TS doesn't yet support Symbol indexing
						empty[isConcatSpreadable] = true;
					}
					// @ts-expect-error ts(2721) ts(18047) not sure why TS can't figure out this can't be null
					var arr = isArray(arg) ? $slice(arg) : [arg];
					// @ts-expect-error ts(7015) TS can't handle expandos on an array
					arr[isConcatSpreadable] = true; // shadow the property. TODO: use [[Define]]
					arguments[i] = arr;
				}
			}
			// @ts-expect-error ts(2345) https://github.com/microsoft/TypeScript/issues/57164 TS doesn't understand that apply can take an arguments object
			return $concatApply(arguments);
		}
		: callBind($concat, empty);
	return safeArrayConcat;
}

var RequireObjectCoercible;
var hasRequiredRequireObjectCoercible;

function requireRequireObjectCoercible () {
	if (hasRequiredRequireObjectCoercible) return RequireObjectCoercible;
	hasRequiredRequireObjectCoercible = 1;

	RequireObjectCoercible = /*@__PURE__*/ requireRequireObjectCoercible$1();
	return RequireObjectCoercible;
}

var callBound;
var hasRequiredCallBound;

function requireCallBound () {
	if (hasRequiredCallBound) return callBound;
	hasRequiredCallBound = 1;

	var GetIntrinsic = /*@__PURE__*/ requireGetIntrinsic();

	var callBind = requireCallBind();

	var $indexOf = callBind(GetIntrinsic('String.prototype.indexOf'));

	callBound = function callBoundIntrinsic(name, allowMissing) {
		var intrinsic = GetIntrinsic(name, !!allowMissing);
		if (typeof intrinsic === 'function' && $indexOf(name, '.prototype.') > -1) {
			return callBind(intrinsic);
		}
		return intrinsic;
	};
	return callBound;
}

var IsArray;
var hasRequiredIsArray;

function requireIsArray () {
	if (hasRequiredIsArray) return IsArray;
	hasRequiredIsArray = 1;

	// https://262.ecma-international.org/6.0/#sec-isarray
	IsArray = /*@__PURE__*/ requireIsArray$1();
	return IsArray;
}

var Call;
var hasRequiredCall;

function requireCall () {
	if (hasRequiredCall) return Call;
	hasRequiredCall = 1;

	var GetIntrinsic = /*@__PURE__*/ requireGetIntrinsic();
	var callBound = /*@__PURE__*/ requireCallBound$1();

	var $TypeError = /*@__PURE__*/ requireType$2();

	var IsArray = /*@__PURE__*/ requireIsArray();

	var $apply = GetIntrinsic('%Reflect.apply%', true) || callBound('Function.prototype.apply');

	// https://262.ecma-international.org/6.0/#sec-call

	Call = function Call(F, V) {
		var argumentsList = arguments.length > 2 ? arguments[2] : [];
		if (!IsArray(argumentsList)) {
			throw new $TypeError('Assertion failed: optional `argumentsList`, if provided, must be a List');
		}
		return $apply(F, V, argumentsList);
	};
	return Call;
}

var util_inspect;
var hasRequiredUtil_inspect;

function requireUtil_inspect () {
	if (hasRequiredUtil_inspect) return util_inspect;
	hasRequiredUtil_inspect = 1;
	util_inspect = require$$0.inspect;
	return util_inspect;
}

var objectInspect;
var hasRequiredObjectInspect;

function requireObjectInspect () {
	if (hasRequiredObjectInspect) return objectInspect;
	hasRequiredObjectInspect = 1;
	var hasMap = typeof Map === 'function' && Map.prototype;
	var mapSizeDescriptor = Object.getOwnPropertyDescriptor && hasMap ? Object.getOwnPropertyDescriptor(Map.prototype, 'size') : null;
	var mapSize = hasMap && mapSizeDescriptor && typeof mapSizeDescriptor.get === 'function' ? mapSizeDescriptor.get : null;
	var mapForEach = hasMap && Map.prototype.forEach;
	var hasSet = typeof Set === 'function' && Set.prototype;
	var setSizeDescriptor = Object.getOwnPropertyDescriptor && hasSet ? Object.getOwnPropertyDescriptor(Set.prototype, 'size') : null;
	var setSize = hasSet && setSizeDescriptor && typeof setSizeDescriptor.get === 'function' ? setSizeDescriptor.get : null;
	var setForEach = hasSet && Set.prototype.forEach;
	var hasWeakMap = typeof WeakMap === 'function' && WeakMap.prototype;
	var weakMapHas = hasWeakMap ? WeakMap.prototype.has : null;
	var hasWeakSet = typeof WeakSet === 'function' && WeakSet.prototype;
	var weakSetHas = hasWeakSet ? WeakSet.prototype.has : null;
	var hasWeakRef = typeof WeakRef === 'function' && WeakRef.prototype;
	var weakRefDeref = hasWeakRef ? WeakRef.prototype.deref : null;
	var booleanValueOf = Boolean.prototype.valueOf;
	var objectToString = Object.prototype.toString;
	var functionToString = Function.prototype.toString;
	var $match = String.prototype.match;
	var $slice = String.prototype.slice;
	var $replace = String.prototype.replace;
	var $toUpperCase = String.prototype.toUpperCase;
	var $toLowerCase = String.prototype.toLowerCase;
	var $test = RegExp.prototype.test;
	var $concat = Array.prototype.concat;
	var $join = Array.prototype.join;
	var $arrSlice = Array.prototype.slice;
	var $floor = Math.floor;
	var bigIntValueOf = typeof BigInt === 'function' ? BigInt.prototype.valueOf : null;
	var gOPS = Object.getOwnPropertySymbols;
	var symToString = typeof Symbol === 'function' && typeof Symbol.iterator === 'symbol' ? Symbol.prototype.toString : null;
	var hasShammedSymbols = typeof Symbol === 'function' && typeof Symbol.iterator === 'object';
	// ie, `has-tostringtag/shams
	var toStringTag = typeof Symbol === 'function' && Symbol.toStringTag && (typeof Symbol.toStringTag === hasShammedSymbols ? 'object' : 'symbol')
	    ? Symbol.toStringTag
	    : null;
	var isEnumerable = Object.prototype.propertyIsEnumerable;

	var gPO = (typeof Reflect === 'function' ? Reflect.getPrototypeOf : Object.getPrototypeOf) || (
	    [].__proto__ === Array.prototype // eslint-disable-line no-proto
	        ? function (O) {
	            return O.__proto__; // eslint-disable-line no-proto
	        }
	        : null
	);

	function addNumericSeparator(num, str) {
	    if (
	        num === Infinity
	        || num === -Infinity
	        || num !== num
	        || (num && num > -1e3 && num < 1000)
	        || $test.call(/e/, str)
	    ) {
	        return str;
	    }
	    var sepRegex = /[0-9](?=(?:[0-9]{3})+(?![0-9]))/g;
	    if (typeof num === 'number') {
	        var int = num < 0 ? -$floor(-num) : $floor(num); // trunc(num)
	        if (int !== num) {
	            var intStr = String(int);
	            var dec = $slice.call(str, intStr.length + 1);
	            return $replace.call(intStr, sepRegex, '$&_') + '.' + $replace.call($replace.call(dec, /([0-9]{3})/g, '$&_'), /_$/, '');
	        }
	    }
	    return $replace.call(str, sepRegex, '$&_');
	}

	var utilInspect = /*@__PURE__*/ requireUtil_inspect();
	var inspectCustom = utilInspect.custom;
	var inspectSymbol = isSymbol(inspectCustom) ? inspectCustom : null;

	var quotes = {
	    __proto__: null,
	    'double': '"',
	    single: "'"
	};
	var quoteREs = {
	    __proto__: null,
	    'double': /(["\\])/g,
	    single: /(['\\])/g
	};

	objectInspect = function inspect_(obj, options, depth, seen) {
	    var opts = options || {};

	    if (has(opts, 'quoteStyle') && !has(quotes, opts.quoteStyle)) {
	        throw new TypeError('option "quoteStyle" must be "single" or "double"');
	    }
	    if (
	        has(opts, 'maxStringLength') && (typeof opts.maxStringLength === 'number'
	            ? opts.maxStringLength < 0 && opts.maxStringLength !== Infinity
	            : opts.maxStringLength !== null
	        )
	    ) {
	        throw new TypeError('option "maxStringLength", if provided, must be a positive integer, Infinity, or `null`');
	    }
	    var customInspect = has(opts, 'customInspect') ? opts.customInspect : true;
	    if (typeof customInspect !== 'boolean' && customInspect !== 'symbol') {
	        throw new TypeError('option "customInspect", if provided, must be `true`, `false`, or `\'symbol\'`');
	    }

	    if (
	        has(opts, 'indent')
	        && opts.indent !== null
	        && opts.indent !== '\t'
	        && !(parseInt(opts.indent, 10) === opts.indent && opts.indent > 0)
	    ) {
	        throw new TypeError('option "indent" must be "\\t", an integer > 0, or `null`');
	    }
	    if (has(opts, 'numericSeparator') && typeof opts.numericSeparator !== 'boolean') {
	        throw new TypeError('option "numericSeparator", if provided, must be `true` or `false`');
	    }
	    var numericSeparator = opts.numericSeparator;

	    if (typeof obj === 'undefined') {
	        return 'undefined';
	    }
	    if (obj === null) {
	        return 'null';
	    }
	    if (typeof obj === 'boolean') {
	        return obj ? 'true' : 'false';
	    }

	    if (typeof obj === 'string') {
	        return inspectString(obj, opts);
	    }
	    if (typeof obj === 'number') {
	        if (obj === 0) {
	            return Infinity / obj > 0 ? '0' : '-0';
	        }
	        var str = String(obj);
	        return numericSeparator ? addNumericSeparator(obj, str) : str;
	    }
	    if (typeof obj === 'bigint') {
	        var bigIntStr = String(obj) + 'n';
	        return numericSeparator ? addNumericSeparator(obj, bigIntStr) : bigIntStr;
	    }

	    var maxDepth = typeof opts.depth === 'undefined' ? 5 : opts.depth;
	    if (typeof depth === 'undefined') { depth = 0; }
	    if (depth >= maxDepth && maxDepth > 0 && typeof obj === 'object') {
	        return isArray(obj) ? '[Array]' : '[Object]';
	    }

	    var indent = getIndent(opts, depth);

	    if (typeof seen === 'undefined') {
	        seen = [];
	    } else if (indexOf(seen, obj) >= 0) {
	        return '[Circular]';
	    }

	    function inspect(value, from, noIndent) {
	        if (from) {
	            seen = $arrSlice.call(seen);
	            seen.push(from);
	        }
	        if (noIndent) {
	            var newOpts = {
	                depth: opts.depth
	            };
	            if (has(opts, 'quoteStyle')) {
	                newOpts.quoteStyle = opts.quoteStyle;
	            }
	            return inspect_(value, newOpts, depth + 1, seen);
	        }
	        return inspect_(value, opts, depth + 1, seen);
	    }

	    if (typeof obj === 'function' && !isRegExp(obj)) { // in older engines, regexes are callable
	        var name = nameOf(obj);
	        var keys = arrObjKeys(obj, inspect);
	        return '[Function' + (name ? ': ' + name : ' (anonymous)') + ']' + (keys.length > 0 ? ' { ' + $join.call(keys, ', ') + ' }' : '');
	    }
	    if (isSymbol(obj)) {
	        var symString = hasShammedSymbols ? $replace.call(String(obj), /^(Symbol\(.*\))_[^)]*$/, '$1') : symToString.call(obj);
	        return typeof obj === 'object' && !hasShammedSymbols ? markBoxed(symString) : symString;
	    }
	    if (isElement(obj)) {
	        var s = '<' + $toLowerCase.call(String(obj.nodeName));
	        var attrs = obj.attributes || [];
	        for (var i = 0; i < attrs.length; i++) {
	            s += ' ' + attrs[i].name + '=' + wrapQuotes(quote(attrs[i].value), 'double', opts);
	        }
	        s += '>';
	        if (obj.childNodes && obj.childNodes.length) { s += '...'; }
	        s += '</' + $toLowerCase.call(String(obj.nodeName)) + '>';
	        return s;
	    }
	    if (isArray(obj)) {
	        if (obj.length === 0) { return '[]'; }
	        var xs = arrObjKeys(obj, inspect);
	        if (indent && !singleLineValues(xs)) {
	            return '[' + indentedJoin(xs, indent) + ']';
	        }
	        return '[ ' + $join.call(xs, ', ') + ' ]';
	    }
	    if (isError(obj)) {
	        var parts = arrObjKeys(obj, inspect);
	        if (!('cause' in Error.prototype) && 'cause' in obj && !isEnumerable.call(obj, 'cause')) {
	            return '{ [' + String(obj) + '] ' + $join.call($concat.call('[cause]: ' + inspect(obj.cause), parts), ', ') + ' }';
	        }
	        if (parts.length === 0) { return '[' + String(obj) + ']'; }
	        return '{ [' + String(obj) + '] ' + $join.call(parts, ', ') + ' }';
	    }
	    if (typeof obj === 'object' && customInspect) {
	        if (inspectSymbol && typeof obj[inspectSymbol] === 'function' && utilInspect) {
	            return utilInspect(obj, { depth: maxDepth - depth });
	        } else if (customInspect !== 'symbol' && typeof obj.inspect === 'function') {
	            return obj.inspect();
	        }
	    }
	    if (isMap(obj)) {
	        var mapParts = [];
	        if (mapForEach) {
	            mapForEach.call(obj, function (value, key) {
	                mapParts.push(inspect(key, obj, true) + ' => ' + inspect(value, obj));
	            });
	        }
	        return collectionOf('Map', mapSize.call(obj), mapParts, indent);
	    }
	    if (isSet(obj)) {
	        var setParts = [];
	        if (setForEach) {
	            setForEach.call(obj, function (value) {
	                setParts.push(inspect(value, obj));
	            });
	        }
	        return collectionOf('Set', setSize.call(obj), setParts, indent);
	    }
	    if (isWeakMap(obj)) {
	        return weakCollectionOf('WeakMap');
	    }
	    if (isWeakSet(obj)) {
	        return weakCollectionOf('WeakSet');
	    }
	    if (isWeakRef(obj)) {
	        return weakCollectionOf('WeakRef');
	    }
	    if (isNumber(obj)) {
	        return markBoxed(inspect(Number(obj)));
	    }
	    if (isBigInt(obj)) {
	        return markBoxed(inspect(bigIntValueOf.call(obj)));
	    }
	    if (isBoolean(obj)) {
	        return markBoxed(booleanValueOf.call(obj));
	    }
	    if (isString(obj)) {
	        return markBoxed(inspect(String(obj)));
	    }
	    // note: in IE 8, sometimes `global !== window` but both are the prototypes of each other
	    /* eslint-env browser */
	    if (typeof window !== 'undefined' && obj === window) {
	        return '{ [object Window] }';
	    }
	    if (
	        (typeof globalThis !== 'undefined' && obj === globalThis)
	        || (typeof commonjsGlobal !== 'undefined' && obj === commonjsGlobal)
	    ) {
	        return '{ [object globalThis] }';
	    }
	    if (!isDate(obj) && !isRegExp(obj)) {
	        var ys = arrObjKeys(obj, inspect);
	        var isPlainObject = gPO ? gPO(obj) === Object.prototype : obj instanceof Object || obj.constructor === Object;
	        var protoTag = obj instanceof Object ? '' : 'null prototype';
	        var stringTag = !isPlainObject && toStringTag && Object(obj) === obj && toStringTag in obj ? $slice.call(toStr(obj), 8, -1) : protoTag ? 'Object' : '';
	        var constructorTag = isPlainObject || typeof obj.constructor !== 'function' ? '' : obj.constructor.name ? obj.constructor.name + ' ' : '';
	        var tag = constructorTag + (stringTag || protoTag ? '[' + $join.call($concat.call([], stringTag || [], protoTag || []), ': ') + '] ' : '');
	        if (ys.length === 0) { return tag + '{}'; }
	        if (indent) {
	            return tag + '{' + indentedJoin(ys, indent) + '}';
	        }
	        return tag + '{ ' + $join.call(ys, ', ') + ' }';
	    }
	    return String(obj);
	};

	function wrapQuotes(s, defaultStyle, opts) {
	    var style = opts.quoteStyle || defaultStyle;
	    var quoteChar = quotes[style];
	    return quoteChar + s + quoteChar;
	}

	function quote(s) {
	    return $replace.call(String(s), /"/g, '&quot;');
	}

	function isArray(obj) { return toStr(obj) === '[object Array]' && (!toStringTag || !(typeof obj === 'object' && toStringTag in obj)); }
	function isDate(obj) { return toStr(obj) === '[object Date]' && (!toStringTag || !(typeof obj === 'object' && toStringTag in obj)); }
	function isRegExp(obj) { return toStr(obj) === '[object RegExp]' && (!toStringTag || !(typeof obj === 'object' && toStringTag in obj)); }
	function isError(obj) { return toStr(obj) === '[object Error]' && (!toStringTag || !(typeof obj === 'object' && toStringTag in obj)); }
	function isString(obj) { return toStr(obj) === '[object String]' && (!toStringTag || !(typeof obj === 'object' && toStringTag in obj)); }
	function isNumber(obj) { return toStr(obj) === '[object Number]' && (!toStringTag || !(typeof obj === 'object' && toStringTag in obj)); }
	function isBoolean(obj) { return toStr(obj) === '[object Boolean]' && (!toStringTag || !(typeof obj === 'object' && toStringTag in obj)); }

	// Symbol and BigInt do have Symbol.toStringTag by spec, so that can't be used to eliminate false positives
	function isSymbol(obj) {
	    if (hasShammedSymbols) {
	        return obj && typeof obj === 'object' && obj instanceof Symbol;
	    }
	    if (typeof obj === 'symbol') {
	        return true;
	    }
	    if (!obj || typeof obj !== 'object' || !symToString) {
	        return false;
	    }
	    try {
	        symToString.call(obj);
	        return true;
	    } catch (e) {}
	    return false;
	}

	function isBigInt(obj) {
	    if (!obj || typeof obj !== 'object' || !bigIntValueOf) {
	        return false;
	    }
	    try {
	        bigIntValueOf.call(obj);
	        return true;
	    } catch (e) {}
	    return false;
	}

	var hasOwn = Object.prototype.hasOwnProperty || function (key) { return key in this; };
	function has(obj, key) {
	    return hasOwn.call(obj, key);
	}

	function toStr(obj) {
	    return objectToString.call(obj);
	}

	function nameOf(f) {
	    if (f.name) { return f.name; }
	    var m = $match.call(functionToString.call(f), /^function\s*([\w$]+)/);
	    if (m) { return m[1]; }
	    return null;
	}

	function indexOf(xs, x) {
	    if (xs.indexOf) { return xs.indexOf(x); }
	    for (var i = 0, l = xs.length; i < l; i++) {
	        if (xs[i] === x) { return i; }
	    }
	    return -1;
	}

	function isMap(x) {
	    if (!mapSize || !x || typeof x !== 'object') {
	        return false;
	    }
	    try {
	        mapSize.call(x);
	        try {
	            setSize.call(x);
	        } catch (s) {
	            return true;
	        }
	        return x instanceof Map; // core-js workaround, pre-v2.5.0
	    } catch (e) {}
	    return false;
	}

	function isWeakMap(x) {
	    if (!weakMapHas || !x || typeof x !== 'object') {
	        return false;
	    }
	    try {
	        weakMapHas.call(x, weakMapHas);
	        try {
	            weakSetHas.call(x, weakSetHas);
	        } catch (s) {
	            return true;
	        }
	        return x instanceof WeakMap; // core-js workaround, pre-v2.5.0
	    } catch (e) {}
	    return false;
	}

	function isWeakRef(x) {
	    if (!weakRefDeref || !x || typeof x !== 'object') {
	        return false;
	    }
	    try {
	        weakRefDeref.call(x);
	        return true;
	    } catch (e) {}
	    return false;
	}

	function isSet(x) {
	    if (!setSize || !x || typeof x !== 'object') {
	        return false;
	    }
	    try {
	        setSize.call(x);
	        try {
	            mapSize.call(x);
	        } catch (m) {
	            return true;
	        }
	        return x instanceof Set; // core-js workaround, pre-v2.5.0
	    } catch (e) {}
	    return false;
	}

	function isWeakSet(x) {
	    if (!weakSetHas || !x || typeof x !== 'object') {
	        return false;
	    }
	    try {
	        weakSetHas.call(x, weakSetHas);
	        try {
	            weakMapHas.call(x, weakMapHas);
	        } catch (s) {
	            return true;
	        }
	        return x instanceof WeakSet; // core-js workaround, pre-v2.5.0
	    } catch (e) {}
	    return false;
	}

	function isElement(x) {
	    if (!x || typeof x !== 'object') { return false; }
	    if (typeof HTMLElement !== 'undefined' && x instanceof HTMLElement) {
	        return true;
	    }
	    return typeof x.nodeName === 'string' && typeof x.getAttribute === 'function';
	}

	function inspectString(str, opts) {
	    if (str.length > opts.maxStringLength) {
	        var remaining = str.length - opts.maxStringLength;
	        var trailer = '... ' + remaining + ' more character' + (remaining > 1 ? 's' : '');
	        return inspectString($slice.call(str, 0, opts.maxStringLength), opts) + trailer;
	    }
	    var quoteRE = quoteREs[opts.quoteStyle || 'single'];
	    quoteRE.lastIndex = 0;
	    // eslint-disable-next-line no-control-regex
	    var s = $replace.call($replace.call(str, quoteRE, '\\$1'), /[\x00-\x1f]/g, lowbyte);
	    return wrapQuotes(s, 'single', opts);
	}

	function lowbyte(c) {
	    var n = c.charCodeAt(0);
	    var x = {
	        8: 'b',
	        9: 't',
	        10: 'n',
	        12: 'f',
	        13: 'r'
	    }[n];
	    if (x) { return '\\' + x; }
	    return '\\x' + (n < 0x10 ? '0' : '') + $toUpperCase.call(n.toString(16));
	}

	function markBoxed(str) {
	    return 'Object(' + str + ')';
	}

	function weakCollectionOf(type) {
	    return type + ' { ? }';
	}

	function collectionOf(type, size, entries, indent) {
	    var joinedEntries = indent ? indentedJoin(entries, indent) : $join.call(entries, ', ');
	    return type + ' (' + size + ') {' + joinedEntries + '}';
	}

	function singleLineValues(xs) {
	    for (var i = 0; i < xs.length; i++) {
	        if (indexOf(xs[i], '\n') >= 0) {
	            return false;
	        }
	    }
	    return true;
	}

	function getIndent(opts, depth) {
	    var baseIndent;
	    if (opts.indent === '\t') {
	        baseIndent = '\t';
	    } else if (typeof opts.indent === 'number' && opts.indent > 0) {
	        baseIndent = $join.call(Array(opts.indent + 1), ' ');
	    } else {
	        return null;
	    }
	    return {
	        base: baseIndent,
	        prev: $join.call(Array(depth + 1), baseIndent)
	    };
	}

	function indentedJoin(xs, indent) {
	    if (xs.length === 0) { return ''; }
	    var lineJoiner = '\n' + indent.prev + indent.base;
	    return lineJoiner + $join.call(xs, ',' + lineJoiner) + '\n' + indent.prev;
	}

	function arrObjKeys(obj, inspect) {
	    var isArr = isArray(obj);
	    var xs = [];
	    if (isArr) {
	        xs.length = obj.length;
	        for (var i = 0; i < obj.length; i++) {
	            xs[i] = has(obj, i) ? inspect(obj[i], obj) : '';
	        }
	    }
	    var syms = typeof gOPS === 'function' ? gOPS(obj) : [];
	    var symMap;
	    if (hasShammedSymbols) {
	        symMap = {};
	        for (var k = 0; k < syms.length; k++) {
	            symMap['$' + syms[k]] = syms[k];
	        }
	    }

	    for (var key in obj) { // eslint-disable-line no-restricted-syntax
	        if (!has(obj, key)) { continue; } // eslint-disable-line no-restricted-syntax, no-continue
	        if (isArr && String(Number(key)) === key && key < obj.length) { continue; } // eslint-disable-line no-restricted-syntax, no-continue
	        if (hasShammedSymbols && symMap['$' + key] instanceof Symbol) {
	            // this is to prevent shammed Symbols, which are stored as strings, from being included in the string key section
	            continue; // eslint-disable-line no-restricted-syntax, no-continue
	        } else if ($test.call(/[^\w$]/, key)) {
	            xs.push(inspect(key, obj) + ': ' + inspect(obj[key], obj));
	        } else {
	            xs.push(key + ': ' + inspect(obj[key], obj));
	        }
	    }
	    if (typeof gOPS === 'function') {
	        for (var j = 0; j < syms.length; j++) {
	            if (isEnumerable.call(obj, syms[j])) {
	                xs.push('[' + inspect(syms[j]) + ']: ' + inspect(obj[syms[j]], obj));
	            }
	        }
	    }
	    return xs;
	}
	return objectInspect;
}

var Get;
var hasRequiredGet;

function requireGet () {
	if (hasRequiredGet) return Get;
	hasRequiredGet = 1;

	var $TypeError = /*@__PURE__*/ requireType$2();

	var inspect = /*@__PURE__*/ requireObjectInspect();

	var isObject = /*@__PURE__*/ requireIsObject();
	var isPropertyKey = /*@__PURE__*/ requireIsPropertyKey();

	// https://262.ecma-international.org/6.0/#sec-get-o-p

	Get = function Get(O, P) {
		// 7.3.1.1
		if (!isObject(O)) {
			throw new $TypeError('Assertion failed: Type(O) is not Object');
		}
		// 7.3.1.2
		if (!isPropertyKey(P)) {
			throw new $TypeError('Assertion failed: P is not a Property Key, got ' + inspect(P));
		}
		// 7.3.1.3
		return O[P];
	};
	return Get;
}

var HasProperty;
var hasRequiredHasProperty;

function requireHasProperty () {
	if (hasRequiredHasProperty) return HasProperty;
	hasRequiredHasProperty = 1;

	var $TypeError = /*@__PURE__*/ requireType$2();

	var isObject = /*@__PURE__*/ requireIsObject();
	var isPropertyKey = /*@__PURE__*/ requireIsPropertyKey();

	// https://262.ecma-international.org/6.0/#sec-hasproperty

	HasProperty = function HasProperty(O, P) {
		if (!isObject(O)) {
			throw new $TypeError('Assertion failed: `O` must be an Object');
		}
		if (!isPropertyKey(P)) {
			throw new $TypeError('Assertion failed: `P` must be a Property Key');
		}
		return P in O;
	};
	return HasProperty;
}

var maxSafeInteger;
var hasRequiredMaxSafeInteger;

function requireMaxSafeInteger () {
	if (hasRequiredMaxSafeInteger) return maxSafeInteger;
	hasRequiredMaxSafeInteger = 1;

	/** @type {import('./maxSafeInteger')} */
	// eslint-disable-next-line no-extra-parens
	maxSafeInteger = /** @type {import('./maxSafeInteger')} */ (Number.MAX_SAFE_INTEGER) || 9007199254740991; // Math.pow(2, 53) - 1;
	return maxSafeInteger;
}

var isPrimitive;
var hasRequiredIsPrimitive;

function requireIsPrimitive () {
	if (hasRequiredIsPrimitive) return isPrimitive;
	hasRequiredIsPrimitive = 1;

	/** @type {(value: unknown) => value is null | undefined | string | symbol | number | boolean | bigint} */
	isPrimitive = function isPrimitive(value) {
		return value === null || (typeof value !== 'function' && typeof value !== 'object');
	};
	return isPrimitive;
}

var shams;
var hasRequiredShams;

function requireShams () {
	if (hasRequiredShams) return shams;
	hasRequiredShams = 1;

	var hasSymbols = requireShams$1();

	/** @type {import('.')} */
	shams = function hasToStringTagShams() {
		return hasSymbols() && !!Symbol.toStringTag;
	};
	return shams;
}

var isDateObject;
var hasRequiredIsDateObject;

function requireIsDateObject () {
	if (hasRequiredIsDateObject) return isDateObject;
	hasRequiredIsDateObject = 1;

	var callBound = /*@__PURE__*/ requireCallBound$1();

	var getDay = callBound('Date.prototype.getDay');
	/** @type {import('.')} */
	var tryDateObject = function tryDateGetDayCall(value) {
		try {
			getDay(value);
			return true;
		} catch (e) {
			return false;
		}
	};

	/** @type {(value: unknown) => string} */
	var toStr = callBound('Object.prototype.toString');
	var dateClass = '[object Date]';
	var hasToStringTag = requireShams()();

	/** @type {import('.')} */
	isDateObject = function isDateObject(value) {
		if (typeof value !== 'object' || value === null) {
			return false;
		}
		return hasToStringTag ? tryDateObject(value) : toStr(value) === dateClass;
	};
	return isDateObject;
}

var isSymbol = {exports: {}};

var isRegex;
var hasRequiredIsRegex;

function requireIsRegex () {
	if (hasRequiredIsRegex) return isRegex;
	hasRequiredIsRegex = 1;

	var callBound = /*@__PURE__*/ requireCallBound$1();
	var hasToStringTag = requireShams()();
	var hasOwn = /*@__PURE__*/ requireHasown();
	var gOPD = /*@__PURE__*/ requireGopd();

	/** @type {import('.')} */
	var fn;

	if (hasToStringTag) {
		/** @type {(receiver: ThisParameterType<typeof RegExp.prototype.exec>, ...args: Parameters<typeof RegExp.prototype.exec>) => ReturnType<typeof RegExp.prototype.exec>} */
		var $exec = callBound('RegExp.prototype.exec');
		/** @type {object} */
		var isRegexMarker = {};

		var throwRegexMarker = function () {
			throw isRegexMarker;
		};
		/** @type {{ toString(): never, valueOf(): never, [Symbol.toPrimitive]?(): never }} */
		var badStringifier = {
			toString: throwRegexMarker,
			valueOf: throwRegexMarker
		};

		if (typeof Symbol.toPrimitive === 'symbol') {
			badStringifier[Symbol.toPrimitive] = throwRegexMarker;
		}

		/** @type {import('.')} */
		// @ts-expect-error TS can't figure out that the $exec call always throws
		// eslint-disable-next-line consistent-return
		fn = function isRegex(value) {
			if (!value || typeof value !== 'object') {
				return false;
			}

			// eslint-disable-next-line no-extra-parens
			var descriptor = /** @type {NonNullable<typeof gOPD>} */ (gOPD)(/** @type {{ lastIndex?: unknown }} */ (value), 'lastIndex');
			var hasLastIndexDataProperty = descriptor && hasOwn(descriptor, 'value');
			if (!hasLastIndexDataProperty) {
				return false;
			}

			try {
				// eslint-disable-next-line no-extra-parens
				$exec(value, /** @type {string} */ (/** @type {unknown} */ (badStringifier)));
			} catch (e) {
				return e === isRegexMarker;
			}
		};
	} else {
		/** @type {(receiver: ThisParameterType<typeof Object.prototype.toString>, ...args: Parameters<typeof Object.prototype.toString>) => ReturnType<typeof Object.prototype.toString>} */
		var $toString = callBound('Object.prototype.toString');
		/** @const @type {'[object RegExp]'} */
		var regexClass = '[object RegExp]';

		/** @type {import('.')} */
		fn = function isRegex(value) {
			// In older browsers, typeof regex incorrectly returns 'function'
			if (!value || (typeof value !== 'object' && typeof value !== 'function')) {
				return false;
			}

			return $toString(value) === regexClass;
		};
	}

	isRegex = fn;
	return isRegex;
}

var safeRegexTest;
var hasRequiredSafeRegexTest;

function requireSafeRegexTest () {
	if (hasRequiredSafeRegexTest) return safeRegexTest;
	hasRequiredSafeRegexTest = 1;

	var callBound = /*@__PURE__*/ requireCallBound$1();
	var isRegex = requireIsRegex();

	var $exec = callBound('RegExp.prototype.exec');
	var $TypeError = /*@__PURE__*/ requireType$2();

	/** @type {import('.')} */
	safeRegexTest = function regexTester(regex) {
		if (!isRegex(regex)) {
			throw new $TypeError('`regex` must be a RegExp');
		}
		return function test(s) {
			return $exec(regex, s) !== null;
		};
	};
	return safeRegexTest;
}

var hasRequiredIsSymbol;

function requireIsSymbol () {
	if (hasRequiredIsSymbol) return isSymbol.exports;
	hasRequiredIsSymbol = 1;

	var callBound = /*@__PURE__*/ requireCallBound$1();
	var $toString = callBound('Object.prototype.toString');
	var hasSymbols = requireHasSymbols()();
	var safeRegexTest = /*@__PURE__*/ requireSafeRegexTest();

	if (hasSymbols) {
		var $symToStr = callBound('Symbol.prototype.toString');
		var isSymString = safeRegexTest(/^Symbol\(.*\)$/);

		/** @type {(value: object) => value is Symbol} */
		var isSymbolObject = function isRealSymbolObject(value) {
			if (typeof value.valueOf() !== 'symbol') {
				return false;
			}
			return isSymString($symToStr(value));
		};

		/** @type {import('.')} */
		isSymbol.exports = function isSymbol(value) {
			if (typeof value === 'symbol') {
				return true;
			}
			if (!value || typeof value !== 'object' || $toString(value) !== '[object Symbol]') {
				return false;
			}
			try {
				return isSymbolObject(value);
			} catch (e) {
				return false;
			}
		};
	} else {
		/** @type {import('.')} */
		isSymbol.exports = function isSymbol(value) {
			// this environment does not support Symbols.
			return false;
		};
	}
	return isSymbol.exports;
}

var es2015;
var hasRequiredEs2015;

function requireEs2015 () {
	if (hasRequiredEs2015) return es2015;
	hasRequiredEs2015 = 1;

	var hasSymbols = typeof Symbol === 'function' && typeof Symbol.iterator === 'symbol';

	var isPrimitive = requireIsPrimitive();
	var isCallable = requireIsCallable$1();
	var isDate = /*@__PURE__*/ requireIsDateObject();
	var isSymbol = requireIsSymbol();

	/** @type {(O: { valueOf?: () => unknown, toString?: () => unknown }, hint: 'number' | 'string' | 'default') => null | undefined | string | symbol | number | boolean | bigint} */
	var ordinaryToPrimitive = function OrdinaryToPrimitive(O, hint) {
		if (typeof O === 'undefined' || O === null) {
			throw new TypeError('Cannot call method on ' + O);
		}
		if (typeof hint !== 'string' || (hint !== 'number' && hint !== 'string')) {
			throw new TypeError('hint must be "string" or "number"');
		}
		/** @type {('toString' | 'valueOf')[]} */
		var methodNames = hint === 'string' ? ['toString', 'valueOf'] : ['valueOf', 'toString'];
		var method, result, i;
		for (i = 0; i < methodNames.length; ++i) {
			method = O[methodNames[i]];
			if (isCallable(method)) {
				result = method.call(O);
				if (isPrimitive(result)) {
					return result;
				}
			}
		}
		throw new TypeError('No default value');
	};

	/** @type {<K extends PropertyKey>(O: Record<K, unknown>, P: K) => Function | undefined} */
	var GetMethod = function GetMethod(O, P) {
		var func = O[P];
		if (func !== null && typeof func !== 'undefined') {
			if (!isCallable(func)) {
				throw new TypeError(func + ' returned for property ' + String(P) + ' of object ' + O + ' is not a function');
			}
			return func;
		}
		return void 0;
	};

	/** @type {import('./es2015')} */
	// http://www.ecma-international.org/ecma-262/6.0/#sec-toprimitive
	es2015 = function ToPrimitive(input) {
		if (isPrimitive(input)) {
			return input;
		}
		/** @type {'default' | 'string' | 'number'} */
		var hint = 'default';
		if (arguments.length > 1) {
			if (arguments[1] === String) {
				hint = 'string';
			} else if (arguments[1] === Number) {
				hint = 'number';
			}
		}

		var exoticToPrim;
		if (hasSymbols) {
			if (Symbol.toPrimitive) {
				// eslint-disable-next-line no-extra-parens
				exoticToPrim = GetMethod(/** @type {Record<PropertyKey, unknown>} */ (input), Symbol.toPrimitive);
			} else if (isSymbol(input)) {
				exoticToPrim = Symbol.prototype.valueOf;
			}
		}
		if (typeof exoticToPrim !== 'undefined') {
			var result = exoticToPrim.call(input, hint);
			if (isPrimitive(result)) {
				return result;
			}
			throw new TypeError('unable to convert exotic object to primitive');
		}
		if (hint === 'default' && (isDate(input) || isSymbol(input))) {
			hint = 'string';
		}
		// eslint-disable-next-line no-extra-parens
		return ordinaryToPrimitive(/** @type {object} */ (input), hint === 'default' ? 'number' : hint);
	};
	return es2015;
}

var ToPrimitive;
var hasRequiredToPrimitive;

function requireToPrimitive () {
	if (hasRequiredToPrimitive) return ToPrimitive;
	hasRequiredToPrimitive = 1;

	var toPrimitive = requireEs2015();

	// https://262.ecma-international.org/6.0/#sec-toprimitive

	ToPrimitive = function ToPrimitive(input) {
		if (arguments.length > 1) {
			return toPrimitive(input, arguments[1]);
		}
		return toPrimitive(input);
	};
	return ToPrimitive;
}

var ToString;
var hasRequiredToString;

function requireToString () {
	if (hasRequiredToString) return ToString;
	hasRequiredToString = 1;

	var GetIntrinsic = /*@__PURE__*/ requireGetIntrinsic();

	var $String = GetIntrinsic('%String%');
	var $TypeError = /*@__PURE__*/ requireType$2();

	// https://262.ecma-international.org/6.0/#sec-tostring

	ToString = function ToString(argument) {
		if (typeof argument === 'symbol') {
			throw new $TypeError('Cannot convert a Symbol value to a string');
		}
		return $String(argument);
	};
	return ToString;
}

var implementation$2;
var hasRequiredImplementation$3;

function requireImplementation$3 () {
	if (hasRequiredImplementation$3) return implementation$2;
	hasRequiredImplementation$3 = 1;

	var RequireObjectCoercible = /*@__PURE__*/ requireRequireObjectCoercible$1();
	var ToString = /*@__PURE__*/ requireToString();
	var callBound = /*@__PURE__*/ requireCallBound$1();
	var $replace = callBound('String.prototype.replace');

	var mvsIsWS = (/^\s$/).test('\u180E');
	/* eslint-disable no-control-regex */
	var leftWhitespace = mvsIsWS
		? /^[\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\u2029\uFEFF]+/
		: /^[\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\u2029\uFEFF]+/;
	var rightWhitespace = mvsIsWS
		? /[\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\u2029\uFEFF]+$/
		: /[\x09\x0A\x0B\x0C\x0D\x20\xA0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028\u2029\uFEFF]+$/;
	/* eslint-enable no-control-regex */

	implementation$2 = function trim() {
		var S = ToString(RequireObjectCoercible(this));
		return $replace($replace(S, leftWhitespace, ''), rightWhitespace, '');
	};
	return implementation$2;
}

var polyfill$3;
var hasRequiredPolyfill$3;

function requirePolyfill$3 () {
	if (hasRequiredPolyfill$3) return polyfill$3;
	hasRequiredPolyfill$3 = 1;

	var implementation = requireImplementation$3();

	var zeroWidthSpace = '\u200b';
	var mongolianVowelSeparator = '\u180E';

	polyfill$3 = function getPolyfill() {
		if (
			String.prototype.trim
			&& zeroWidthSpace.trim() === zeroWidthSpace
			&& mongolianVowelSeparator.trim() === mongolianVowelSeparator
			&& ('_' + mongolianVowelSeparator).trim() === ('_' + mongolianVowelSeparator)
			&& (mongolianVowelSeparator + '_').trim() === (mongolianVowelSeparator + '_')
		) {
			return String.prototype.trim;
		}
		return implementation;
	};
	return polyfill$3;
}

var shim$3;
var hasRequiredShim$3;

function requireShim$3 () {
	if (hasRequiredShim$3) return shim$3;
	hasRequiredShim$3 = 1;

	var supportsDescriptors = /*@__PURE__*/ requireHasPropertyDescriptors()();
	var defineDataProperty = /*@__PURE__*/ requireDefineDataProperty();

	var getPolyfill = requirePolyfill$3();

	shim$3 = function shimStringTrim() {
		var polyfill = getPolyfill();

		if (String.prototype.trim !== polyfill) {
			if (supportsDescriptors) {
				defineDataProperty(String.prototype, 'trim', polyfill, true);
			} else {
				defineDataProperty(String.prototype, 'trim', polyfill);
			}
		}

		return polyfill;
	};
	return shim$3;
}

var string_prototype_trim;
var hasRequiredString_prototype_trim;

function requireString_prototype_trim () {
	if (hasRequiredString_prototype_trim) return string_prototype_trim;
	hasRequiredString_prototype_trim = 1;

	var callBind = requireCallBind();
	var define = requireDefineProperties();
	var RequireObjectCoercible = /*@__PURE__*/ requireRequireObjectCoercible$1();

	var implementation = requireImplementation$3();
	var getPolyfill = requirePolyfill$3();
	var shim = requireShim$3();

	var bound = callBind(getPolyfill());
	var boundMethod = function trim(receiver) {
		RequireObjectCoercible(receiver);
		return bound(receiver);
	};

	define(boundMethod, {
		getPolyfill: getPolyfill,
		implementation: implementation,
		shim: shim
	});

	string_prototype_trim = boundMethod;
	return string_prototype_trim;
}

var StringToNumber;
var hasRequiredStringToNumber;

function requireStringToNumber () {
	if (hasRequiredStringToNumber) return StringToNumber;
	hasRequiredStringToNumber = 1;

	var GetIntrinsic = /*@__PURE__*/ requireGetIntrinsic();

	var $RegExp = GetIntrinsic('%RegExp%');
	var $TypeError = /*@__PURE__*/ requireType$2();
	var $parseInteger = GetIntrinsic('%parseInt%');

	var callBound = /*@__PURE__*/ requireCallBound$1();
	var regexTester = /*@__PURE__*/ requireSafeRegexTest();

	var $strSlice = callBound('String.prototype.slice');
	var isBinary = regexTester(/^0b[01]+$/i);
	var isOctal = regexTester(/^0o[0-7]+$/i);
	var isInvalidHexLiteral = regexTester(/^[-+]0x[0-9a-f]+$/i);
	var nonWS = ['\u0085', '\u200b', '\ufffe'].join('');
	var nonWSregex = new $RegExp('[' + nonWS + ']', 'g');
	var hasNonWS = regexTester(nonWSregex);

	var $trim = requireString_prototype_trim();

	// https://262.ecma-international.org/13.0/#sec-stringtonumber

	StringToNumber = function StringToNumber(argument) {
		if (typeof argument !== 'string') {
			throw new $TypeError('Assertion failed: `argument` is not a String');
		}
		if (isBinary(argument)) {
			return +$parseInteger($strSlice(argument, 2), 2);
		}
		if (isOctal(argument)) {
			return +$parseInteger($strSlice(argument, 2), 8);
		}
		if (hasNonWS(argument) || isInvalidHexLiteral(argument)) {
			return NaN;
		}
		var trimmed = $trim(argument);
		if (trimmed !== argument) {
			return StringToNumber(trimmed);
		}
		return +argument;
	};
	return StringToNumber;
}

var ToNumber;
var hasRequiredToNumber;

function requireToNumber () {
	if (hasRequiredToNumber) return ToNumber;
	hasRequiredToNumber = 1;

	var GetIntrinsic = /*@__PURE__*/ requireGetIntrinsic();

	var $TypeError = /*@__PURE__*/ requireType$2();
	var $Number = GetIntrinsic('%Number%');
	var isPrimitive = /*@__PURE__*/ requireIsPrimitive$1();

	var ToPrimitive = /*@__PURE__*/ requireToPrimitive();
	var StringToNumber = /*@__PURE__*/ requireStringToNumber();

	// https://262.ecma-international.org/13.0/#sec-tonumber

	ToNumber = function ToNumber(argument) {
		var value = isPrimitive(argument) ? argument : ToPrimitive(argument, $Number);
		if (typeof value === 'symbol') {
			throw new $TypeError('Cannot convert a Symbol value to a number');
		}
		if (typeof value === 'bigint') {
			throw new $TypeError('Conversion from \'BigInt\' to \'number\' is not allowed.');
		}
		if (typeof value === 'string') {
			return StringToNumber(value);
		}
		return +value;
	};
	return ToNumber;
}

var floor;
var hasRequiredFloor;

function requireFloor () {
	if (hasRequiredFloor) return floor;
	hasRequiredFloor = 1;

	// var modulo = require('./modulo');
	var $floor = /*@__PURE__*/ requireFloor$1();

	// http://262.ecma-international.org/11.0/#eqn-floor

	floor = function floor(x) {
		// return x - modulo(x, 1);
		if (typeof x === 'bigint') {
			return x;
		}
		return $floor(x);
	};
	return floor;
}

var truncate;
var hasRequiredTruncate;

function requireTruncate () {
	if (hasRequiredTruncate) return truncate;
	hasRequiredTruncate = 1;

	var floor = /*@__PURE__*/ requireFloor();

	var $TypeError = /*@__PURE__*/ requireType$2();

	// https://262.ecma-international.org/14.0/#eqn-truncate

	truncate = function truncate(x) {
		if (typeof x !== 'number' && typeof x !== 'bigint') {
			throw new $TypeError('argument must be a Number or a BigInt');
		}
		var result = x < 0 ? -floor(-x) : floor(x);
		return result === 0 ? 0 : result; // in the spec, these are math values, so we filter out -0 here
	};
	return truncate;
}

var _isFinite;
var hasRequired_isFinite;

function require_isFinite () {
	if (hasRequired_isFinite) return _isFinite;
	hasRequired_isFinite = 1;

	var $isNaN = /*@__PURE__*/ require_isNaN();

	/** @type {import('./isFinite')} */
	_isFinite = function isFinite(x) {
		return (typeof x === 'number' || typeof x === 'bigint')
	        && !$isNaN(x)
	        && x !== Infinity
	        && x !== -Infinity;
	};
	return _isFinite;
}

var ToIntegerOrInfinity;
var hasRequiredToIntegerOrInfinity;

function requireToIntegerOrInfinity () {
	if (hasRequiredToIntegerOrInfinity) return ToIntegerOrInfinity;
	hasRequiredToIntegerOrInfinity = 1;

	var ToNumber = /*@__PURE__*/ requireToNumber();
	var truncate = /*@__PURE__*/ requireTruncate();

	var $isNaN = /*@__PURE__*/ require_isNaN();
	var $isFinite = /*@__PURE__*/ require_isFinite();

	// https://262.ecma-international.org/14.0/#sec-tointegerorinfinity

	ToIntegerOrInfinity = function ToIntegerOrInfinity(value) {
		var number = ToNumber(value);
		if ($isNaN(number) || number === 0) { return 0; }
		if (!$isFinite(number)) { return number; }
		return truncate(number);
	};
	return ToIntegerOrInfinity;
}

var ToLength;
var hasRequiredToLength;

function requireToLength () {
	if (hasRequiredToLength) return ToLength;
	hasRequiredToLength = 1;

	var MAX_SAFE_INTEGER = /*@__PURE__*/ requireMaxSafeInteger();

	var ToIntegerOrInfinity = /*@__PURE__*/ requireToIntegerOrInfinity();

	ToLength = function ToLength(argument) {
		var len = ToIntegerOrInfinity(argument);
		if (len <= 0) { return 0; } // includes converting -0 to +0
		if (len > MAX_SAFE_INTEGER) { return MAX_SAFE_INTEGER; }
		return len;
	};
	return ToLength;
}

var LengthOfArrayLike;
var hasRequiredLengthOfArrayLike;

function requireLengthOfArrayLike () {
	if (hasRequiredLengthOfArrayLike) return LengthOfArrayLike;
	hasRequiredLengthOfArrayLike = 1;

	var $TypeError = /*@__PURE__*/ requireType$2();

	var Get = /*@__PURE__*/ requireGet();
	var ToLength = /*@__PURE__*/ requireToLength();

	var isObject = /*@__PURE__*/ requireIsObject();

	// https://262.ecma-international.org/11.0/#sec-lengthofarraylike

	LengthOfArrayLike = function LengthOfArrayLike(obj) {
		if (!isObject(obj)) {
			throw new $TypeError('Assertion failed: `obj` must be an Object');
		}
		return ToLength(Get(obj, 'length'));
	};

	// TODO: use this all over
	return LengthOfArrayLike;
}

var isString;
var hasRequiredIsString;

function requireIsString () {
	if (hasRequiredIsString) return isString;
	hasRequiredIsString = 1;

	var callBound = /*@__PURE__*/ requireCallBound$1();

	/** @type {(receiver: ThisParameterType<typeof String.prototype.valueOf>, ...args: Parameters<typeof String.prototype.valueOf>) => ReturnType<typeof String.prototype.valueOf>} */
	var $strValueOf = callBound('String.prototype.valueOf');

	/** @type {import('.')} */
	var tryStringObject = function tryStringObject(value) {
		try {
			$strValueOf(value);
			return true;
		} catch (e) {
			return false;
		}
	};
	/** @type {(receiver: ThisParameterType<typeof Object.prototype.toString>, ...args: Parameters<typeof Object.prototype.toString>) => ReturnType<typeof Object.prototype.toString>} */
	var $toString = callBound('Object.prototype.toString');
	var strClass = '[object String]';
	var hasToStringTag = requireShams()();

	/** @type {import('.')} */
	isString = function isString(value) {
		if (typeof value === 'string') {
			return true;
		}
		if (!value || typeof value !== 'object') {
			return false;
		}
		return hasToStringTag ? tryStringObject(value) : $toString(value) === strClass;
	};
	return isString;
}

var implementation$1;
var hasRequiredImplementation$2;

function requireImplementation$2 () {
	if (hasRequiredImplementation$2) return implementation$1;
	hasRequiredImplementation$2 = 1;

	var Call = /*@__PURE__*/ requireCall();
	var Get = /*@__PURE__*/ requireGet();
	var HasProperty = /*@__PURE__*/ requireHasProperty();
	var IsCallable = /*@__PURE__*/ requireIsCallable();
	var LengthOfArrayLike = /*@__PURE__*/ requireLengthOfArrayLike();
	var ToObject = /*@__PURE__*/ requireToObject();
	var ToString = /*@__PURE__*/ requireToString();

	var callBound = requireCallBound();
	var isString = requireIsString();
	var $Object = /*@__PURE__*/ requireEsObjectAtoms();
	var $TypeError = /*@__PURE__*/ requireType$2();

	// Check failure of by-index access of string characters (IE < 9) and failure of `0 in boxedString` (Rhino)
	var boxedString = $Object('a');
	var splitString = boxedString[0] !== 'a' || !(0 in boxedString);

	var strSplit = callBound('%String.prototype.split%');

	implementation$1 = function reduce(callbackfn) {
		var O = ToObject(this);
		var self = splitString && isString(O) ? strSplit(O, '') : O;
		var len = LengthOfArrayLike(self);

		// If no callback function or if callback is not a callable function
		if (!IsCallable(callbackfn)) {
			throw new $TypeError('Array.prototype.reduce callback must be a function');
		}

		if (len === 0 && arguments.length < 2) {
			throw new $TypeError('reduce of empty array with no initial value');
		}

		var k = 0;

		var accumulator;
		var Pk, kPresent;
		if (arguments.length > 1) {
			accumulator = arguments[1];
		} else {
			kPresent = false;
			while (!kPresent && k < len) {
				Pk = ToString(k);
				kPresent = HasProperty(O, Pk);
				if (kPresent) {
					accumulator = Get(O, Pk);
				}
				k += 1;
			}
			if (!kPresent) {
				throw new $TypeError('reduce of empty array with no initial value');
			}
		}

		while (k < len) {
			Pk = ToString(k);
			kPresent = HasProperty(O, Pk);
			if (kPresent) {
				var kValue = Get(O, Pk);
				accumulator = Call(callbackfn, void undefined, [accumulator, kValue, k, O]);
			}
			k += 1;
		}

		return accumulator;
	};
	return implementation$1;
}

var esArrayMethodBoxesProperly;
var hasRequiredEsArrayMethodBoxesProperly;

function requireEsArrayMethodBoxesProperly () {
	if (hasRequiredEsArrayMethodBoxesProperly) return esArrayMethodBoxesProperly;
	hasRequiredEsArrayMethodBoxesProperly = 1;
	esArrayMethodBoxesProperly = function properlyBoxed(method) {
		// Check node 0.6.21 bug where third parameter is not boxed
		var properlyBoxesNonStrict = true;
		var properlyBoxesStrict = true;
		var threwException = false;
		if (typeof method === 'function') {
			try {
				// eslint-disable-next-line max-params
				method.call('f', function (_, __, O) {
					if (typeof O !== 'object') {
						properlyBoxesNonStrict = false;
					}
				});

				method.call(
					[null],
					function () {
						'use strict';

						properlyBoxesStrict = typeof this === 'string'; // eslint-disable-line no-invalid-this
					},
					'x'
				);
			} catch (e) {
				threwException = true;
			}
			return !threwException && properlyBoxesNonStrict && properlyBoxesStrict;
		}
		return false;
	};
	return esArrayMethodBoxesProperly;
}

var polyfill$2;
var hasRequiredPolyfill$2;

function requirePolyfill$2 () {
	if (hasRequiredPolyfill$2) return polyfill$2;
	hasRequiredPolyfill$2 = 1;

	var arrayMethodBoxesProperly = requireEsArrayMethodBoxesProperly();

	var implementation = requireImplementation$2();

	polyfill$2 = function getPolyfill() {
		var method = Array.prototype.reduce;
		return arrayMethodBoxesProperly(method) ? method : implementation;
	};
	return polyfill$2;
}

var shim$2;
var hasRequiredShim$2;

function requireShim$2 () {
	if (hasRequiredShim$2) return shim$2;
	hasRequiredShim$2 = 1;

	var define = requireDefineProperties();
	var getPolyfill = requirePolyfill$2();

	shim$2 = function shimArrayPrototypeReduce() {
		var polyfill = getPolyfill();
		define(
			Array.prototype,
			{ reduce: polyfill },
			{ reduce: function () { return Array.prototype.reduce !== polyfill; } }
		);
		return polyfill;
	};
	return shim$2;
}

var array_prototype_reduce;
var hasRequiredArray_prototype_reduce;

function requireArray_prototype_reduce () {
	if (hasRequiredArray_prototype_reduce) return array_prototype_reduce;
	hasRequiredArray_prototype_reduce = 1;

	var define = requireDefineProperties();
	var RequireObjectCoercible = /*@__PURE__*/ requireRequireObjectCoercible();
	var callBind = requireCallBind();
	var callBound = requireCallBound();

	var implementation = requireImplementation$2();

	var getPolyfill = requirePolyfill$2();
	var polyfill = callBind.apply(getPolyfill());

	var shim = requireShim$2();

	var $slice = callBound('%Array.prototype.slice%');

	// eslint-disable-next-line no-unused-vars
	var boundShim = function reduce(array, callbackfn) {
		RequireObjectCoercible(array);
		return polyfill(array, $slice(arguments, 1));
	};
	define(boundShim, {
		getPolyfill: getPolyfill,
		implementation: implementation,
		shim: shim
	});

	array_prototype_reduce = boundShim;
	return array_prototype_reduce;
}

var implementation;
var hasRequiredImplementation$1;

function requireImplementation$1 () {
	if (hasRequiredImplementation$1) return implementation;
	hasRequiredImplementation$1 = 1;

	var CreateDataProperty = /*@__PURE__*/ requireCreateDataProperty();
	var RequireObjectCoercible = /*@__PURE__*/ requireRequireObjectCoercible$1();
	var ToObject = /*@__PURE__*/ requireToObject();
	var safeConcat = /*@__PURE__*/ requireSafeArrayConcat();
	var reduce = requireArray_prototype_reduce();
	var gOPD = /*@__PURE__*/ requireGopd();
	var $Object = /*@__PURE__*/ requireEsObjectAtoms();

	var $getOwnNames = $Object.getOwnPropertyNames;
	var $getSymbols = $Object.getOwnPropertySymbols;

	var getAll = $getSymbols ? function (obj) {
		return safeConcat($getOwnNames(obj), $getSymbols(obj));
	} : $getOwnNames;

	var isES5 = gOPD && typeof $getOwnNames === 'function';

	implementation = function getOwnPropertyDescriptors(value) {
		RequireObjectCoercible(value);
		if (!isES5) {
			throw new TypeError('getOwnPropertyDescriptors requires Object.getOwnPropertyDescriptor');
		}

		var O = ToObject(value);
		return reduce(
			getAll(O),
			function (acc, key) {
				var descriptor = gOPD(O, key);
				if (typeof descriptor !== 'undefined') {
					CreateDataProperty(acc, key, descriptor);
				}
				return acc;
			},
			{}
		);
	};
	return implementation;
}

var polyfill$1;
var hasRequiredPolyfill$1;

function requirePolyfill$1 () {
	if (hasRequiredPolyfill$1) return polyfill$1;
	hasRequiredPolyfill$1 = 1;

	var implementation = requireImplementation$1();

	polyfill$1 = function getPolyfill() {
		return typeof Object.getOwnPropertyDescriptors === 'function' ? Object.getOwnPropertyDescriptors : implementation;
	};
	return polyfill$1;
}

var shim$1;
var hasRequiredShim$1;

function requireShim$1 () {
	if (hasRequiredShim$1) return shim$1;
	hasRequiredShim$1 = 1;

	var getPolyfill = requirePolyfill$1();
	var define = requireDefineProperties();

	shim$1 = function shimGetOwnPropertyDescriptors() {
		var polyfill = getPolyfill();
		define(
			Object,
			{ getOwnPropertyDescriptors: polyfill },
			{ getOwnPropertyDescriptors: function () { return Object.getOwnPropertyDescriptors !== polyfill; } }
		);
		return polyfill;
	};
	return shim$1;
}

var object_getownpropertydescriptors;
var hasRequiredObject_getownpropertydescriptors;

function requireObject_getownpropertydescriptors () {
	if (hasRequiredObject_getownpropertydescriptors) return object_getownpropertydescriptors;
	hasRequiredObject_getownpropertydescriptors = 1;

	var define = requireDefineProperties();
	var callBind = requireCallBind();

	var implementation = requireImplementation$1();
	var getPolyfill = requirePolyfill$1();
	var shim = requireShim$1();

	var bound = callBind(getPolyfill(), Object);

	define(bound, {
		getPolyfill: getPolyfill,
		implementation: implementation,
		shim: shim
	});

	object_getownpropertydescriptors = bound;
	return object_getownpropertydescriptors;
}

var hasRequiredImplementation;

function requireImplementation () {
	if (hasRequiredImplementation) return implementation$5.exports;
	hasRequiredImplementation = 1;

	var forEach = requireForEach();

	var $Object = /*@__PURE__*/ requireEsObjectAtoms();

	var isES5 = typeof $Object.defineProperty === 'function';

	var gPO = $Object.getPrototypeOf;
	var sPO = $Object.setPrototypeOf;
	// eslint-disable-next-line global-require
	var hasProto = /*@__PURE__*/ requireHasProto()() || (typeof gPO === 'function' && gPO([]) === Array.prototype);

	if (!isES5 || !hasProto) {
		throw new TypeError('util.promisify requires a true ES5+ environment, that also supports `__proto__` and/or `Object.getPrototypeOf`');
	}

	var getOwnPropertyDescriptors = requireObject_getownpropertydescriptors();

	if (typeof Promise !== 'function') {
		throw new TypeError('`Promise` must be globally available for util.promisify to work.');
	}

	var GetIntrinsic = /*@__PURE__*/ requireGetIntrinsic();

	var oDP = $Object.defineProperty;
	var $Promise = GetIntrinsic('%Promise%');
	var $TypeError = TypeError;

	var safeConcat = /*@__PURE__*/ requireSafeArrayConcat();
	var callBind = requireCallBind();
	var callBound = /*@__PURE__*/ requireCallBound$1();
	var defineDataProperty = /*@__PURE__*/ requireDefineDataProperty();

	var $slice = callBound('Array.prototype.slice');

	var hasSymbols = requireShams$1()();

	// eslint-disable-next-line no-restricted-properties
	var kCustomPromisifiedSymbol = hasSymbols ? Symbol['for']('nodejs.util.promisify.custom') : null;
	var kCustomPromisifyArgsSymbol = hasSymbols ? Symbol('customPromisifyArgs') : null;

	implementation$5.exports = function promisify(orig) {
		if (typeof orig !== 'function') {
			var error = new $TypeError('The "original" argument must be of type function');
			error.code = 'ERR_INVALID_ARG_TYPE';
			error.toString = function value() {
				return this.name + '[' + this.code + ']: ' + this.message;
			};
			throw error;
		}

		if (hasSymbols && orig[kCustomPromisifiedSymbol]) {
			var customFunction = orig[kCustomPromisifiedSymbol];
			if (typeof customFunction !== 'function') {
				var customError = $TypeError('The [util.promisify.custom] property must be of type function.');
				customError.code = 'ERR_INVALID_ARG_TYPE';
				customError.toString = function value() {
					return this.name + '[' + this.code + ']: ' + this.message;
				};
				throw customError;
			}
			defineDataProperty(
				customFunction,
				kCustomPromisifiedSymbol,
				customFunction,
				true,
				true,
				null,
				true
			);
			return customFunction;
		}

		// Names to create an object from in case the callback receives multiple
		// arguments, e.g. ['stdout', 'stderr'] for child_process.exec.
		var argumentNames = orig[kCustomPromisifyArgsSymbol];

		var origApply = callBind.apply(orig);

		var promisified = function fn() {
			var args = $slice(arguments);
			var self = this; // eslint-disable-line no-invalid-this
			return new $Promise(function (resolve, reject) {
				origApply(self, safeConcat(args, function (err) {
					var values = arguments.length > 1 ? $slice(arguments, 1) : [];
					if (err) {
						reject(err);
					} else if (typeof argumentNames !== 'undefined' && values.length > 1) {
						var obj = {};
						forEach(argumentNames, function (name, index) {
							obj[name] = values[index];
						});
						resolve(obj);
					} else {
						resolve(values[0]);
					}
				}));
			});
		};

		if (typeof sPO === 'function' && typeof gPO === 'function') {
			sPO(promisified, gPO(orig));
		} else {
			promisified.__proto__ = orig.__proto__; // eslint-disable-line no-proto
		}

		defineDataProperty(promisified, kCustomPromisifiedSymbol, promisified, true, true, null, true);

		var descriptors = getOwnPropertyDescriptors(orig);
		forEach(descriptors, function (k, v) {
			try {
				oDP(promisified, k, v);
			} catch (e) {
				// handle nonconfigurable function properties
			}
		});
		return promisified;
	};

	implementation$5.exports.custom = kCustomPromisifiedSymbol;
	implementation$5.exports.customPromisifyArgs = kCustomPromisifyArgsSymbol;
	return implementation$5.exports;
}

var polyfill;
var hasRequiredPolyfill;

function requirePolyfill () {
	if (hasRequiredPolyfill) return polyfill;
	hasRequiredPolyfill = 1;

	var util = require$$0;
	var implementation = requireImplementation();

	polyfill = function getPolyfill() {
		if (typeof util.promisify === 'function' && util.promisify.custom === implementation.custom) {
			return util.promisify;
		}
		return implementation;
	};
	return polyfill;
}

var shim;
var hasRequiredShim;

function requireShim () {
	if (hasRequiredShim) return shim;
	hasRequiredShim = 1;

	var util = require$$0;
	var getPolyfill = requirePolyfill();

	shim = function shimUtilPromisify() {
		var polyfill = getPolyfill();
		if (polyfill !== util.promisify) {
			Object.defineProperty(util, 'promisify', {
				configurable: true,
				enumerable: true,
				value: polyfill,
				writable: true
			});
		}
		return polyfill;
	};
	return shim;
}

var hasRequiredApp;

function requireApp () {
	if (hasRequiredApp) return app;
	hasRequiredApp = 1;
	Object.defineProperty(app, "__esModule", { value: true });
	const command = requireCommand();
	const common = requireCommon();
	const errHandler = requireErrorhandler();
	const loader = requireLoader();
	function patchPromisify() {
	    // Monkey-patch promisify if we are NodeJS <8.0 or Chakra
	    const nodeVersion = process.version.substr(1);
	    // Chakra has a compatibility bug that causes promisify to not work.
	    // See https://github.com/nodejs/node-chakracore/issues/395
	    const jsEngine = process["jsEngine"] || "v8";
	    const isChakra = jsEngine.indexOf("chakra") >= 0;
	    if (isChakra) {
	        require$$0.promisify = undefined;
	    }
	    if (parseInt(nodeVersion.charAt(0)) < 8 || isChakra) {
	        requireShim()();
	    }
	}
	// Set app root
	common.APP_ROOT = __dirname;
	var Bootstrap;
	(function (Bootstrap) {
	    async function begin() {
	        const cmd = await command.getCommand();
	        common.EXEC_PATH = cmd.execPath;
	        const tfCommand = await loader.load(cmd.execPath, cmd.args);
	        await tfCommand.showBanner();
	        const executor = await tfCommand.ensureInitialized();
	        return executor(cmd);
	    }
	    Bootstrap.begin = begin;
	})(Bootstrap || (Bootstrap = {}));
	patchPromisify();
	Bootstrap.begin()
	    .then(() => { })
	    .catch(reason => {
	    errHandler.errLog(reason);
	});
	
	return app;
}

var hasRequiredTfxCli;

function requireTfxCli () {
	if (hasRequiredTfxCli) return tfxCli$1;
	hasRequiredTfxCli = 1;
	requireApp();
	return tfxCli$1;
}

var tfxCliExports = requireTfxCli();
var tfxCli = /*@__PURE__*/getDefaultExportFromCjs(tfxCliExports);

module.exports = tfxCli;
