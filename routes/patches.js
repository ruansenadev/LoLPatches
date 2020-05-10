var express = require('express')
var router = express.Router()
var fs = require('fs')
var path = require('path')
var {param, validationResult} = require('express-validator')


router.get('/', function (req, res) {
  res.render('patches_amp', {tite: 'LoL Patches', ref: `${req.headers.host}/patches`})
});

router.get('/:version', [
  param('version', 'Version incorrect').matches(/\d+\.\d+[a-z]*/),
  function (req, res, next) {
    const errors = validationResult(req)
    if(!errors.isEmpty()) {
      return res.status(422).json({erros: errors.array()})
    }
    let v = req.params.version
    // if access return err 
    try {
      fs.accessSync(path.join(__dirname, '../patches', v))
    } catch {
      let e = new Error('Version not released')
      e.status = 406
      return next(e)
    }
    let banner = '/'+JSON.parse(fs.readFileSync(path.join(__dirname, '../patches', 'data.json'), 'utf8')).items.filter(i => i.titulo === v)[0].img
    let patch = JSON.parse(fs.readFileSync(path.join(__dirname, '../patches', v, 'data.json')))
    res.render('patch_amp', { title: 'Atualização '+v, ref: `${req.headers.host}/patches/${v}`, version: v, banner, patch })
  }
])

module.exports = router