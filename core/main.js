const async = require('async')
const axios = require('axios').default
const fs = require('fs')
const path = require('path')
const fetcher = require('./fetcher')
// const scraper = require('./scraper')
const d = new Date()

const errorsDir = 'erros'
const patchesDir = 'patches'
const imagesDir = 'imagens'

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

// calls fetcher module and craw images
async function fetchNewPatches() {
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
                        res.data.pipe(fs.createWriteStream(path.join(patchesDir, imagesDir, img)).on('open', () => console.log('downloading ' + img)).on('close', () => cb(null, img)))
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
}
fetchNewPatches()
// scraper.scrap('https://br.leagueoflegends.com/pt-br/news/game-updates/notas-da-atualizacao-10-4')

// JSON.parse(fs.readFileSync(path.join(patchesDir, "data.json"), 'utf-8'))[0]
// console.log(`last patch date: ${new Date(lastPatch.data).toLocaleDateString()}`)