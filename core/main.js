const async = require('async')
const axios = require('axios').default
const fs = require('fs')
const path = require('path')
const fetcher = require('./fetcher')
const scraper = require('./scraper')
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
            console.log('Erro :T    log do erro: ' + path.join(patchesDir, errorsDir, logFile))
        })
    })
}
function imgFile(url) {
    url = url.slice(url.lastIndexOf('/') + 1)
    return url.indexOf('&') > -1 ? url.slice(0, url.indexOf('&')) : url
}
function urlResize(url) {
    return url.indexOf('&') > -1 ? url.slice(0, url.indexOf('&')) : url
}
// calls fetcher module and craw images
async function fetchPatches(callback = (data = { items: [] }) => { return data }) {
    let data = await fetcher.fetch()

    if (data[0].items.length) {
        try {
            fs.mkdir(path.join(patchesDir, imagesDir), { recursive: true }, (err) => {
                if (err) throw err
            })
            console.log(`Trynna download banners`)
            async.map(data[0].items, async.reflect((patch, cb) => {
                axios({ method: 'get', url: patch.img, responseType: 'stream' })
                    .then(res => {
                        let img = res.headers['content-disposition'].split('filename=')[1]
                        fs.access(path.join(patchesDir, imagesDir, img), fs.constants.F_OK, (err) => {
                            // image doesnt exist
                            if (err) { res.data.pipe(fs.createWriteStream(path.join(patchesDir, imagesDir, img)).on('open', () => console.log('downloading ' + img)).on('close', () => cb(null, img))) }
                            else {
                                let err = new Error('There is a local ' + img);
                                err.code = 'EYEIMG'
                                cb(err)
                            }
                        })
                    })
                    .catch(cb)
            }), (erro, imgs) => {
                if (erro) { throw erro }
                imgs.forEach((img, i) => {
                    if (img.error) {
                        if (img.error.code === 'EYEIMG') {
                            return console.log(img.error.message)
                        } else {
                            throw img.error
                        }
                    } else {
                        data[0].items[i].img = img.value
                    }
                })
                // concat local with new items
                data[1].items = data[0].items.concat(data[1].items)
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
async function crawPatches(patches) {
    patches = patches || JSON.parse(fs.readFileSync(path.join(patchesDir, "data.json"), 'utf-8')).items
    console.log(`Gonna crawl ${patches.length} patches page and scrap in series`)
    // map craw calls
    patches = patches.map(p => {
        return (cb) => {
            scraper.scrap(p.url, (data, msg) => {
                console.log(msg)
                cb(null, data)
            })
        }
    })
    // craw
    async.series(patches, (err, results) => {
        // results = [[patch, dir]...]
        if (err) { return createLog(err, 'Patches crawling') }
        // map banners calls
        let resultsBanner = results.reduce((patchesBanner, patch, i) => {
            // index patches with fetch calls to banners
            if (/(?<=\.)[a-z]*$/.test(patch[0].ft.img)) {
                let banner = imgFile(patch[0].ft.img)
                fs.access(path.join(patchesDir, patch[1], banner), fs.constants.F_OK, (err) => {
                    if (err) {
                        // image doesnt exist so add to banners
                        patchesBanner[i] = function (cb) {
                            axios({ method: 'get', url: patch[0].ft.img, responseType: 'stream' })
                                .then(res => {
                                    res.data.pipe(fs.createWriteStream(path.join(patchesDir, patch[1], banner)).on('open', () => console.log(`downloading ${banner}`)))
                                })
                                .catch(cb)
                                .finally(() => {
                                    cb(null, banner)
                                })
                        }
                    }
                })
            }
            return patchesBanner
        }, {})
        async.parallel(resultsBanner, (err, banners) => {
            if (err) { return createLog(err, 'Banners fetching') }
            // map img files
            for (let i in banners) {
                i = Number(i)
                results[i][0].ft.img = banners[i]
            }
            console.log(`${Object.keys(banners).length} new banners downloaded, banners of patch in the respective folder`)
        })

        // all images fetch calls
        let patchesCalls = []
        results.forEach((scrap, r) => {
            let champs = scrap[0].champs
            // push all champs images for each scrap
            champs.forEach((champ, c) => {
                if (champ.habilidades) {
                    // skills calls
                    champ.habilidades.forEach((sk, h) => {
                        if (sk.img) {
                            sk.img = urlResize(sk.img)
                            let img = imgFile(sk.img)
                            fs.access(path.join(imagesDir, spellsDir, img), fs.constants.F_OK, (err) => {
                                if (err) {
                                    // image doesnt exist so add to calls
                                    patchesCalls.push(function (cb) {
                                        axios({ method: 'get', url: sk.img, responseType: 'stream' })
                                            .then(res => {
                                                fs.mkdir(path.join(imagesDir, spellsDir), { recursive: true }, (err) => {
                                                    if (err) { throw err }
                                                    res.data.pipe(fs.createWriteStream(path.join(imagesDir, spellsDir, img)))
                                                })
                                            })
                                            .catch(cb)
                                            .finally(() => {
                                                cb(null, img)
                                            })
                                    })
                                }
                                // re-assign img name
                                results[r][0].champs[c].habilidades[h].img = `${spellsDir}/${img}`
                            })
                        }
                    })
                }
                let img = imgFile(urlResize(champ.img))
                fs.access(path.join(imagesDir, champsDir, img), fs.constants.F_OK, (err) => {
                    if (err) {
                        patchesCalls.push(function (cb) {
                            // fetch champ image call
                            axios({ method: 'get', url: urlResize(champ.img), responseType: 'stream' })
                                .then(res => {
                                    fs.mkdir(path.join(imagesDir, champsDir), { recursive: true }, (err) => {
                                        if (err) { throw err }
                                        res.data.pipe(fs.createWriteStream(path.join(imagesDir, champsDir, img)))
                                    })
                                })
                                .catch(cb)
                                .finally(() => {
                                    cb(null, img)
                                })
                        })
                    }
                    // re-assign champ img
                    results[r][0].champs[c].img = `${champsDir}/${img}`
                })
            })
        })
        async.parallel(patchesCalls, (erro, patchesImages) => {
            if (erro) { return createLog(erro, 'Patch images') }
            console.log(`${patchesImages.length} new images downloaded, images saved in \\${imagesDir}`)
            // rewrite data files
            results.forEach(scrap => {
                fs.writeFile(path.join(patchesDir, scrap[1], 'data.json'), JSON.stringify(scrap[0], null, 2), (err) => {
                    if (err) { throw err }
                    console.log(`Re-writed data with images: ${path.join(patchesDir, scrap[1], 'data.json')}`)
                })
            })
        })

    })
}
fetchPatches(data => {
    fs.writeFile(path.join(patchesDir, 'data.json'), JSON.stringify(data, null, 2), 'utf-8', (err) => {
        if (err) { throw err }
        console.log('\nPatches updated with success ^-^')
        console.log("all images saved at " + path.join(patchesDir, imagesDir))
    })
})
// crawPatches([{
//     url: "https://br.leagueoflegends.com/pt-br/news/game-updates/notas-da-atualizacao-10-8/",
//     img: "Patch_10.8_Notes_Banner.jpg",
//     titulo: "Notas da Atualização 10.8",
//     autor: "Anacronista e Natchy",
//     data: "2020-04-14T18:00:00.000Z"
// }])
// fetchPatches().then(crawPatches)

// scraper.scrap('https://br.leagueoflegends.com/pt-br/news/game-updates/notas-da-atualizacao-10-4')

// JSON.parse(fs.readFileSync(path.join(patchesDir, "data.json"), 'utf-8'))[0]
// console.log(`last patch date: ${new Date(lastPatch.data).toLocaleDateString()}`)