/*
@header({
  searchable: 2,
  filterable: 1,
  quickSearch: 0,
  title: '百忙无果[官]',
  lang: 'ds'
})
*/
const { getHtml } = $.require('./_lib.request.js');

var rule = {
    title: '百忙无果[官]',
    host: 'https://pianku.api.%6d%67%74%76.com',
    homeUrl: '',
    searchUrl: 'https://mobileso.bz.%6d%67%74%76.com/msite/search/v2?q=**&pn=fypage&pc=10',
    detailUrl: 'https://pcweb.api.mgtv.com/episode/list?page=1&size=50&video_id=fyid',
    searchable: 2,
    quickSearch: 0,
    filterable: 1,
    multi: 1,
    url: '/rider/list/pcweb/v3?platform=pcweb&channelId=fyclass&pn=fypage&pc=80&hudong=1&_support=10000000&kind=a1&area=a1',
    filter_url: 'year={{fl.year or "all"}}&sort={{fl.sort or "all"}}&chargeInfo={{fl.chargeInfo or "all"}}',
    headers: {
        'User-Agent': PC_UA,
        'Referer': 'https://www.mgtv.com'
    },
    timeout: 5000,
    class_name: '电视剧&电影&综艺&动漫&纪录片&教育&少儿',
    class_url: '2&3&1&50&51&115&10',
    filter: 'H4sIAAAAAAAAA+2XvUrDUBSA3+XOHc65adraN+jm5CIdYok/GFupWiilIBalIFYoIh1EBxEKIih0MOZ1msS+hbc1yTni4mKms6XfIbnnC/mG9hSq6mZP7btdVVWNXae949aa2y1VUE3nwDVsHkw+Z378FoT3l4Z2HO/EXd3SNMPwfLoYTJfY/HA8T/UL6eDK3JUMtjDjnb3DFOoMbtTW45tpOHxPR1Y2Sk4/86PxSzotqn59Of/e+ajVPqZto9E4/Lj+tWd0dxrdviYPaNA6hseD9MEN2ih+eJr7o8XzJBxepNOfx3Zdp03Hhv5sHjz+/fVo0MUEry4Zt4hbnGvimnMkjpwDcWAc1zJuLhmvEK9wXiZe5rxEvMS5TdzmnHyR+yL5IvdF8kXui+SL3BfJF7kvkC9wXyBf4L5AvsB9gXyB+wL5AvcF8oXVl1MvKC2pSWqSWh6pWZKapCap5ZGaDdKatCat5dKa/FuT1qS1XFpD80YkNolNYvv32PpfCLkneIcUAAA=',
    limit: 20,
    play_parse: true,

    lazy: async function () {
        let { getProxyUrl, input } = this;
        let ids = input.split('/');
        let vid = ids[5].replace('.html', '');
        let cid = ids[4];
        let danmu = getProxyUrl() + "&url=" + encodeURIComponent(`https://galaxy.bz.mgtv.com/getctlbarrage?vid=${vid}&cid=${cid}`);
        console.log('弹幕请求:', danmu);
        return {
            parse: 1,
            url: input,
            jx: 1,
            danmaku: danmu
        };
    },

    一级: async function () {
        let { input } = this;
        let list = (await getHtml(input)).data.data.hitDocs;
        let videos = list.map(item => ({
            url: item.playPartId,
            title: item.title,
            desc: item.updateInfo || item.rightCorner?.text || '',
            pic_url: item.img
        }));
        return setResult(videos);
    },

    二级: async function () {
        let { input } = this;
        let VOD = {};
        let d = [];

        // 请求剧集列表
        let json = (await getHtml(input)).data;
        let host = 'https://www.mgtv.com';
        let ourl = json.data.list.length > 0 
            ? json.data.list[0].url 
            : json.data.series[0].url;

        if (!/^https?:\/\//.test(ourl)) {
            ourl = host + ourl;
        }

        // 请求详情页
        let html = (await getHtml({
            url: ourl,
            headers: { 'User-Agent': MOBILE_UA }
        })).data;

        // 处理跳转
        if (html.includes("window.location =")) {
            console.log("检测到跳转，正在获取新ourl...");
            ourl = html.match(/url=(.*)/)?.[1]?.trim() || ourl;
            html = (await getHtml(ourl)).data;
        }

        // 解析基本信息
        try {
            const $ = pq(html);
            const scriptText = $('script:contains(__INITIAL_STATE__)').html();
            const state = JSON.parse(scriptText.replace('window.__INITIAL_STATE__=', ''));
            const js = state.playPage.videoinfo;

            VOD.vod_name = js.clipName || js['0'] || '未知标题';
            VOD.type_name = js['0'] || '';
            VOD.vod_area = js['1'] || '';
            VOD.vod_actor = (js['4'] || '').substr(0, 25);
            VOD.vod_director = js['3'] || '';
            VOD.vod_remarks = js['3'] || '已完结';
            VOD.vod_pic = js.colImage || '';
            VOD.vod_content = js['5'] || '暂无简介';

            if (!VOD.vod_name) VOD.vod_name = VOD.type_name;
        } catch (e) {
            console.error("解析影片信息失败:", e.message);
        }

        // 图片清晰度增强函数
        function getRjpg(imgUrl, xs = 3) {
            if (!imgUrl || !/jpg_/.test(imgUrl)) return imgUrl;
            let picSize = imgUrl.split("jpg_")[1].split(".")[0];
            if (!picSize) return imgUrl;
            let [w, h] = picSize.split("x").map(n => parseInt(n) * xs);
            let rjpg = `${w}x${h}.jpg`;
            return imgUrl.replace(/jpg_.*?\.jpg/, `jpg_${rjpg}`);
        }

        // 构建播放列表（使用组合标题：日期 + 标题）
        if (json.data.total === 1 && json.data.list.length === 1) {
            let data = json.data.list[0];
            let url = host + data.url;
            let displayTitle = `${data.t4} ${data.t2}`.trim(); // 组合日期与标题
            d.push({
                title: displayTitle,
                desc: data.t2,
                pic_url: getRjpg(data.img),
                url: url
            });
        } else if (json.data.list.length > 1) {
            // 分页获取完整列表
            for (let i = 1; i <= json.data.total_page; i++) {
                if (i > 1) {
                    let pageUrl = input.replace(/page=\d+/, `page=${i}`);
                    json = (await getHtml(pageUrl)).data;
                }
                json.data.list.forEach(data => {
                    if (data.isIntact === "1") {
                        let url = host + data.url;
                        let displayTitle = `${data.t4} ${data.t2}`.trim();
                        d.push({
                            title: displayTitle,
                            desc: data.t2,
                            pic_url: getRjpg(data.img),
                            url: url
                        });
                    }
                });
            }
        } else {
            console.log(input + " 暂无片源");
        }

        // 设置播放源
        VOD.vod_play_from = '芒果TV';
        VOD.vod_play_url = d.map(it => `${it.title}$${it.url}`).join('#');

        return VOD;
    },

    搜索: async function () {
        let { input } = this;
        let d = [];
        let json = (await getHtml(input)).data;

        json.data.contents.forEach(content => {
            if (content.type === 'media') {
                let item = content.data[0];
                let desc = item.desc?.join(',') || '';
                let fyclass = '';

                if (item.source === 'imgo') {
                    let img = item.img || '';
                    try {
                        fyclass = item.rpt.match(/idx=(.*?)&/)[1] + '$';
                    } catch (e) {
                        console.log('分类提取失败:', e.message);
                    }

                    d.push({
                        title: item.title.replace(/<B>|<\/B>/g, ''),
                        img: img,
                        content: '',
                        desc: desc,
                        url: fyclass + item.url.match(/.*\/(.*?)\.html/)[1]
                    });
                }
            }
        });

        return setResult(d);
    },

    proxy_rule: async function (params) {
        let { input } = this;
        console.log('[proxy_rule] 请求弹幕:', input);
        let resp = await getHtml({
            url: decodeURIComponent(input),
            method: 'GET',
            headers: { 'User-Agent': PC_UA }
        });

        let damu = await getDanmu(resp.data);
        return [200, 'text/xml', damu];
    }
};

// 弹幕处理函数
async function getDanmu(data) {
    let danmu = '<i>';
    if (!data || !data.data) return danmu + '</i>';

    const cdn = data.data.cdn_list?.split(",")[0];
    const version = data.data.cdn_version;
    if (!cdn || !version) return danmu + '</i>';

    const urls = Array.from({ length: 121 }, (_, i) =>
        `https://${cdn}/${version}/${i}.json`
    );

    try {
        const responses = await Promise.allSettled(urls.map(url => getHtml(url)));
        responses.forEach(result => {
            if (result.status === 'fulfilled') {
                const list = result.value.data;
                if (list?.data?.items) {
                    list.data.items.forEach(item => {
                        danmu += `<d p="${item.time / 1000},1,25,${gcolor()}">${item.content}</d>`;
                    });
                }
            }
        });
    } catch (error) {
        console.error("加载弹幕失败:", error);
    }

    danmu += '</i>';
    console.log("弹幕加载完成");
    return danmu;
}

// 随机颜色生成
function gcolor() {
    let r = Math.floor(Math.random() * 256);
    let g = Math.floor(Math.random() * 256);
    let b = Math.floor(Math.random() * 256);
    return (r << 16) + (g << 8) + b; // 转为十进制颜色值
}
