var express = require('express')
var router = express.Router()
var path = require('path')

var ampRoot = path.join(__dirname, '../amp')

router.get('/', function (req, res) {
  res.sendFile('patches.amp.html', { root: ampRoot })
});

router.get('/:v', function (req, res, next) {
  res.send('Versão ' + req.params.v)
  // res.sendFile('patch.amp.html', { root: ampRoot })
})

module.exports = router