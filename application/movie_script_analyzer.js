'use strict';

// Main
function MovieScriptAnalyzer() {
	var _self = this;
	var mysql = require('mysql');
	var con = mysql.createConnection({
		host: "localhost",
		user: "root",
		password: "123456",
		database: "imdb",
		multipleStatements: true
	});

	this.run = function(limit) {
		console.log('Movie Script Analyzer initialized');
		con.connect();

		var sql = "SET SESSION group_concat_max_len = 1000000;";

		con.query(sql, function (err, rows) {
			if (err) {
				console.log(sql);
				throw err;
			}

			_self.loadScripts();
		});

		//con.end();
	}

	this.loadScripts = function () {
		var sql = "SELECT imdb_key, actor, GROUP_CONCAT(script ORDER BY id ASC SEPARATOR ' ') script FROM imdb_scripts WHERE imdb_key IN ('tt1190080', 'tt0499549', 'tt0800320', 'tt1046173', 'tt1375666', 'tt1409024', 'tt1276104', 'tt1979320', 'tt1483013', 'tt1345836', 'tt0493464', 'tt0800369', 'tt1401152',  'tt1104001') GROUP BY imdb_key , actor HAVING COUNT(*) > 20;"; // 2017.08.15 - 690

		con.query(sql, function (err, rows) {
			if (err) {
				console.log(sql);
				throw err;
			}

			for (var row in rows) {
				console.log("'" + rows[row].imdb_key + "' was loaded");
				_self.analyzeScript(rows[row].imdb_key, rows[row].actor, rows[row].script);
			}
		});
	}

	this.analyzeScript = function (imdb_key, actor, script) {
		var PersonalityInsightsV3 = require('watson-developer-cloud/personality-insights/v3');
		var personality_insights = new PersonalityInsightsV3({
			username: '2980fe02-3a28-4abe-bd69-b9ffc3324e32',
			password: 'ipfO7o4UB0lr',
			version_date: '2016-10-20'
		});

		var params = {
			text: script,
			consumption_preferences: false,
			raw_scores: true
		};

		personality_insights.profile(params, function(error, response) {
			if (error) {
				console.log('Error:', error);
			} else {
				var values = [];

				for (var personality in response['personality']) {
					values.push([imdb_key, actor, response['personality'][personality]['trait_id'], response['personality'][personality]['percentile'], response['personality'][personality]['raw_score']]);
					//console.log('Main trait: ' + response['personality'][personality]['trait_id']);
					//console.log('Main trait: ' + response['personality'][personality]['name']);

					for (var subpersonality in response['personality'][personality]['children']) {
						values.push([imdb_key, actor, response['personality'][personality]['children'][subpersonality]['trait_id'], response['personality'][personality]['children'][subpersonality]['percentile'], response['personality'][personality]['children'][subpersonality]['raw_score']]);
						//console.log('Sub trait: ' + response['personality'][personality]['children'][subpersonality]['trait_id']);
						//console.log('Sub trait: ' + response['personality'][personality]['children'][subpersonality]['name']);
					}
      		 	}

      		 	// Write to DB
				var sql = "INSERT INTO imdb_traits (imdb_key, actor, trait_id, percentile, raw) VALUES ?";

				con.query(sql, [values], function(err) {
				    if (err) throw err;
				});
			}
		});
	}
}

module.exports = MovieScriptAnalyzer;