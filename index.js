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
var elastical = require('elastical');

var dwcareader = function(config) {
  
	var me = this;
	var errors = {
		100: "There was no url specified",
		101: "There was no destination specified",
		102: "No meta.xml file was found for the schema."
	}
	this.archive = null;
	this.schema = null;

	function getError(id) {
		return {
			errorNo: id,
			msg: errors[id]
		}
	}
  /*
    This getArchive function works, but it is printing a ton of stuff
    that I don't know what it is. Also, the .zip file is not being saved,
    is it getting deleted?
  */
	this.getArchive = function (url, destination, options, callback) {
		if (url == '' || url == null) {
			callback(false, 100);
		}
		if (destination == '' || destination == null || !fs.existsSync(destination)) {
			callback(false, 101);
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
		this.archive = fullDestination;
		needle.get(url, callback).pipe(fs.createWriteStream(fullDestination));
	}
  
	this.setArchive = function (location, callback) {
    try {
      if(location == "" || location == null) {
        callback(false, 101);
      }
      this.archive = location;
    } catch(err) {
      console.log("Error:", err);    
    }
	}
  
	this.getSchema = function (callback) {
		if (me.schema == null) {
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
        callback(false, 102);
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
		var zip = new AdmZip(this.archive);
		var list = zip.getEntries(); 
		var occurenceFile = me.getSchema(function(passed, err){
        if(passed) {
          console.log('Error:', err);
          exit(1);
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
		var time = new Date().getTime();
		var connectStr = 'mongodb://' + options.host + ':' + options.port + '/' + options.db;
		MongoClient.connect(connectStr, function(err, db) {
			if (err) {
				callback(true, err);
			} else {
				var collection = db.collection(options.table);
				console.log("Connected to Database:", options.host, options.port, options.db);
				console.log("Connected to Table:", options.table);
				me.on('record', function(data, index) {
					// We need to make a clone of this since this data is changing I think too fast and causing references to break.
					var data = util._extend({}, data);
					collection.insert(data, {w:1}, function(err, objects) {});
				})
				.on('csvEnd', function(count) {
					db.close();
					var res = {
						count: count,
						import_time: (new Date().getTime() - time) / 1000 // in seconds
					}
					callback(false, res);
				});

				me.readData(); // Start to read the data now that the listeners are ready.
			}
		});
	}
  
  function checkInDb(res) {
    if(res.params != '') {
      return true;
    }
  }
  
  this.import2elasticsearch = function(options, callback) {
    var time = new Date().getTime();
    var serverOptions = {
      host : options.host,
      port : options.port,
      secure: options.secure
    }
    
    var elasticSearchClient = new ElasticSearchClient(options);
//    var client = new elastical.Client(options.host, {port: options.port});
    console.log("Connected to Database:", options.host, options.port);
    
    me.on('record', function(data, index) {
      var data = util._extend({}, data);
      var indb = false;
      elasticSearchClient.get(options.indexName, options.typeName,0,//options.id(data), 
      function(err, res) {
        if(!res.exists || res.exists == false) {
          elasticSearchClient.index(options.indexName, options.typeName, data, options.id(data))
        } else {
          elasticSearchClient.update(options.indexName, options.typeName, options.id(data), data)
        }
      });
    })
    .on('csvEnd', function(count){
      var res = {
        count: count,
        import_time: (new Date().getTime()-time)/1000 // in seconds
      }
      callback(false, res);
    })
    
    me.readData(); // Start to read the data now that the listeners are ready.

  }
  
  /*function extractArchive() {
    // Cover for errors in archive
    var extensionType = mime.extension(this.archive);
    switch(extensionType) {
      case "application/zip":
        
        break;
      case "application/x-tar":
        
        break;
    }
  } */
};

util.inherits(dwcareader, EventEmitter);
module.exports = dwcareader;