var express = require('express')
var router = express.Router()
var cors = require('cors')
var fs = require('fs')
var path = require('path')

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

router.get('/patches', function(req, res, next) {
    let page = req.query.page ? Number(req.query.page) : 1
    let items = req.query.items ? Number(req.query.items) : 4
    let data = JSON.parse(fs.readFileSync(path.join(__dirname, '../patches', 'data.json'), 'utf8'))
    data = paginate(data.items, page, items)
    console.log(data)
    res.json(data)
})

module.exports = router