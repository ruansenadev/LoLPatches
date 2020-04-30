const async = require('async')
const axios = require('axios').default
const fs = require('fs')
const path = require('path')
const fetcher = require('./fetcher')
const scraper = require('./scraper')
const vision = require('./vision')
const d = new Date()

const errorsDir = 'erros'
const patchesDir = 'patches'
const imagesDir = 'imagens'
const champsDir = 'champs'
const spellsDir = 'skills'
const runesDir = 'runes'

function createLog(e, frag = '') {
    fs.mkdir(path.join(patchesDir, errorsDir), { recursive: true }, (err) => {
        if (err) throw err;
        let logFile = d.toLocaleDateString().replace(/\//g, '_').concat('_log.txt')
        fs.appendFile(path.join(patchesDir, errorsDir, logFile), `(${new Date().toLocaleTimeString()}): \r\n${frag ? " - " + frag : ""}\r\n${e}\r\n🔚🔚🔚🔚\r\n`, 'utf8', (err) => {
            if (err) throw err;
            console.log('Error, log: ' + path.join(patchesDir, errorsDir, logFile))
        })
    })
}
function sanitizeUrl(url = '') {
    let bar = url.lastIndexOf('/')
    // clear any query
    url = url.lastIndexOf('?') > bar ? url.slice(0, url.lastIndexOf('?')) : url
    // clear any param
    return url.lastIndexOf('&') > bar ? url.slice(0, url.lastIndexOf('&')) : url
}
function imgFile(url) {
    url = sanitizeUrl(url)
    return url.slice(url.lastIndexOf('/') + 1)
}

// calls fetcher module and craw images
async function fetchPatches(callback = (data = { items: [] }) => { return data }, news = false) {
    let data = await fetcher.fetch()

    if (data[0].items.length) {
        try {
            fs.mkdir(path.join(patchesDir, imagesDir), { recursive: true }, (err) => {
                if (err) throw err
            })
            console.log("Trynna download banners")
            async.map(data[0].items, (patch, cb) => {
                axios({ method: 'get', url: patch.img, responseType: 'stream' })
                    .then(res => {
                        let img = res.headers['content-disposition'].split('filename=')[1]
                        fs.access(path.join(patchesDir, imagesDir, img), fs.constants.F_OK, (err) => {
                            // image doesnt exist
                            if (err) { res.data.pipe(fs.createWriteStream(path.join(patchesDir, imagesDir, img)).on('open', () => console.log('downloading ' + img)).on('close', () => cb(null, img))) }
                            else { cb(null, img) }
                        })
                    })
                    .catch(cb)
            }, (erro, imgs) => {
                if (erro) { throw erro }
                imgs.forEach((img, i) => {
                    data[0].items[i].img = img
                })
                // concat local with new items
                data[1].items = data[0].items.concat(data[1].items)
                if (news) {
                    return callback([data[1], data[0].items])
                }
                return callback(data[1])
            })
        } catch (error) {
            createLog(error, 'Patches images')
        }
    } else {
        console.log('Your file is up-to-date, nice!')
        return callback(data[1])
    }
}

function crawPatches(patches) {
    patches = patches || JSON.parse(fs.readFileSync(path.join(patchesDir, "data.json"), 'utf-8')).items
    // map craw calls
    patches = patches.map(p => {
        return (cb) => {
            scraper.scrap(p.url, (data, msg) => {
                console.log(msg)
                cb(null, data)
            })
        }
    })
    console.log(`Gonna crawl ${patches.length} patches pages and scrap`)
    return new Promise((resolve, reject) => {
        // craw
        async.series(patches, (err, results) => {
            if (err) {
                createLog(err, 'Patches crawling')
                return reject(err)
            }
            return resolve(results)
        })
    })
}
async function fetchPatchesImages(items) {
    let patches = await crawPatches(items)
    // map calls banners
    let bannersCalls = patches.reduce((patchesBanners, patch, p) => {
        if (patch[0].ft.img) {
            let url = patch[0].ft.img
            patch[0].ft.img = imgFile(url)
            patches[p][0].ft.img = imgFile(url)
            // rename path
            try {
                fs.accessSync(path.join(patchesDir, patch[1], patch[0].ft.img), fs.constants.F_OK)
            } catch (error) {
                patchesBanners.push(function (cb) {
                    axios({ method: 'get', url, responseType: 'stream' })
                        .then(res => {
                            res.data.pipe(fs.createWriteStream(path.join(patchesDir, patch[1], patch[0].ft.img)).on('close', () => { console.log('+ ' + champ.img); cb(null, patch[0].ft.img) }))
                        })
                        .catch(cb)
                })
            }
        }
        return patchesBanners
    }, [])
    // map calls in-game images
    let patchesCalls = patches.reduce((calls, patch, p) => {
        if (patch[0].champs.length) {
            let champs = patch[0].champs
            // push all champs images for each scrap
            champs.forEach((champ, c) => {
                if (champ.habilidades) {
                    // skills calls
                    let url
                    champ.habilidades.forEach((sk, s) => {
                        if (sk.img) {
                            url = sanitizeUrl(sk.img)
                            sk.img = imgFile(sk.img)
                            patches[p][0].champs[c].habilidades[s].img = sk.img
                            try {
                                fs.accessSync(path.join(imagesDir, spellsDir, sk.img), fs.constants.F_OK)
                            } catch (error) {
                                calls.push(function (cb) {
                                    axios({ method: 'get', url, responseType: 'stream' })
                                        .then(res => {
                                            fs.mkdir(path.join(imagesDir, spellsDir), { recursive: true }, (err) => {
                                                if (err) { throw err }
                                                res.data.pipe(fs.createWriteStream(path.join(imagesDir, spellsDir, sk.img)).on('close', () => { console.log('+ ' + sk.img); cb(null, sk.img) }))
                                            })
                                        })
                                        .catch(cb)
                                })
                            }
                        }
                    })
                }
                let url = sanitizeUrl(champ.img)
                champ.img = imgFile(champ.img)
                patches[p][0].champs[c].img = champ.img
                try {
                    fs.accessSync(path.join(imagesDir, champsDir, champ.img))
                } catch (error) {
                    calls.push(function (cb) {
                        // fetch champ image call
                        axios({ method: 'get', url, responseType: 'stream' })
                            .then(res => {
                                fs.mkdir(path.join(imagesDir, champsDir), { recursive: true }, (err) => {
                                    if (err) { throw err }
                                    res.data.pipe(fs.createWriteStream(path.join(imagesDir, champsDir, champ.img)).on('close', () => { console.log('+ ' + champ.img); cb(null, champ.img) }))
                                })
                            })
                            .catch(cb)
                    })
                }
            })
        }
        return calls
    }, [])
    let nCalls = bannersCalls.concat(patchesCalls).length

    return new Promise((resolve, reject) => {
        if (nCalls) {
            console.log(`Trynna download ${nCalls} images..`)
            async.series({
                banners: function (cb) {
                    async.parallel(bannersCalls, cb)
                },
                champs: function (cb) {
                    async.parallel(patchesCalls, cb)
                }
            }, (err, im) => {
                if (err) {
                    createLog(err, 'Patch images')
                    return reject(err)
                }
                console.log(`${im.banners.length} Ft banners and ${im.champs.length} Champs images downloaded.`)
                // log results length
                return resolve(patches)
            })
        } else {
            console.log('There are locally all related images')
            return resolve(patches)
        }
    })

}

// --fetch news patches--
// fetchPatches(data => {
//     fs.writeFile(path.join(patchesDir, 'data.json'), JSON.stringify(data, null, 2), 'utf-8', (err) => {
//         if (err) { throw err }
//         console.log('\nPatches updated with success ^-^')
//         console.log("News images saved at " + path.join(patchesDir, imagesDir))
//     })
// })

// --FETCH NEWS PATCHES SCRAP THEM AND WRITE--
// fetchPatches((data) => {
//     fs.writeFile(path.join(patchesDir, 'data.json'), JSON.stringify(data[0], null, 2), 'utf-8', (err) => {
//         if (err) { throw err }
//         console.log('\nPatches updated with success ^-^')
//         console.log("News images saved at " + path.join(patchesDir, imagesDir))
//     })
//     fetchPatchesImages(data[1])
//         .then(results => {
//             results.forEach(scrap => {
//                 fs.mkdir(path.join(patchesDir, scrap[1]), { recursive: true }, (err) => {
//                     if (err) { throw err }
//                     fs.writeFile(path.join(patchesDir, scrap[1], 'data.json'), JSON.stringify(scrap[0], null, 2), (err) => {
//                         if (err) { throw err }
//                         console.log(`Writed data: ${path.join(patchesDir, scrap[1], 'data.json')}`)
//                     })
//                 })
//             })
//         })
// }, true)

// --RESCRAP ALL LOCAL PATCHES AND REWRITE DATA--
// fetchPatchesImages()
// .then(results => {
//     results.forEach(scrap => {
//         fs.mkdir(path.join(patchesDir, scrap[1]), { recursive: true }, (err) => {
//             if (err) { throw err }
//             fs.writeFile(path.join(patchesDir, scrap[1], 'data.json'), JSON.stringify(scrap[0], null, 2), (err) => {
//                 if (err) { throw err }
//                 console.log(`Re-writed data: ${path.join(patchesDir, scrap[1], 'data.json')}`)
//             })
//         })
//     })
// })

function lookAround(patches) {
    patches = patches || JSON.parse(fs.readFileSync(path.join(patchesDir, 'data.json')))
    // filter patches with ft banners
    let patchesFt = patches.items.reduce((patchesFt, patch, i) => {
        let img = JSON.parse(fs.readFileSync(path.join(patchesDir, patch.titulo, 'data.json'))).ft.img
        if (img) {
            patchesFt.push(function(cb) {
                vision.look(path.join(patchesDir, patch.titulo, img)).then(data => {
                    console.log(`${patch.titulo} - ${img}: ${Object.keys(data)}`)
                    cb(null, { patch: i, destaques: data })
                }).catch(e => {
                    createLog(e, `OCR ${patch.titulo}`)
                    return cb(e)
                })
            })
        }
        return patchesFt
    }, [])
    // extract data
    async.series((patchesFt), (err, patchesFt) => {
        if (err) { throw err }
        console.log(patchesFt.length + ' images readed')
        patchesFt.forEach(item => {
            if (Object.keys(item.destaques).length) patches.items[item.patch].destaques = item.destaques
        })
        fs.writeFile(path.join(patchesDir, 'data.json'), JSON.stringify(patches, null, 2), err => {
            if (err) { throw err }
            console.log('Rewrited patches data.')
        })
    })
}

lookAround()