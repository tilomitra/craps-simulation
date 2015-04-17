var Dice = require('../components/Dice');
var _ = require('underscore');

var dice1 = new Dice();
var dice2 = new Dice();


var rolls = [];

for (var i = 0; i < 1000000; i++) {
  var value = dice1.roll() + dice2.roll();
  rolls.push(value);
}

var counts = _.countBy(rolls, function (num) { return num; });
console.log(counts);
