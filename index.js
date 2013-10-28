var fs = require('fs');
var needle = require('needle');
var xml2json = require("node-xml2json");
var path = require('path');
var mime = require('mime');
var AdmZip = require('adm-zip');
var csv = require('csv');
var EventEmitter = require('events').EventEmitter;
var util = require('util');  
var url = require('url');
var MongoClient = require('mongodb').MongoClient;
var ElasticSearchClient = require('elasticsearchclient');

var dwcareader = function(config) {
  
	var me = this;
	var errors = {
		100: "There was no url specified.",
		101: "There was no destination specified.",
		102: "No meta.xml file was found for the schema.",
    103: "No host was specified in the options parameter.",
    104: "No port was specified in the options parameter.",
    105: "The archive was not set for this dwcareader."
	}
	this.archive = null;
	this.schema = null;
  // If there is a new path or file folder, set this to true, so that the new schema can be found
  var newFile = false;

	function getError(id) {
		return {
			errorNo: id,
			msg: errors[id]
		}
	}

	this.getArchive = function (url, destination, options, callback) {
    newFile = true;
		if (url == '' || url == null) {
			callback(true, getError(100));
		}
		if (destination == '' || destination == null || !fs.existsSync(destination)) {
			callback(true, getError(101));
		}
		var filename = clone(url);
		//this removes the anchor at the end, if there is one
		filename = filename.substring(0, (filename.indexOf("#") == -1) 
		  ? filename.length : filename.indexOf("#"));
		//this removes the query after the file name, if there is one
		filename = filename.substring(0, (filename.indexOf("?") == -1) 
		  ? filename.length : filename.indexOf("?"));
		//this removes everything before the last slash in the path
		filename = filename.substring(filename.lastIndexOf("/") + 1, filename.length);

		// TODO try and get the filename or possibly from the header if it is a dynamic url like given in skype
		var fullDestination = path.join(destination, filename);
    if(this.archive == fullDestination && options.overwrite != true) {
      callback(true, "Warning: file already in system and options.overwrite not set to true, so file was not downloaded.");
    } else {
  		this.archive = fullDestination;
      try {
  		  needle.get(url, callback).pipe(fs.createWriteStream(fullDestination));
      } catch(err) {
        callback(true, err);
      }
    }
	}
  
	this.setArchive = function (location, callback) {
    newFile = true;
    try {
      if(location == "" || location == null) {
        callback(true, getError(101));
      }
      this.archive = location;
    } catch(err) {
      callback(true, err);
    }
    callback(false, '');
	}
  
	this.getSchema = function (callback) {
		if (me.schema == null || newFile) {
      newFile = false;
			var zip = new AdmZip(this.archive);
			var list = zip.getEntries();
			list.forEach(function(file) {
				if(file.name == "meta.xml") {
					var metaXml = file.getData().toString("utf8");
					me.schema = xml2json.parser(metaXml);
				}
			});
      if(me.schema == null) {
        console.log("the schema is null");
        callback(true, getError(102));
        process.exit(1);
      }
		}
		return me.schema;
	}
  
	// Place holder for function to be used by developer to add custom transformations
	this.transform = function(data) {
		return data;
	}
  
	function mapData(data, index) {
		var tmpData = {};
		var terms = me.schema.archive.core.field;
		terms.forEach(function(term) {
			var tmpTerm = url.parse(term.term).pathname.split("/");
			tmpTerm = tmpTerm[tmpTerm.length - 1];
			if (typeof term.default != "undefined") {
				tmpData[tmpTerm] = term.default;
			} else {
				tmpData[tmpTerm] = data[term.index];
        if(tmpData[tmpTerm] == '') {
          tmpData[tmpTerm] = null;
        }
			}
		});
		tmpData = me.transform(tmpData);
		return tmpData;
	}

	this.readData = function () {
    try {
		var zip = new AdmZip(this.archive);
    } catch(err) {
      console.log("This zip file is not correctly formated or is in the wrong place.");
    }
		var list = zip.getEntries();
    if(this.archive == null) {
      console.log(getError(105));
      process.exit(1);
    }
		var occurenceFile = me.getSchema(function(passed, err){
        if(!passed) {
          console.log('Error:', err);
          process.exit(1);
        }
      }).archive.core.files.location;
		var firstFlag = true;
		list.forEach(function(file) {
			if(file.name == occurenceFile) {
				var data = file.getData();
				var tmpCsv = new csv()
					.from.string(data)
					.transform(mapData)
					.on("record", function(row, index) {
						if (firstFlag && me.schema.archive.core.ignoreheaderlines) {
							firstFlag = false;
						} else {
							me.emit('record', row, index);
						}
					})
					.on('end', function(count) {
						me.emit('csvEnd', count);
					});
			}
		});
	}

  function clone(a) {
     return JSON.parse(JSON.stringify(a));
  }
	
	this.import2mongo = function(options, callback) {
    options.host = (options.host) ? options.host : '';
    options.port = (options.port) ? options.port : '';

    if(options.host == '') {
      callback(true, getError(103));
      process.exit(1);
    }
    if(options.port == '') {
      callback(true, getError(104));
      process.exit(1);
    }
		var counter = 0;
    var ceiling = -1;
    var startTime = new Date().getTime();
    var results = {};
    
		var connectStr = 'mongodb://' + options.host + ':' + options.port + '/' + options.db;
		MongoClient.connect(connectStr, function(err, db) {
			if (err) {
				callback(true, err);
        process.exit(1);
			} else {
				var collection = db.collection(options.table);
				console.log("Connected to Database:", options.host, options.port, options.db);
				console.log("Connected to Table:", options.table);
				me.on('record', function(data, index) {
          counter++;
					// We need to make a clone of this since this data is changing I think too fast and causing references to break.
					var data = util._extend({}, data);
					collection.update({}, data, {upsert: true}, function(err, objects) {
  				  if(err) {
    			    console.log(err.message);
              process.exit(1);
  				  } 
					});
          if(counter >= ceiling && ceiling > 0) {
            results.total_time = (new Date().getTime() - startTime)/1000;
            db.close();
            callback(false, results);
          }
				})
				.on('csvEnd', function(count) {
          results.count = count;
          results.read_time = (new Date().getTime() - startTime)/1000; // in seconds
					ceiling = count-1;
          if(counter == ceiling) {
            results.total_time = (new Date().getTime() - startTime)/1000;
            db.close();
            callback(false, results);
          }
          
				});
				me.readData(); // Start to read the data now that the listeners are ready.
			}
		});
	}
  
  this.import2elasticsearch = function(options, callback) {
    options.host = (options.host) ? options.host : '';
    options.port = (options.port) ? options.port : '';

    if(options.host == '') {
      callback(true, getError(103));
      process.exit(1);
    }
    if(options.port == '') {
      callback(true, getError(104));
      process.exit(1);
    }
    var counter = 0;
    var ceiling = -1;
    var startTime = new Date().getTime();
    try{
      var elasticSearchClient = new ElasticSearchClient(options);
      console.log("Connected to Database:", options.host, options.port);
    } catch(err) {
      console.log(err);
    }
    var results = {};
    
    me.on('record', function(data, index) {
      var data = util._extend({}, data);
      var upsertOptions = {"upsert" : {"counter" : 1}};
      data = {
        "doc" : data,
        upsert : data
      }
      elasticSearchClient.update(options.db, options.table, options.id(data.doc), data,
      function(err, res) {
        counter++;
        if(counter >= ceiling && ceiling > 0) {
          results.total_time = (new Date().getTime() - startTime)/1000;
          callback(false, results);
        }
      });
    })
    .on('csvEnd', function(count){
      ceiling = count-1;
      results.count = count;
      results.read_time = (new Date().getTime() - startTime)/1000; // in seconds
      if(counter == ceiling) {
        results.total_time = (new Date().getTime() - startTime)/1000;
        db.close();
        callback(false, results);
      }
      //callback(false, res);

    })
    
    me.readData(); // Start to read the data now that the listeners are ready.

  }
};

util.inherits(dwcareader, EventEmitter);
module.exports = dwcareader;