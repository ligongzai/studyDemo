const superagent =require("superagent");
const cheerio = require("cheerio");
const nodemailer = require("nodemailer");
const ejs = require("ejs");
const fs = require("fs");
const path = require("path");
const schedule = require("node-schedule");

const city = "hubei/wuhan";
const oneUrl = "http://wufazhuce.com/";
const WeatherUrl = "https://tianqi.moji.com/weather/china/"+city;
const startDay = '2017/10/28';
async function getOnedata(){
    let oneData = new Promise((resolve, reject) =>  {
        superagent.get(oneUrl).end(function (err, res) {
            if (err){
                reject(err);
            }
            let $ = cheerio.load(res.text);
            let selectItem = $("#carousel-one .carousel-inner .item");
            let todayOne = selectItem[0];
            let todayOneData = {
                imgUrl: $(todayOne)
                    .find(".fp-one-imagen")
                    .attr("src"),
                type: $(todayOne)
                    .find(".fp-one-imagen-footer")
                    .text()
                    .replace(/(^\s*)|(\s*$)/g, ""),
                text: $(todayOne)
                    .find(".fp-one-cita")
                    .text()
                    .replace(/(^\s*)|(\s*$)/g, "")
            };
            resolve(todayOneData);
        });
    });
    return oneData;
}

// 获取天气预报
async function getWeatherData(){
    let p = new Promise(function(resolve,reject){
        superagent.get(WeatherUrl).end(function(err, res) {
            if (err) {
                reject(err);
            }
            let threeDaysData = [];
            let weatherTip = "";
            let $ = cheerio.load(res.text);
            $(".forecast .days").each(function(i, elem) {
                const SingleDay = $(elem).find("li");
                threeDaysData.push({
                    Day: $(SingleDay[0])
                        .text()
                        .replace(/(^\s*)|(\s*$)/g, ""),
                    WeatherImgUrl: $(SingleDay[1])
                        .find("img")
                        .attr("src"),
                    WeatherText: $(SingleDay[1])
                        .text()
                        .replace(/(^\s*)|(\s*$)/g, ""),
                    Temperature: $(SingleDay[2])
                        .text()
                        .replace(/(^\s*)|(\s*$)/g, ""),
                    WindDirection: $(SingleDay[3])
                        .find("em")
                        .text()
                        .replace(/(^\s*)|(\s*$)/g, ""),
                    WindLevel: $(SingleDay[3])
                        .find("b")
                        .text()
                        .replace(/(^\s*)|(\s*$)/g, ""),
                    Pollution: $(SingleDay[4])
                        .text()
                        .replace(/(^\s*)|(\s*$)/g, ""),
                    PollutionLevel: $(SingleDay[4])
                        .find("strong")
                        .attr("class")
                });
            });
            resolve({"weather":threeDaysData});
        });
    });
    return p
}

// 获取天气提醒
async function getWeatherTips(){
    let p = new Promise(function(resolve,reject){
        superagent.get(WeatherUrl).end(function(err, res) {
            if (err) {
                reject(err);
            }
            let threeDaysData = [];
            let weatherTip = "";
            let $ = cheerio.load(res.text);
            $(".wea_tips").each(function(i, elem) {
                weatherTip = $(elem)
                    .find("em")
                    .text();
            });
            resolve({"weatherTip": weatherTip});
        });
    })
    return p
}

let transportar = nodemailer.createTransport({
    service: '163',
    auth:{
        user: '********@163.com',
        pass: '********'
    }
});

let mailOption = {
    from: '********@163.com',
    to: '445402841@qq.com',
    subject: '天干物燥，小心火烛',
    text: 'Test,hello world',
    html: '<b>hello world</b>'
};

Promise.all([getOnedata(),getWeatherData(),getWeatherTips()]).then(data => {
    const data_json = {};
    data.map((value)=>{
        Object.assign(data_json,value);
    });
    let initDay = new Date(startDay);
    data_json.continueDay = Math.floor((new Date() - initDay) / 1000 / 60 / 60 / 24);
    const template = ejs.compile(fs.readFileSync(path.resolve(__dirname,'email.ejs')).toString());
    mailOption.html = template(data_json);
    transportar.sendMail(mailOption,function (err,info) {
    if (err){
        console.log(err)
    } else {
        console.log('Message sent'+ info.response);
    }
});
});

