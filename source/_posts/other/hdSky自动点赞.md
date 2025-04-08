---
layout: posts
title: Puppeteer + 火山 OCR 实现自动登录和爬虫操作
date: 2025-03-01 11:12:00
categories:
  - 其他
tags:
  - Puppeteer
---

#### 火山 OCR Api 接入

需要在用户中心获取 AK,SK 密钥

```js
// request.js

"use strict";

const crypto = require("crypto");
const util = require("util");
const url = require("url");
const qs = require("querystring");
const fs = require("fs");

/**
 * 不参与加签过程的 header key
 */
const HEADER_KEYS_TO_IGNORE = new Set([
  "authorization",
  "content-type",
  "content-length",
  "user-agent",
  "presigned-expires",
  "expect",
]);

// do request example
function request(signParams) {
  signParams.headers = {
    ...signParams.headers,
    ["X-Date"]: getDateTimeNow(),
  };
  signParams.bodySha = getBodySha(signParams.body);

  // 正规化 query object， 防止串化后出现 query 值为 undefined 情况
  for (const [key, val] of Object.entries(signParams.query)) {
    if (val === undefined || val === null) {
      signParams.query[key] = "";
    }
  }
  const authorization = sign(signParams);
  return fetch(
    `https://iam.volcengineapi.com/?${qs.stringify(signParams.query)}`,
    {
      headers: {
        ...signParams.headers,
        Authorization: authorization,
      },
      method: signParams.method,
      body: signParams.body,
    }
  );
}

function sign(params) {
  const {
    headers = {},
    query = {},
    region = "",
    serviceName = "",
    method = "",
    pathName = "/",
    accessKeyId = "",
    secretAccessKey = "",
    needSignHeaderKeys = [],
    bodySha,
  } = params;

  const datetime = headers["X-Date"];
  const date = datetime.substring(0, 8); // YYYYMMDD
  // 创建正规化请求
  const [signedHeaders, canonicalHeaders] = getSignHeaders(
    headers,
    needSignHeaderKeys
  );
  const canonicalRequest = [
    method.toUpperCase(),
    pathName,
    queryParamsToString(query) || "",
    `${canonicalHeaders}\n`,
    signedHeaders,
    bodySha || hash(""),
  ].join("\n");

  const credentialScope = [date, region, serviceName, "request"].join("/");
  // 创建签名字符串
  const stringToSign = [
    "HMAC-SHA256",
    datetime,
    credentialScope,
    hash(canonicalRequest),
  ].join("\n");
  // 计算签名
  const kDate = hmac(secretAccessKey, date);
  const kRegion = hmac(kDate, region);
  const kService = hmac(kRegion, serviceName);
  const kSigning = hmac(kService, "request");
  const signature = hmac(kSigning, stringToSign).toString("hex");

  return [
    "HMAC-SHA256",
    `Credential=${accessKeyId}/${credentialScope},`,
    `SignedHeaders=${signedHeaders},`,
    `Signature=${signature}`,
  ].join(" ");
}

function hmac(secret, s) {
  return crypto.createHmac("sha256", secret).update(s, "utf8").digest();
}

function hash(s) {
  return crypto.createHash("sha256").update(s, "utf8").digest("hex");
}

function queryParamsToString(params) {
  return Object.keys(params)
    .sort()
    .map((key) => {
      const val = params[key];
      if (typeof val === "undefined" || val === null) {
        return undefined;
      }
      const escapedKey = uriEscape(key);
      if (!escapedKey) {
        return undefined;
      }
      if (Array.isArray(val)) {
        return `${escapedKey}=${val
          .map(uriEscape)
          .sort()
          .join(`&${escapedKey}=`)}`;
      }
      return `${escapedKey}=${uriEscape(val)}`;
    })
    .filter((v) => v)
    .join("&");
}

function getSignHeaders(originHeaders, needSignHeaders) {
  function trimHeaderValue(header) {
    return header.toString?.().trim().replace(/\s+/g, " ") ?? "";
  }

  let h = Object.keys(originHeaders);
  // 根据 needSignHeaders 过滤
  if (Array.isArray(needSignHeaders)) {
    const needSignSet = new Set(
      [...needSignHeaders, "x-date", "host"].map((k) => k.toLowerCase())
    );
    h = h.filter((k) => needSignSet.has(k.toLowerCase()));
  }
  // 根据 ignore headers 过滤
  h = h.filter((k) => !HEADER_KEYS_TO_IGNORE.has(k.toLowerCase()));
  const signedHeaderKeys = h
    .slice()
    .map((k) => k.toLowerCase())
    .sort()
    .join(";");
  const canonicalHeaders = h
    .sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : 1))
    .map((k) => `${k.toLowerCase()}:${trimHeaderValue(originHeaders[k])}`)
    .join("\n");
  return [signedHeaderKeys, canonicalHeaders];
}

function uriEscape(str) {
  try {
    return encodeURIComponent(str)
      .replace(/[^A-Za-z0-9_.~\-%]+/g, escape)
      .replace(
        /[*]/g,
        (ch) => `%${ch.charCodeAt(0).toString(16).toUpperCase()}`
      );
  } catch (e) {
    return "";
  }
}

function getDateTimeNow() {
  const now = new Date();
  return now.toISOString().replace(/[:-]|\.\d{3}/g, "");
}

// 获取 body sha256
function getBodySha(body) {
  const hash = crypto.createHash("sha256");
  if (typeof body === "string") {
    hash.update(body);
  } else if (body instanceof url.URLSearchParams) {
    hash.update(body.toString());
  } else if (util.isBuffer(body)) {
    hash.update(body);
  }
  return hash.digest("hex");
}

module.exports = request;
```

#### puppeteer 爬虫

```js
const puppeteer = require("puppeteer");
const fs = require("fs");

const request = require("./request");

// const { createWorker } = require("tesseract.js");

// const worker = await createWorker("eng");
// const ret = await worker.recognize(fs.readFileSync("./authCode.jpg"));
// console.log(ret.data.text);

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: { width: 1400, height: 900 },
  });
  const page = await browser.newPage();

  // 设置导航的默认超时时间为永不超时
  page.setDefaultNavigationTimeout(0);

  // 如果添加请求拦截器，需要添加下面一句代码
  // 如果使用响应拦截器，则不需要添加，添加会导致代码不向下执行
  //  await page.setRequestInterception(true);

  page.on("response", async (response) => {
    const url = response.url();

    // 拦截验证码图片，保存到本地
    if (url.includes("image.php")) {
      const img = await response.buffer();
      fs.writeFileSync(`./authCode.jpg`, img);
    }
  });

  await Promise.all([
    page.waitForNavigation(),
    page.goto("https://hdsky.me/login.php"),
  ]);

  await page.type("input[name='username']", "username");
  await page.type("input[name='password']", "password");

  // 调用 OCR api 识别验证码
  const AccessKeyId = "___YOUR_ACCESS_KEY___";
  const SecretKey = "___YOUR_SECRET_KEY___";

  const img = fs.readFileSync("./authCode.jpg");
  const imgBase64 = img.toString("base64");

  const body = new URLSearchParams();
  body.append("image_base64", imgBase64);

  const {
    data: {
      line_texts: [authCode],
    },
  } = await request({
    headers: {
      // 火山文档提示必传，但是 sdk 会过滤掉
      "content-type": "application/x-www-form-urlencoded",
    },
    method: "POST",
    // api 文档必填参数
    query: {
      Action: "OCRNormal",
      Version: "2020-08-26",
    },
    accessKeyId: AccessKeyId,
    secretAccessKey: SecretKey,
    serviceName: "cv",
    region: "cn-north-1",
    body,
  }).then((res) => res.json());

  console.log(authCode);

  await page.type("input[name='imagestring']", authCode);

  // 点击事件导致页面导航，需要等待导航结束
  await Promise.all([
    page.waitForNavigation(),
    page.click("input[type='submit']"),
  ]);

  await Promise.all([
    page.waitForNavigation(),
    page.click("a[href='torrents.php']"),
  ]);

  const loop = async (startPage) => {
    const list = await page.$$("table tr[class*=progresstr]");

    for (let i = 0; i < list.length; i++) {
      const item = list[i];

      // 监听新页面创建事件，并获取详情页的 page 对象
      const detailPromise = new Promise((resolve) => {
        browser.once("targetcreated", async (target) => {
          if (target.type() === "page") {
            const newPage = await target.page();
            resolve(newPage);
          }
        });
      });

      const a = await item.$(
        "td:nth-child(2) table > tbody > tr > td:nth-child(1) > a"
      );
      await a.click();

      const detailPage = await detailPromise;

      await detailPage.waitForSelector("#saythanks", {
        timeout: 0,
      });

      await detailPage.click("#saythanks");

      console.log(`第 ${startPage} 页，第 ${i + 1} 条已点赞`);

      await new Promise((resolve) => setTimeout(resolve, 4000));

      await detailPage.close();
    }
  };

  const loop2 = async () => {
    const startPage = fs.readFileSync("./skypage.txt", "utf8");

    const search = await page.$("input[type=number]:nth-child(2)");
    await search.click({ clickCount: 3 });
    await search.type(startPage);

    await Promise.all([
      page.waitForNavigation(),
      page.click("input[type=submit]:nth-child(3)"),
    ]);

    await loop(startPage);

    if (startPage > 0) {
      fs.writeFileSync("./skypage.txt", (startPage - 1).toString(), "utf8");
      loop2();
    }
  };

  loop2();

  // await browser.close();
})();
```

#### debian 执行任务报错

Failed to launch the browser process: error while loading shared libraries: libnss3.so: cannot open shared object file

可能是没想相关的执行环境安装以下依赖

```bash
sudo apt-get install libpangocairo-1.0-0 libx11-xcb1 libxcomposite1 libxcursor1 libxdamage1 libxi6 libxtst6 libnss3 libcups2 libxss1 libxrandr2 libasound2 libatk1.0-0 libgtk-3-0

sudo apt-get install -y libgbm-dev
```

