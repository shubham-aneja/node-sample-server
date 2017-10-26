var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var port = (process.env.PORT || '80')
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({extended: true})); // support encoded bodies

    app.use(express.static('./shubham/images'));

    app.use('*', function(req, res, next) {
      res.setHeader("Access-Control-Allow-Origin", "*");
      next();
    });


    app.all('/', function(req, res) {
      console.log('A request is received in default url  ');

      res.write("Thanks from connecting us....hurreyyy");
      res.end();
    });

    app.all('/login', function(req, res){
      console.log('A request is received in default url  ');

      res.write("Login also works.......hurreyyy");
      res.end();
    });

    app.listen(port, function () {
      console.log(port + ' port is ready to be listen')
    });

