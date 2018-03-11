'use strict';

// Data
var dataJSON = require('../work/json/script_imdb.json');

// Main
function IMDBParser() {
	var _self = this;

	this.run = function(limit) {
		console.log('IMDB parser initialized');
		var mysql = require('mysql'), SqlString = require('sqlstring');
		var con = mysql.createConnection({
			host: "localhost",
			user: "root",
			password: "123456",
			database: "imdb"
		});
		con.connect();
		/*con.on("enqueue", function hanldeEvent() {
	        console.log("Waiting for connection slot.");
	    });*/

		console.log('Processing ' + dataJSON.length + ' movies.');
		for (var i = 0; i < dataJSON.length; i++) {

			this.downloadScript(dataJSON[i].script_url, dataJSON[i].imdb_key, dataJSON[i].name, dataJSON[i].year, dataJSON[i].genre, function(imdb_key, imdb_name, imdb_year, imdb_genre, data) {

				// Extracting scripts per person
				var actor_script_regex = /b>(.*?)<\/b>(.*?)</g, match, script_array = {};

				while (match = actor_script_regex.exec(data)) {
					if (match[2].replace(/  +/g, ' ') != '') {
						var sql = "INSERT INTO imdb_scripts (imdb_key, imdb_title, year, genre, actor, script) VALUES ('" + imdb_key + "', " + SqlString.escape(imdb_name) + ", " + imdb_year + " , '" + imdb_genre + "', " + SqlString.escape(match[1].trim().substr(0,20)) + ", " + SqlString.escape(match[2].replace(/  +/g, ' ')) + ");";

						con.query(sql, function (err, result) {
							if (err) {
								console.log(sql);
								throw err;
							}
							console.log("'" + imdb_name + "' was saved to database");
						});
					}
				}
			});
		}

		//con.end();
	}

	this.downloadScript = function (url, imdb_key, imdb_name, imdb_year, imdb_genre, cb) {
		var data = "";
		var request = require("http").get(url, function(res) {
			res.on('data', function(chunk) {
			  	data += chunk;
			});

			res.on('end', function() {
		  		console.log("Downloaded '" + imdb_name + "'");
		  		cb(imdb_key, imdb_name, imdb_year, imdb_genre, data.replace(/[^\x20-\x7E]+/g, '').match(/<pre>(.*)<\/pre>/g)[0].replace(/<b>[\s]*?<\/b>/gmi, ''));
			})
		});

		request.on('error', function(e) {
			console.log("Got error: " + e.message);
		});
	}
}

module.exports = IMDBParser;