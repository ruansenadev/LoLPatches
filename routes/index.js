var express = require('express');
var router = express.Router();
var path = require('path')

/* GET home page. */
router.get('/', function(req, res, next) {
  res.sendFile('index.amp.html', {root: path.join(__dirname, '../public/static')})
});

module.exports = router;
