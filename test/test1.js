var dwcareader = require("../index.js");
var dr = new dwcareader();
var dr2 = new dwcareader();


dr.getArchive('http://images.cyberfloralouisiana.com/archives/dwca-no/dwca-no.zip', 
"/Users/jamesbrown/Documents/Xentity/temp", 
null, 
function(error, response, body) {
	if(error) {
    console.log(error, response);
	} else {
    console.log(response); 
	}
});


//dr.setArchive("C:\\xampp\\htdocs\\dwca-reader\\tmparchives\\dwca-no.zip");
//dr.setArchive("/Users/jamesbrown/Documents/Xentity/temp/test.zip", function(){});
dr2.setArchive("/Users/jamesbrown/Documents/Xentity/temp/test.zip", function(){});

dr.transform = function(data) {
  /*
	Write custom function to change bad data into better data
  */
  //data.year = parseInt(data.year);
//  data = { foo: "bar" };
  return data;
}

var options = {
  host: 'localhost',
  port: 9200,
  // pathPrefix:'optional pathPrefix',
  secure: false,
  db: "test1",
  table: "records",
  id: function(row) {
    return row.institutionCode + '-' + row.collectionCode + '-' + row.catalogNumber;
  }
};

dr2.import2elasticsearch(options, function(err, res) {
  if(err) {
    console.log("There was an error:", res);
  } else {
    console.log("Total records read into the elasticsearch db:", res.count);
    console.log("It took:", res.read_time, "seconds to read the file(s).");
    console.log("It took a total of:", res.total_time);
  }
});


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


/*
dr.on("record", function(row, index) {
	console.log("Record", row, index);
});
*/