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
async function fetchPatches(callback = (data = { items: [] }) => { return data }) {
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
        console.log(patch[0].ft.img)
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
                            res.data.pipe(fs.createWriteStream(path.join(patchesDir, patch[1], patch[0].ft.img)).on('close', () => { console.log('+ '+champ.img); cb(null, patch[0].ft.img) }))
                        })
                        .catch(cb)
                })
            }
        }
        return patchesBanners
    }, [])
    // map calls in-game images
    let patchesCalls = patches.reduce((calls, patch, p) => {
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
                        patches[p][0].champs[c].habilidades[s] = sk.img
                        try {
                            fs.accessSync(path.join(imagesDir, spellsDir, sk.img), fs.constants.F_OK)
                        } catch (error) {
                            calls.push(function (cb) {
                                axios({ method: 'get', url, responseType: 'stream' })
                                    .then(res => {
                                        fs.mkdir(path.join(imagesDir, spellsDir), { recursive: true }, (err) => {
                                            if (err) { throw err }
                                            res.data.pipe(fs.createWriteStream(path.join(imagesDir, spellsDir, sk.img)).on('close', () => {console.log('+ '+sk.img); cb(null, sk.img) }))
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
                                res.data.pipe(fs.createWriteStream(path.join(imagesDir, champsDir, champ.img)).on('close', () => { console.log('+ '+champ.img); cb(null, champ.img) }))
                            })
                        })
                        .catch(cb)
                })
            }
        })
        return calls
    }, [])
    return new Promise((resolve, reject) => {
        console.log(`Trynna download ${bannersCalls.concat(patchesCalls).length} images..`)
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
    })

}



// all images fetch calls

// async.parallel(patchesCalls, (erro, patchesImages) => {
//     if (erro) { }
//     console.log(`${patchesImages.length} new images, in game images are saved at /${imagesDir}`)
//     // rewrite data files

// })


// --fetch news patches and rewrite data--
// fetchPatches(data => {
//     fs.writeFile(path.join(patchesDir, 'data.json'), JSON.stringify(data, null, 2), 'utf-8', (err) => {
//         if (err) { throw err }
//         console.log('\nPatches updated with success ^-^')
//         console.log("all images saved at " + path.join(patchesDir, imagesDir))
//     })
// })
// --fetch news patches and scrap all patches--
// fetchPatches(async data => {
//     data = data.items
//     await crawPatches(data)
// })

// --scrap all patches and rewrite data--
fetchPatchesImages([
    {
      url: "https://br.leagueoflegends.com/pt-br/news/game-updates/notas-da-atualizacao-10-7/",
      img: "LOL_PROMOART_10_banner.jpg",
      titulo: "10.7",
      autor: "Anacronista e Natchy",
      data: "2020-03-31T19:00:00.000Z"
    },
    {
      url: "https://br.leagueoflegends.com/pt-br/news/game-updates/notas-da-atualizacao-10-6/",
      img: "LOL_PROMOART_9-2.jpg",
      titulo: "10.6",
      autor: "Anacronista e Natchy",
      data: "2020-03-17T19:00:00.000Z"
    },
    {
      url: "https://br.leagueoflegends.com/pt-br/news/game-updates/notas-da-atualizacao-10-5/",
      img: "Patch_105_Notes_Banner.jpg",
      titulo: "10.5",
      autor: "shio shoujo",
      data: "2020-03-03T19:00:00.000Z"
    },
    {
      url: "https://br.leagueoflegends.com/pt-br/news/game-updates/notas-da-atualizacao-10-4/",
      img: "LOL_PROMOART_6.jpg",
      titulo: "10.4",
      autor: "Anacronista e Natchy",
      data: "2020-02-18T19:00:00.000Z"
    }
])
.then(results => {
    results.forEach(scrap => {
        fs.mkdir(path.join(patchesDir, scrap[1]), { recursive: true }, (err) => {
            if (err) { throw err }
            fs.writeFile(path.join(patchesDir, scrap[1], 'data.json'), JSON.stringify(scrap[0], null, 2), (err) => {
                if (err) { throw err }
                console.log(`Re-writed data: ${path.join(patchesDir, scrap[1], 'data.json')}`)
            })
        })
    })
})
//     .catch(console.error)
// --scrap single patch test--

// fetch news, scrap patches, rewrite all
// fetchPatches(data => {
//     fs.writeFile(path.join(patchesDir, 'data.json'), JSON.stringify(data, null, 2), 'utf-8', (err) => {
//         if (err) { throw err }
//         console.log('\nPatches updated with success ^-^')
//         console.log("News images saved at " + path.join(patchesDir, imagesDir))
//         fetchPatchesImages(data.items).then(results => {
//             results.forEach(scrap => {
//                 fs.mkdir(path.join(patchesDir, scrap[1]), { recursive: true }, (err) => {
//                     if (err) { throw err }
//                     fs.writeFile(path.join(patchesDir, scrap[1], 'data.json'), JSON.stringify(scrap[0], null, 2), (err) => {
//                         if (err) { throw err }
//                         console.log(`Re-writed data: ${path.join(patchesDir, scrap[1], 'data.json')}`)
//                     })
//                 })
//             })
//         })

//     })
// })
// crawPatches([{
//     url: "https://br.leagueoflegends.com/pt-br/news/game-updates/notas-da-atualizacao-9-21/",
//     img: "lol_promoart_15_0.jpg",
//     titulo: "9.21",
//     autor: "shio shoujo",
//     data: "2019-10-18T20:40:53.000Z"
//   }])

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