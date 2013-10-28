var dwcareader = require("../index.js");
var dr = new dwcareader();

var path = '';
/*
  Must set a path that works for your local machine.  This is different for Windows and Mac!
  var path = C:\\tmp\\archive.zip;
  var path = /Users/Documents/temp;
*/
path = '/Users/Documents/temp';

dr.getArchive('http://{path_to_archive}/{name}.zip', 
path, 
null, 
function(error, msg) {
  if (error) {
    console.log(msg);
  } else {
    console.log('getArchive worked!'); 
  }
});

dr.setArchive(path + 'archive.zip', function(error, msg){
  if (error) {
    console.log(msg);
  } else {
    console.log('setArchive worked!');
  }
});
