NodeList.prototype.toArray = function () {
	return [...this];
}
HTMLCollection.prototype.toArray = function () {
	return [...this];
}

/**
 *
 * @param {int} steps rotation steps (+ve for right rotations, -ve for left)
 */
Array.prototype.rotate = function (steps) {
	steps = steps % this.length;

	if (!steps) return this; // no rotations, just return the same thing

	if (steps > 0) steps = steps - this.length; // xxxx|xx -- [steps = 2 (right rotation)] == [steps = -4 (left rotation) ==> steps - length]

	steps *= -1;
	const left = this.slice(0, steps);
	const right = this.slice(steps, this.length);

	return [...right, ...left];
}

String.prototype.fuzzyCompare = function (possible) {
	const match = this.match(new RegExp(possible, 'i'));
	return match ? Array.from({ length: possible.length }, (_, i) => match.index + i) : null;
}
String.prototype.replaceAt = function(index, replacement) {
	return this.substring(0, index) + replacement + this.substring(index + 1);
}
String.prototype.minify = function () {
	return this.replace(/\t|\n/g, '').replace(/\s{2,}/g, ' ').replace(/<script/gi, '&lt;script');
}

// JSON
JSON.tryParse = function (jsonStr, defaultValue) {
	try {
		return JSON.parse(jsonStr);

	} catch {
		return defaultValue !== undefined ? defaultValue : []; // on parse failure, return the default value or an empty array
	}
}
JSON.copy = function (obj) {
	return JSON.parse(JSON.stringify(obj));
}
JSON.isValid = function (jsonStr) {
	try { return JSON.parse(jsonStr); }
	catch { return false; }
}

Math.randomInt = function (min, max) {
	return Math.floor(Math.random() * (max - min)) + min;
}

// thanks https://codepen.io/rantrix/pen/dpZLXX
function easeIO(from, to, duration, callback) {

	const start = new Date().getTime();

	let animation;
	animation = setInterval(() => {
		const time = new Date().getTime() - start;
		const val = easeInOutQuart(time, from, to - from, duration);
		callback(val);

		if (time >= duration) clearInterval(animation);

	}, 1000 / 60);

	function easeInOutQuart(t, b, c, d) {
		if ((t /= d / 2) < 1) return c / 2 * t * t * t * t + b;
		return -c / 2 * ((t -= 2) * t * t * t - 2) + b;
	}

	return animation;
}

// "when"
class WhenExpression {

	#result;

	constructor(param) {
		this.param = param;
	}

	is = (val, callback) => {
		if (this.#result != undefined) return this;

		if (this.param == val) this.#result = callback();
		return this;
	}

	val = () => this.#result;
}

function when(param) {
	return new WhenExpression(param);
}
