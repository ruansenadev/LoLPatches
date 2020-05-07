var express = require('express')
var router = express.Router()
var path = require('path')

var ampRoot = path.join(__dirname, '../amp')

router.get('/', function (req, res) {
  res.sendFile('patches.amp.html', { root: ampRoot })
});

router.get('/:v', function (req, res, next) {
  res.render('testamp', { title: req.params.v, ref: `${req.headers.host}/patches/${req.params.v}`, titulo: 'Versão '+req.params.v })
})

module.exports = router