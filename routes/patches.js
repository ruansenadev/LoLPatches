var express = require('express')
var router = express.Router()
var fs = require('fs')
var path = require('path')

var ampRoot = path.join(__dirname, '../amp')

router.get('/', function (req, res) {
  res.sendFile('patches.amp.html', { root: ampRoot })
});

router.get('/:v', function (req, res, next) {
  let v = req.params.v
  // sanitize version param
  let banner = '/'+JSON.parse(fs.readFileSync(path.join(__dirname, '../patches', 'data.json'), 'utf8')).items.filter(i => i.titulo === v)[0].img
  res.render('patch_amp', { title: 'Atualização '+v, ref: `${req.headers.host}/patches/${v}`, version: v, banner })
})

module.exports = router