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
dr.setArchive("/Users/jamesbrown/Documents/Xentity/temp/test2.zip");

dr.transform = function(data) {
  /*
	Write custom function to change bad data into better data
  */
//  data = { foo: "bar" };
  return data;
}

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

/*
dr.on("record", function(row, index) {
	console.log("Record", row, index);
});
*/