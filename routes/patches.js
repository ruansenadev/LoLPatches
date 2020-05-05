var express = require('express')
var router = express.Router()
var path = require('path')

router.get('/', function(req, res) {
  res.sendFile('index.amp.html', {root: path.join(__dirname, '../public/static')})
});

router.get('/:v', function(req, res, next) {
    res.send('Versão ' + req.params.v)
})

module.exports = router