var express = require('express')
var router = express.Router()
var cors = require('cors')
var fs = require('fs')
var path = require('path')
var {query, validationResult} = require('express-validator')

var whiteList = ['localhost:3000', 'cdn.ampproject.org', 'www.bing-amp.com']
var corsOptions = {
    origin: function(origin, callback) {
        if(whiteList.indexOf(origin) !== -1 || !origin) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    }
}

router.use(cors(corsOptions))

function paginate(data, page, items) {
    // index of last item, not included in array slicing, means has more
    let left = data[items*page] ? true : false
    // if hasnt page items slice returns an empty array
    return {items: data.slice(page==1?0:items*(page-1), items*(page)), left}
}
// patches preview
router.get('/patches', [
    query('page').isAlphanumeric(),
    query('items').isAlphanumeric(),
    function(req, res, next) {
    const errors = validationResult(req)
    if(!errors.isEmpty()) {
        return res.status(403).json({erros: errors.array()})
    }
    let page = Number(req.query.page)
    let items = Number(req.query.items)
    let data = JSON.parse(fs.readFileSync(path.join(__dirname, '../patches', 'data.json'), 'utf8'))
    data = paginate(data.items, page, items)
    res.json(data)
}
])

// patch version
router.get('/patch', [
    query('version', 'Version incorrect').matches(/\d+\.\d+[a-z]*/),
    function(req, res, next) {
        const errors = validationResult(req)
        if(!errors.isEmpty()) {
            return res.status(422).json({erros: errors.array()})
        }
        try {
            fs.accessSync(path.join(__dirname, '../patches', v))
        } catch {
            let e = new Error('Version not released')
            e.status = 406
            return next(e)
        }
        let data = JSON.parse(fs.readFileSync(path.join(__dirname, '../patches', v, 'data.json'), 'utf8'))
        res.json(data)
    }
])
module.exports = router