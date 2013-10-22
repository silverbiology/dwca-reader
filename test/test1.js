var dwcareader = require("../index.js");
var dr = new dwcareader();

/*
dr.getArchive('http://images.cyberfloralouisiana.com/archives/dwca-no/dwca-no.zip', 
"/Users/jamesbrown/Documents/Xentity/temp", 
null, 
function(error, response, body) {
	console.log(error, response);
});
*/

//dr.setArchive("C:\\xampp\\htdocs\\dwca-reader\\tmparchives\\dwca-no.zip");
dr.setArchive("/Users/jamesbrown/Documents/Xentity/temp/test.zip", function(){});

dr.transform = function(data) {
  /*
	Write custom function to change bad data into better data
  */
  data.year = parseInt(data.year);
//  data = { foo: "bar" };
  return data;
}

var i = 0;
var options = {
  host: 'localhost',
  port: 9200,
  // pathPrefix:'optional pathPrefix',
  secure: false,
  indexName: "test1",
  typeName: "records2",
  id: function(row) {
    return row.institutionCode + '-' + row.collectionCode + '-' + row.catalogNumber;
  }
};

dr.import2elasticsearch(options, function(err, res) {
  if(err) {
    console.log("There was an error:", err);
  } else {
    console.log("Total records read:", res.count);
    console.log("It took:", res.import_time, "seconds to read the file(s).");
  }
});

/*
var config = {
  host: "accounts.helpingscience.org",
  port: "27017",
  db: "james2",
  table: "dwc2"
};


dr.import2mongo(config, function(err, count) {
	if (err) {
		console.log("There was an error.");
	} else {
		console.log("Total records inserted:", count);
	}
});
*/

/*
dr.on("record", function(row, index) {
	console.log("Record", row, index);
});
*/