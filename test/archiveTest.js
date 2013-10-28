var dwcareader = require("../index.js");
var dr = new dwcareader();

var path = '';
/*
  Must set a path that works for your local machine.  This is different for Windows and Mac!
  var path = C:\\xampp\\dwca-no.zip;
  var path = /Users/username/Documents/temp;
*/
path = '/Users/jamesbrown/Documents/Xentity/temp';

dr.getArchive('http://images.cyberfloralouisiana.com/archives/dwca-no/dwca-no.zip', 
path, 
null, 
function(error, msg) {
  if(error) {
    console.log(msg);
	} else {
    console.log('getArchive worked!'); 
	}
});

dr.setArchive(path+'test.zip', function(error, msg){
  if(error) {
    console.log(msg);
  } else {
    console.log('setArchive worked!');
  }
});