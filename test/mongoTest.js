var dwcareader = require("../index.js");
var dr = new dwcareader();

var path = "";

dr.getArchive('http://images.cyberfloralouisiana.com/archives/dwca-no/dwca-no.zip', 
path, 
null, 
function(error, msg) {
  if(error) {
    console.log(msg);
	}
});

var config = {
  host: "localhost",
  port: "1000",
  db: "database",
  table: "table"
};

dr.import2mongo(config, function(err, res) {
  if (err) {
		console.log(res);
	} else {
		console.log("Total records read into the mongodb:", res.count);
    console.log("It took", res.read_time, "seconds to read the file(s).");
    console.log("It took a total of:", res.total_time, "seconds");
	}
});