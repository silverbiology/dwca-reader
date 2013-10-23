## dwca-reader Node.JS Library
===========
## Install

To install the most recent version, you have to copy this version (no npm install available yet).

## Introduction

This is a Node.JS library to read Darwin Core Archives and load into MongoDB, ElasticSearch, or custom stream.
The following is a simple example of downloading a file and uploading it into mongo.

'''javascript
  var dwcareader = require("../index.js");
  var dr = new dwcareader();

  // Download the following file, and send it to the next folder
  dr.getArchive('http://images.cyberfloralouisiana.com/archives/dwca-no/dwca-no.zip', 
  "/Users/jamesbrown/Documents/Xentity/temp", 
  null, 
  function(error, response, body) {
    if(error) {
      console.log(error, response);
	  }
  });

  dr.setArchive("/Users/jamesbrown/Documents/Xentity/temp/test.zip", function(){});

  dr.transform = function(data) {
    /*
	  Write custom function to change bad data into better data
    */
    return data;
  }

  var config = {
    host: "accounts.helpingscience.org",
    port: "27017",
    db: "james2",
    table: "dwc2"
  };

  dr.import2mongo(config, function(err, res) {
	  if (err) {
	  	console.log("There was an error.");
	  } else {
	  	console.log("Total records read into the mongodb:", res.count);
      console.log("It took", res.read_time, "seconds to read the file(s).");
      console.log("It took a total of:", res.total_time, "seconds");
	  }
  });
'''

## GitHub information

After cloning the repository, enter the repository and use 

  $npm install
  
The drivers should all install, and the library will be up and running.

## Tests

Inside the test folder, there are multiple tests to run to check that the code is working, and throwing errors correctly when not.
You can run the tests using 

  $node testname

The following are all of the tests at this point: 
test1

## Methods

The following are all of the functions that can be used for this library.  All options are JSON objects with specific fields to be declared.


## getArchive(url, destination, options, callback)

This function takes the url and downloads the file.  It downloads it into the destination path, and creates a new file using the
extension of the url. If a file with that name is already in the destination folder, the function assumes you do not want to download
the url and will exit this function.  If you want to download the file anyways, set the options.overwrite = true.
The callback only takes an error and msg variables, eg:
'''javascript
  getArchive('facebook.com/junk', 'myUserName/Desktop', {}, function(error, message) {}
'''

## setArchive(location, callback)