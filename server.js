var express = require('express');
var app = express();
var bodyParser = require('body-parser');
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({extended: true})); // support encoded bodies

    app.use(express.static('./shubham/images'));

    app.use('*', (req, res, next)=> {
      res.setHeader("Access-Control-Allow-Origin", "*");
      next();
    });


    app.all('/', (req, res)=> {
      console.log('A request is received in default url  ');

      res.write("Thanks from connecting us....hurreyyy");
      res.end();
    });

    app.all('/login', (req, res)=> {
      console.log('A request is received in default url  ');

      res.write("Login also works.......hurreyyy");
      res.end();
    });

    app.listen(process.env.PORT || 5000, function () {
      console.log((process.env.PORT || 5000) + ' port is ready to be listen')
    });

