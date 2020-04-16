const axios = require('axios').default

const url = 'https://am-a.akamaihd.net/image?f=https://news-a.akamaihd.net/public/riot-bra/LoL/NotasdeAtualizacao1003/Patch_10_3_Infographic_1080x1080_crop_por-BR.jpg'
// const url = 'https://am-a.akamaihd.net/image?f=https://news-a.akamaihd.net/public/images/articles/2019/november/ApheliosAbility/Calibrum.jpg'

function imgFile(url) {
    return url.slice(url.lastIndexOf('/') + 1);
}

let img = imgFile(url)
axios({ method: 'get', url, responseType: 'stream' })
    .then(res => {
        console.log(img, res.headers)
    })