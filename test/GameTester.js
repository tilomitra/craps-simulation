var Game = require('../components/Game');

var game = new Game({
  betAmount: 10,
  betArea: 'D'
});

game.on('rolled', function (r) {
  console.log('Game rolled ' + r);
})

game.on('stateChanged', function (newState) {
  console.log('State changed to ' + newState);
})

game.on('pointSet', function (point) {
  console.log('Point set to ' + point);
})

game.on('end', function (data) {
  console.log('Game ended. Game Status: ' + data.status );
  console.log(game.rollHistory);
})


game.roll();
