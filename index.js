const express = require('express');
const app = express();

app.use(express.static(__dirname + '/public'));

app.get('/', function (req, res, next) {
	var options = {
		root: __dirname + '/public/',
		dotfiles: 'deny',
		headers: {
			'x-timestamp': Date.now(),
			'x-sent': true
		}
	};

	res.sendFile('html/index.html', options);
});

app.post('/submit_form', function (req, res) {
	var post_data = {};
	var self = this;

	req.on('data', function(data) {
		data = data.toString();
		data = data.split('&');
		for (var i = 0; i < data.length; i++) {
			var _data = data[i].split("=");
			post_data[_data[0]] = _data[1];
		}

		// Invoke Watson PI
		var PersonalityInsightsV3 = require('watson-developer-cloud/personality-insights/v3');
		var personality_insights = new PersonalityInsightsV3({
			username: '2980fe02-3a28-4abe-bd69-b9ffc3324e32',
			password: 'ipfO7o4UB0lr',
			version_date: '2016-10-20'
		});

		var params = {
			text: post_data.data,
			consumption_preferences: false,
			raw_scores: true
		};

		personality_insights.profile(params, function(error, response) {
			if (error) {
				res.send(JSON.stringify({
					error_code: 400,
					error_message: 'NOT_ENOUGH_WORDS'
				}));
			} else {
				var values = {};

				for (var personality in response['personality']) {
					values[response['personality'][personality]['trait_id']] = response['personality'][personality]['percentile'];
      		 	}
			}

			/*var values = {
				big5_openness: 0.3327618501153857,
				big5_conscientiousness: 0.5711887008998572,
				big5_extraversion: 0.19383105734066414,
				big5_agreeableness: 0.12500303471329938,
				big5_neuroticism: 0.6298084055781408
			};*/

			// MySQL
			var mysql = require('mysql');
			var con;

			if (process.env.VCAP_SERVICES) {
 				var services = JSON.parse(process.env.VCAP_SERVICES);

				for (var svcName in services) {
					if (svcName.match(/^cleardb/)) {
						var mysqlCreds = services[svcName][0]['credentials'];
						con = mysql.createConnection({
							host: mysqlCreds.hostname,
							port: mysqlCreds.port,
							user: mysqlCreds.username,
							password: mysqlCreds.password,
							database: mysqlCreds.name,
							multipleStatements: true
						}, function(err, connection) {
							if (err) {
								throw err;
							}
							console.log('Connected to MySQL database');
						});

						console.log('MySQL host: ' + mysqlCreds.host + ':' + mysqlCreds.port);
						console.log('MySQL user: ' + mysqlCreds.user);
						console.log('MySQL database: ' + mysqlCreds.name);
					}
				}
			} else {
				con = mysql.createConnection({
					host: "localhost",
					port: "3306",
					user: "root",
					password: "123456",
					database: "imdb",
					multipleStatements: true
				});
			}

			var threshold = 0.1;
			var sql = "SELECT imdb_title, actor, year, SQRT(POW(big5_openness_percentile-" + values['big5_openness'] + ", 2)) + SQRT(POW(big5_conscientiousness_percentile-" + values['big5_conscientiousness'] + ", 2)) + SQRT(POW(big5_extraversion_percentile-" + values['big5_extraversion'] + ", 2)) + SQRT(POW(big5_agreeableness_percentile-" + values['big5_agreeableness'] + ", 2)) + SQRT(POW(big5_neuroticism_percentile-" + values['big5_neuroticism'] + ", 2)) diff FROM char_trait WHERE (" + (values['big5_openness']-threshold/2) + " < big5_openness_percentile AND big5_openness_percentile < " + (values['big5_openness']+threshold/2) + ") OR (" + (values['big5_conscientiousness']-threshold/2) + " < big5_conscientiousness_percentile AND big5_conscientiousness_percentile < " + (values['big5_conscientiousness']+threshold/2) + ") OR (" + (values['big5_extraversion']-threshold/2) + " < big5_extraversion_percentile AND big5_extraversion_percentile < " + (values['big5_extraversion']+threshold/2) + ") OR (" + (values['big5_agreeableness']-threshold/2) + " < big5_agreeableness_percentile AND big5_agreeableness_percentile < " + (values['big5_agreeableness']+threshold/2) + ") OR (" + (values['big5_neuroticism']-threshold/2) + " < big5_neuroticism_percentile AND big5_neuroticism_percentile < " + (values['big5_neuroticism']+threshold/2) + ") ORDER BY diff ASC LIMIT 1;";

			con.query(sql, function (err, rows) {
				if (err) {
					console.log(sql);
					throw err;
				}

				res.send(JSON.stringify({
					error_code: 200,
					error_message: 'SUCCESS',
					result: rows
				}));
			});
		});
    });
})

var port = process.env.PORT || 3000;

app.listen(port, function () {
	console.log('Example app listening on port ' + port + '!')
});