var Hunter = require('./components/Hunter');
var async = require('async');
var _     = require('underscore');
var AsciiTable = require('ascii-table')
var hunterArr = [];


var TOTAL = 5000;

///-----  SINGLE HUNTER


// var singleHunter = new Hunter({
//   mode: 'T',
//   pattern: 'S',
//   betArea: 'P',
//   betLevel: 1,
//   bankroll: 180,
//   goal: 20,
//   maxRounds: 64
// });

// singleHunter.hunt();




//// --- MULTIPLE HUNTERS

for (var i = 0; i < TOTAL; i++) {

  hunterArr.push(function (callback) {
    var hunter = new Hunter({
      mode: 'T',
      pattern: 'S',
      betArea: 'P',
      betLevel: 1,
      bankroll: 220,
      stopGap: 180,
      goal: 20,
      deviation: 0.2,
      maxRounds: 64
    });

    hunter.on('end', function (e) {
      callback(null, e);
    });

    process.nextTick(function () {
      hunter.hunt();
    });


  });
}


async.series(hunterArr, function (err, results) {

  if (err) {
    throw(err);
  }
  else {
    var groups = _.groupBy(results, function(e){ return e.status; });

    var netGain = 0;
    var netP = 0;
    var netD = 0;
    var netWRoll = 0;
    var netLRoll = 0;

    _.each(groups, function (value, key, list) {
      var statstable = new AsciiTable(key);
      var change = 0;
      _.each(value, function (v) {
        change += v.lastState.balance;

        // _.each(v.history, function (h) {
        //   if (h.decision === 'P') netP++;
        //   else if (h.decision === 'D') netD++;

        //   if (h.result === 'W') netWRoll++;
        //   else if (h.result === 'L') netLRoll++;

        // });
      });
      statstable.setHeading('Number', 'Total Change');
      statstable.addRow(value.length, change);
      console.log(statstable.toString());
      netGain += change;
    });

    var pcttable = new AsciiTable('Percentages');
    pcttable.setHeading(
      'Win %',
      'Lose %',
      'Max Round %',
      // '% P',
      // '% D',
      // '% Win Rolls',
      // '% Lose Rolls',
      'Net $$',
      '$/Game'
    );
    pcttable.addRow(
      (groups['win']) ? groups['win'].length/TOTAL * 100 : 0,
      (groups['lose']) ? groups['lose'].length/TOTAL * 100 : 0,
      (groups['max-round-reached']) ? groups['max-round-reached'].length/TOTAL * 100 : 0,
      // (100*netP)/(netP+netD),
      // (100*netD)/(netP+netD),
      // (100*netWRoll)/(netWRoll+netLRoll),
      // (100*netLRoll)/(netWRoll+netLRoll),
      netGain,
      netGain/TOTAL
    );
    console.log(pcttable.toString());


  }
});
