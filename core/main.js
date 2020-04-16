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
    return url.slice(url.lastIndexOf('/') + 1);
}

// calls fetcher module and craw images
async function fetchPatches() {
    let data = await fetcher.fetch()

    if (data[0].length) {
        try {
            fs.mkdir(path.join(patchesDir, imagesDir), { recursive: true }, (err) => {
                if (err) throw err
            })
            console.log(`Gonna download ${data[0].length} banners in parallel`)
            async.map(data[0], (patch, cb) => {
                let img
                axios({ method: 'get', url: patch.img, responseType: 'stream' })
                    .then(res => {
                        img = res.headers['content-disposition'].split('filename=')[1]
                        fs.access(path.join(patchesDir, imagesDir, img), fs.constants.F_OK, (err) => {
                            // image doesnt exist
                            if (err) { res.data.pipe(fs.createWriteStream(path.join(patchesDir, imagesDir, img)).on('open', () => console.log('downloading ' + img)).on('close', () => cb(null, img))) }
                            else { console.log(`skipping ${img}`) }
                        })
                    })
                    .catch(cb)
            }, (erro, imgs) => {
                if (erro) { throw erro }
                imgs.forEach((img, i) => {
                    data[0][i].img = img
                })
                // images mapped so write
                fs.writeFile(path.join(patchesDir, 'data.json'), JSON.stringify(data[0].concat(data[1]), null, 2), 'utf-8', (err) => {
                    if (err) { throw err }
                    console.log('\nPatches updated with success ^-^')
                    console.log("all images saved at " + path.join(patchesDir, imagesDir))
                })
            })
        } catch (error) {
            createLog(error, 'Patches images')
        }
    } else {
        console.log('Your file is up-to-date, nice!')
    }
    return data[0]
}
async function crawPatches(patches) {
    patches = patches || JSON.parse(fs.readFileSync(path.join(patchesDir, "data.json"), 'utf-8'))
    console.log(`Gonna crawl ${patches.length} patches page and scrap in series`)
    // map function calls
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
        if (err) { return createLog(err, 'Patches crawling') }

        let resultsBanner = results.reduce((patchesBanner, patch, i) => {
            // index patches with fetch calls to banners
            if (/(?<=\.)[a-z]*$/.test(patch[0].ft.media)) {
                patchesBanner[i] = function (cb) {
                    let banner = imgFile(patch[0].ft.media)
                    axios({ method: 'get', url: patch[0].ft.media, responseType: 'stream' })
                        .then(res => {
                            fs.access(path.join(patchesDir, patch[1], banner), fs.constants.F_OK, (err) => {
                                // image doesnt exist
                                if (err) { res.data.pipe(fs.createWriteStream(path.join(patchesDir, patch[1], banner)).on('open', () => console.log(`downloading ${banner} to ${path.join(patchesDir, patches[1])}`))) }
                            })
                        })
                        .catch(cb)
                        .finally(() => {
                            cb(null, banner)
                        })
                }
            }
            return patchesBanner
        }, {})
        async.parallel(resultsBanner, (err, banners) => {
            if (err) { return createLog(err, 'Banners fetching') }
            // map img files
            for (let i in banners) {
                i = Number(i)
                results[i][0].ft.media = banners[i]
                console.log(results[i][0].ft)
            }
        })

        // results = results.reduce((gameImages, patch) => {
        //     let patchDir = patch[1]
        //     patch = patch[0]


        // }, [])
    })
    
}

crawPatches([
    {
        "url": "https://br.leagueoflegends.com/pt-br/news/game-updates/notas-da-atualizacao-9-22/",
        "img": "pn-922-replacement.jpg",
        "titulo": "Notas da Atualização 9.22",
        "autor": "shio shoujo",
        "data": "2019-11-02T00:14:18.000Z"
    },
    {
        url: "https://br.leagueoflegends.com/pt-br/news/game-updates/notas-da-atualizacao-10-4/",
        img: "LOL_PROMOART_6.jpg",
        titulo: "Notas da Atualização 10.4",
        autor: "Anacronista e Natchy",
        data: "2020-02-18T19:00:00.000Z"
    },
    {
        url: "https://br.leagueoflegends.com/pt-br/news/game-updates/notas-da-atualizacao-10-3/",
        img: "LOL_PROMOART_5.jpg",
        titulo: "Notas da Atualização 10.3",
        autor: "Anacronista e Natchy",
        data: "2020-02-04T19:00:00.000Z"
    },
    {
        url: "https://br.leagueoflegends.com/pt-br/news/game-updates/notas-da-atualizacao-10-2/",
        img: "header.jpg",
        titulo: "Notas da Atualização 10.2",
        autor: "Anacronista e Natchy",
        data: "2020-01-21T19:00:00.000Z"
    }
])
// fetchPatches()

// scraper.scrap('https://br.leagueoflegends.com/pt-br/news/game-updates/notas-da-atualizacao-10-4')

// JSON.parse(fs.readFileSync(path.join(patchesDir, "data.json"), 'utf-8'))[0]
// console.log(`last patch date: ${new Date(lastPatch.data).toLocaleDateString()}`)