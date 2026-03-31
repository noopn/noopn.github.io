---
title: Server Components 基础
mathjax: true
categories:
  - React
tags:
  - JSX
  - React

date: 2025-01-20 13:10:06
---

**SPA 应用渲染流程**

<iframe width="100%" height='1000' src="https://drawio.iftrue.me//?tags=%7B%7D&lightbox=1&highlight=0000ff&layers=1&nav=1&title=%E4%BC%A0%E7%BB%9F%E7%9A%84spa%E6%B5%81%E7%A8%8B.drawio&dark=auto#R%3Cmxfile%3E%3Cdiagram%20name%3D%22Page-1%22%20id%3D%22nwEGlTpRtDg5LKhyflMJ%22%3E7Zxbb6M4FMc%2FjaXuy4p7zCMk6VzU2ak2U%2B0zCU6ChsQRIb3sp99jYy7BziZDTTtUkaoWjs2BcH4%2B%2FI8diuzx5vlTFu3W32hMUmQZ8TOyJ8iyLMPD8IdZXgqLaWKnsKyyJBa22jBL%2FiXCaAjrIYnJ%2FqhjTmmaJ7tj44Jut2SRH9miLKNPx92WND0%2B6y5aEckwW0SpbP0nifN1YcWuUds%2Fk2S1Ls9sGqJlE5WdhWG%2FjmL61DDZU2SPM0rzYmvzPCYpu3vlfSmOuz3RWl1YRrb5JQcc9iQrjnmM0oP4eGg6Qr6DAoymHsIYhSNov3mArn%2BIq85fylsBH2DHNg%2Bb9C5ZkjTZwl64I1myITn4tiepMN%2FXthACk0dgY%2B0m30%2FTaLdP5tytAZaMLA7ZPnkkf5N9EX9upYdtTGKxV908vpNn9GcVDuZ0maTpmKY041dqL5dLa7GoejZaYm%2FuuR60yHdP3NBHkuXkuWESd%2FMTofCRshfoUraWoRZsY7H7VHNSdVk3GMFlx0iwuapc1%2BGDDRFBdTTnDG1lQD0UugjfoilGwYjFdOoi32chhsiGxWGDDi5eEHVw59h1XENPcG33HYMLEXo8EVt%2FjPCEhRQHKDCPYjvjRw05tHFE8FIZWm%2BByXypJ7Tee47bzX5lKgILY3WKQhi0PvJHbBvychCy2MIGtlDoS2Fd55tU3Eb22RN4ZgVpstqCbU7znG6ggWzjgD0EmS2li5%2FMFMPzTXgh6Zw%2BTWtDyA3QUDpkcT8AVbE6uL%2BeXff0kC1I%2B4GUR9mK5IrExi72f0OakTTKAcHj574iPuLQe5rAFdUp3DtGodovXRTXK45qPlxbjmz%2FjKPiI0qOIDrRS6PbjnXYn77gCtbWeWr6Co81i9XNuhRPS43nLdMG7OFiMh5ZJgLBwC2QhgKbJaDPP77dyennN%2BT0%2FIOiyekRkU1Um2m6b1Id8zjwltGRVM8540gTqa6tPo9GUm0lqZBFQdGyByPkz2mPpNIdgaYwjvZrjppZNIsaBvfM8PknYpPhJqrvlm0l9JyODEuDoe2oL4Yd7Qw7SpUXAsZFkgWY7VLuGRzvCfthqiBAocfLNgNhk1F9R6M42a5gc7ZLoBxWaMFBIa4pTR%2FeDPC2CrDaivFSwNu6RHLUk5wo9zUC7l4kJ1ymeQOrnoUo9C90mzooDFnaZpaS9K8z%2BB0CPCm5Co63ERy2pUlwSI56Sta2pZ1l7yLB8UssDzk%2FfwAJYnct%2BKTh0VPBJ1Gtv%2BAbKSUIwBw6Qj2HcE7j4Qv8YuQCwtgRLIfesBEevMRwutaBbYkhOepJYjj660B8kcQAkl1GMkvLE5air7rhLXSD07XIa6dqyVFPGdbRX%2BT5CkD5uhuUd4VK8A0FoExS2GK6PwxY%2F1ciu6V86h8stwm7Xg7d%2ByqEsziKKBl%2FekdRKil7rR5oLfM4o660nnN0gtbaUdmRLpd7krcQ7ABdeYeOqOMrg77J1hnKaYOvs%2B9%2FDfsh%2FgF0qONr0qGSo76ypK89S5qqhTGHT3jd1t9TKIFVJswTsnXIcA9eoVbkvFahSo56UqjleXSibSnQ5t%2FPCLxGUpYmdUUTrsm2jBs%2BKKYIh3yqwePiFrTuGPkBn44Y8akGPl7CwgUW6x9slFiDmDAb%2FEqy23XqVxo%2BbzT16%2Bqf%2BjVVC3Ty4gbwOkHY5yoXsHbLuYabe4CuWM94%2BHJdynjfLO51nf5tDwzJUU88e%2Fqnf03VYt2Jr0aEKn0ygMT7AWYcvK5zum1RLjnqSUt7%2Bud0TdWy27X4%2Bz2Lv1HX3NomX3LUE7CjHnKram3tWvwNXTaMuubitmyQHPUkG0Y95GLVAptc%2FHnlZC%2Bn3h%2BfLfU8fqTB%2BwQocLhTk7%2FL4TJHvnst9d6i1MOmplJPctQT4%2BV5dDKuWoO7lnqDzNm464qdNDB6WrGTeNa%2FYmeqluyqVI3ZK1b8Vbn777MfXI5IZeAAMu8HqPVw5%2FU654yjnqRzeR6dL2xcF%2FqGU%2Bv5umo9yVFPwPr6a73qlb1rrfeRdIPvatINkqOedEN5no5ow2799n7Rvf4nCPb0Pw%3D%3D%3C%2Fdiagram%3E%3C%2Fmxfile%3E#%7B%22pageId%22%3A%22nwEGlTpRtDg5LKhyflMJ%22%7D"></iframe>

**简单服务器组件渲染流程**

<iframe width="100%" height='1000' src="https://drawio.iftrue.me//?tags=%7B%7D&lightbox=1&highlight=0000ff&layers=1&nav=1&title=%E7%AE%80%E5%8D%95%E6%9C%8D%E5%8A%A1%E5%99%A8%E7%BB%84%E4%BB%B6.drawio&dark=auto#R%3Cmxfile%3E%3Cdiagram%20id%3D%22VM3QsThMvPo_m00VUtUE%22%20name%3D%22Page-1%22%3E7Vzrb5tIEP9rkNKTeuJhMHwEG1%2BvanVRnOru24nA2kbFxoJ1HvfX38w%2BeHjXiZOQR1tLlQqzyxrv%2FHZmfjPjGM5kfftHlWxXX8uMFIZtZreGMzVs2zY9H%2F5DyR2XWJY%2F4pJllWdC1grm%2BX9ECE0h3eUZqXsTaVkWNN%2F2hWm52ZCU9mRJVZU3%2FWmLsuh%2F6jZZEkUwT5NClf6dZ3TFpb5rtvJPJF%2Bu5CdbphhZJ3KyENSrJCtvOiInNpxJVZaUX61vJ6TA3ZP7wp%2BbHRhtXqwiG3rMAzSn8KXYQ9dJsRPfz4g9I4gN3zLisRHChYkXfmD4oDnzgiSwp7AwzpoY%2FtSIXcMPjZBPj4xwhhdRZIBa4xFeRB7MP7uYTz6w50DmG34M13NSXZMKLsKU5uWmFstGrvxwmBfh%2BgEsEos9o3dSEZTcwteMalqV38mkLMoK5JtyA8PRIi%2BKPdGKrgu4s3C03FABLNx1fi8WxnF4K5qDxsMiX25Ats6zDAejRAhS2GF4cycSuwfzye1BLViNbuFUkHJNaHUHU%2BQDnsD%2FnTwi%2FPamBZcrIbTqAGskZInA87JZuVU5XAit6xFQ7670IPhN6onrFxTtMkWYqGIcmhiBL4YCz4gDhAnoOvZRU4GFegS84BBH0wgnIxhCdgHKZQv67Bp0HYRiDiAjmOFFOGbaV%2FDwIjCw9mFgvzYMHKsPA1eFga2DgT0ADHY1HkPFDoBWRrjpXJegJzjG32DqB0UHYMm2eLlbF1%2FyBSlyttVbUuXwLrhD00KIz1tZdLPKKZlvkxQfvQF30VcPGHCawCNVc18UybbOr9inmiCpSLqr6vyaXJCa6xGl5Y7iJ00a%2B2%2FuIcGwncViYaepAhsYybwrz%2FUEGg7JW2PxfMXLcyz9oakq3tIp3nLcAVR%2FhQ5Rq31%2B8GZ4pPEostMeBIgHgEHEH%2FsZkOCnRI%2BEK98duaaKhJ58SCQ43ptCoRbuWBcP7Hn6DhK4E%2F8JgJAlxF9ogeClPrlaqEDoyYcEgue%2FLRAsDQh8jAWjGbr6gMWFPNwDHGB0aBtRoECgo7h9V3pVUlquYYBsshCDcpQVZfodVVjuNhnJhJYeb6D5e5BMCeP3th%2FetdxVKdn3gTSploQq5lHVVkWKhALU%2BhRDs%2FHsUfiayV1nwrbMN7TurHyOghYEjbeXIPDNPSXyFVuVNq92nJZtvZZnLCID62%2BhWvHwg%2FtnEjj5oYNn%2FtPl1y%2FqiX8ZdT9ohZ%2Bm7p7f62q8tYKvrXDX7StcMt7BFO5oFQ5nOhgJlgWROhp5CNynvRB8HwLP03y5JTAUZUm9Ynq3%2BLAIxf2HMfGgQX4aJroO8J0YAQUT3sCYGB1jBGzz8%2Fwfxs4BLiPGz%2BBiiv%2FAGpwnd0WZZCeD8NLKd4Y2CK422APaH3HDD5YB7f18V8OJrQlDQGMnGOXnyaGA5QEwMpgaIa54hjdhKMgjzI48RvsBTbNn4%2BTZ5uO1EbR7JxGEMxoWP5uSEl2oyPIGaCR4DoiBJgoZl%2BTOZdzJHMnUT2tjWPYQgNdkjmyvwAzPFWyit8QrloGasmhU5ihwL5OUfuSn9WNWrj%2BSeg3fQB5fdQ0Pk5rg4tDeWfg6uAbgprosz%2FMtSYBUzCmsulYAK1JOHdzKjFBBFvS%2BzFGFrCRp6YpQIazqRoY7xZV2tBTMxXpEWuteaiKWs4bJVI2DPVg5GnYSaNjJINzE09ssniN0MTGJOGMZytCU%2BUjnPghK5J1NVrvNd%2FJ8R3aKb57u4oKBXdxYA5cjjcfvaZHjdgrTkeXXre1gzg8MF4%2BffUyNprAGJbOqXM8ITVc6iwMYBJfpdQDroe%2BMWNnDnzJWrfhf%2BAhYP0JH%2FO1PuSp87%2B77vDVgH%2FSoBzLmP52LHQ3sYmv%2FmPgcqVqMkVeTqb%2B3Fvd5bohCXIRsDueaiMZT%2FP6yxk2W8QYDR6AFh0rojwfH4KA4%2BcKnw8UdGC6yg6KHF5cZk%2BCRMFFi59hmHnHCjJKJWQJeLsa6ER9iuYJPd1kFXvLtQ6xflQN6Q9sg60CxAMDDOD%2BE3AGr3vuhRI4pYnUc4gmCCAGjBExnDHCxaAKB5dDVzVjvQSjieJ6V9FnaIWaoDWVcF1mvlZF6sCIxUPTz7ksU3sAlCkww%2FAvcWYMwDyNi0ZswYryuAYZnhICHka4phdkvbGXhyatuj8OI8cP4QLJBQg6JA69%2FOqwiek8TlCaR1sbv3eWb5pdjzsgeoGWVFXfq4fJp3Wl2Ob65pYb18s3yC0ttTF1NCf24ZgqZhtBY3b3a3fP6Kew9UGo6aayRJj3hDVI6tTVg1RDOGo4wvaySTZ1j75s%2BP6UyQU42%2BVCoM6uYjwcLBvpiePsBHO2vQg3Hg4dz%2BnqetoAbmbpMq1rNOTHAFw3pxwOnt9Ds6wxOgFZC%2BKdG%2BUfn5AVATknve5Levq4lx9Z4FWcQr6Iv0%2B4zfaltHmmYvb7agwUYmYt8a0fx6xJ9f%2BiivqUr7LrIkUThdsywIIPK1koczgFwSJ1iifcRSwT20IjRldUUFi9%2FqfFYqu6x501BspCaseg15L8gmBqBe6Lqr91NaA6eCDqy1AZbw1E0pwmQ1qOID2fXZhuoaojPyTa9F2SNh0aWrgjWZBaDhvme%2FzW%2FFLxGaWA709dsk6I41MB%2B4j7DRjmWNbDTQvJzkAL7noh1IXxp3RYLcbCaPu2U3l0sf6Ap4f5ONh5hwK%2FaJpVfMxPH25X2ayK8AhJ3koJKSvLEsu5jWZal6y3SJe8G%2BTWkpSuoqs1Fh4nXUTkWXV8ILAv%2BrAfUhrupuOp3yAWTN3d%2BD3K3gZzfD0DmrMHb9mVWYQ%2BVSvOi4PwsohYwBevDfrBxQdJyk%2BZFniC8PugxiL%2F1nnQSRAGuHLltX69KGN8ad6egq0Hd80pvcNv%2B3QE%2Bvf3zDU78Pw%3D%3D%3C%2Fdiagram%3E%3C%2Fmxfile%3E"></iframe>


**想要使用 RSC 必须要添加 condition 环境变量**

```bash
node --conditions=react-server --watch server/app.js
```

在 RSC 架构中，组件被分为两类：

- 服务端组件 (RSC)：在服务器运行，直接读数据库，禁止使用 useState 或 useEffect。

- 客户端组件 (CC)：在浏览器运行，可以使用所有 Hook。

在编写服务端组件时，由于 Node.js 环境里依然能引用到完整的 react 包，可能会不小心写下 useState。这时程序不会报错，但会导致逻辑混乱。React 团队通过 exports 条件导出 解决了这个问题： 当 Node.js 开启了 react-server 条件时， import React from 'react' 拿到的其实是一个 阉割版的 React，它根本没有 useState 这些导出。一旦你误用，代码在服务器编译阶段就会直接报错，从而保证了 RSC 的纯净性。

```json
// React package.json 条件导出定义
{
	"exports": {
		".": {
			"react-server": "./react.react-server.js",
			"default": "./index.js"
		},
		"./package.json": "./package.json",
		"./jsx-runtime": {
			"react-server": "./jsx-runtime.react-server.js",
			"default": "./jsx-runtime.js"
		},
		"./jsx-dev-runtime": "./jsx-dev-runtime.js"
	}
}
```


#### 创建一个 Server Component

当服务器拦截到客户端页面请求之后, 并不是像 SSR 渲染一样，直接返回渲染后的HTML字符串。而是会通过一个特定的API以流的方式返回给浏览器。

```js
import { renderToPipeableStream } from 'react-server-dom-esm/server'；

app.get('/rsc/:id', async (req, res) => {
  const { pipe } = renderToPipeableStream(<App/>);
  pipe(res);
})

// transfer-encoding chunked
```

在服务端 (Server Side) 任务是 序列化 (Serialization)。 它将 React 组件树（JSX）转化成一种特殊的、可流式传输的文本格式，最终返回的流的格式如下：

```bash
2:"$Sreact.suspense"
1:{"name":"App","env":"Server","owner":null}
0:D"$1"
4:{"name":"SearchResultsFallback","env":"Server","owner":"$1"}
3:D"$4"
3:[["$","li","0",{"children":["$","a",null,{"href":"#","children":[["$","img",null,{"src":"/img/fallback-ship.png","alt":"loading"},"$4"],"... loading"]},"$4"]},"$4"],["$","li","1",{"children":["$","a",null,{"href":"#","children":[["$","img",null,{"src":"/img/fallback-ship.png","alt":"loading"},"$4"],"... loading"]},"$4"]},"$4"],["$","li","2",{"children":["$","a",null,{"href":"#","children":[["$","img",null,{"src":"/img/fallback-ship.png","alt":"loading"},"$4"],"... loading"]},"$4"]},"$4"],["$","li","3",{"children":["$","a",null,{"href":"#","children":[["$","img",null,{"src":"/img/fallback-ship.png","alt":"loading"},"$4"],"... loading"]},"$4"]},"$4"],["$","li","4",{"children":["$","a",null,{"href":"#","children":[["$","img",null,{"src":"/img/fallback-ship.png","alt":"loading"},"$4"],"... loading"]},"$4"]},"$4"],["$","li","5",{"children":["$","a",null,{"href":"#","children":[["$","img",null,{"src":"/img/fallback-ship.png","alt":"loading"},"$4"],"... loading"]},"$4"]},"$4"],["$","li","6",{"children":["$","a",null,{"href":"#","children":[["$","img",null,{"src":"/img/fallback-ship.png","alt":"loading"},"$4"],"... loading"]},"$4"]},"$4"],["$","li","7",{"children":["$","a",null,{"href":"#","children":[["$","img",null,{"src":"/img/fallback-ship.png","alt":"loading"},"$4"],"... loading"]},"$4"]},"$4"],["$","li","8",{"children":["$","a",null,{"href":"#","children":[["$","img",null,{"src":"/img/fallback-ship.png","alt":"loading"},"$4"],"... loading"]},"$4"]},"$4"],["$","li","9",{"children":["$","a",null,{"href":"#","children":[["$","img",null,{"src":"/img/fallback-ship.png","alt":"loading"},"$4"],"... loading"]},"$4"]},"$4"],["$","li","10",{"children":["$","a",null,{"href":"#","children":[["$","img",null,{"src":"/img/fallback-ship.png","alt":"loading"},"$4"],"... loading"]},"$4"]},"$4"],["$","li","11",{"children":["$","a",null,{"href":"#","children":[["$","img",null,{"src":"/img/fallback-ship.png","alt":"loading"},"$4"],"... loading"]},"$4"]},"$4"]]
6:{"name":"SearchResults","env":"Server","owner":"$1"}
5:D"$6"
8:{"name":"ShipFallback","env":"Server","owner":"$1"}
```

通过 [RSC Parser](https://rsc-parser.vercel.app/) 查看被解析后的格式

在客户端 (Client Side)，任务是 反序列化与重建 (Reconstruction)。 它通过 createFromFetch 方法接收服务端传来的流，并将其重新“缝合”到浏览器当前的 React 树中。



```js
import { Suspense, createElement as h, startTransition, use } from 'react'
import { createRoot } from 'react-dom/client'
import { createFromFetch } from 'react-server-dom-esm/client'

const initialContentFetchPromise = fetch(`/rsc/something`)
const initialContentPromise = createFromFetch(initialContentFetchPromise)

function Root() {
	const content = use(initialContentPromise)
	return content
}

startTransition(() => {
	createRoot(document.getElementById('root')).render(<Root/>)
})

```

#### 数据获取

RSC的组件只会在服务端执行，所以它甚至可以直接在组件内部访问数据库，所有的数据获取直接写在组件中，就像是正常的后端代码一样。

```js
// ShipList.tsx (这是一个服务端组件)
import { db } from './db';

// 1. 注意：这是一个异步函数组件
export async function ShipList({ search }: { search: string }) {
  
  // 2. 直接访问数据库！没有 fetch，没有 API 路由，没有加载状态管理
  // 这段代码永远不会发送到浏览器，数据库凭证也不会泄露
  const ships = await db.ship.findMany({});

  return (
    <SomeComponent/>
  );
}
```

#### 使用 Suspense 

享用 RSC 组件带来的优点，必须要配额使用 Suspense 组件,下面这个代码示例中只有根组件使用了 Suspense

```js

// 客户端代码，请求服务器接口，获取入口组件
import { createFromFetch } from 'react-server-dom-esm/client'
const initialContentFetchPromise = fetch(`/rsc/${initialLocation}`)
const initialContentPromise = createFromFetch(initialContentFetchPromise)

function Root() {
	const content = use(initialContentPromise)
	return content
}
createRoot(document.getElementById('root')).render(<Suspense fallback={"loading..."}><Root/></Suspense>)
```

```js
// 入口服务器组件 app.js
export function App({ shipId, search }){
  return <div>
    <List/>
    <Detail/>
  <div>
}

export function List(){
  const data = await fetch("/data")
  return <ul></ul>
}

export function Detail(){
  const data = await fetch("/detail")
  return <p></p>
}

```

它的渲染流程是：

- root.render 触发，React 进入 Root 组件。
- use(initialContentPromise) 被调用。此时 fetch 刚刚开始，连第一个 RSC 数据块（Chunk）可能还没解析完。
- initialContentPromise 处于 Pending 状态。use 钩子会直接“抛出（throw）”这个 Promise。
- React 捕获到异常，立刻中断 Root 的渲染，转而渲染 loading...

- 服务器传回了第一批数据（比如 App 的外壳）。
- createFromFetch 解析了这部分数据，initialContentPromise 的状态被更新。React 被“唤醒”，重新尝试渲染 Root。
- 这次 use 返回了内容（即包含了两个异步服务端组件占位符的 content）。
  ```json
  {
    "type": "ul",
    "key": null,
    "props": {
        "children": {
            "_payload": {
                "status": "pending",
            },
        }
    },
  }
  ```
  但很快发现：内容里那两个服务端组件因为没用 Suspense 包裹，它们共用了根部的挂起逻辑。如果这两个组件的数据还没到，React 会再次因为它们而挂起,所以继续显示根组件的 loading...,导致 App 外壳必须等到所有子组件加载成功之后才能显示。

所以对于异步组件尽可能的细粒度的控制加载，通过 Suspense 及时渲染已经加载的组件

```js
export function App({ shipId, search }){
  return <div>
    <Suspense fallback={"loading..."}><List/></Suspense>
    <Suspense fallback={"loading..."}><Detail/></Suspense>
    <Detail/>
  <div>
}
```
#### 组件共享数据

因为 createContext API只能在客户端执行，所以在服务器组件中想要组件共享数据需要使用 nodeJS 中的一个API

```js
//list-storage.js
import { AsyncLocalStorage } from 'node:async_hooks'

export const listData = new AsyncLocalStorage()

// 回调函数执行作用域中可以直接访问到保存的storage
listData.run(data, () => {
  const { pipe } = renderToPipeableStream(<App/>)
  pipe(res)
})
```

```js
// List.js 
// 在其他组件中，消费数据
import { listData } from 'list-storage.js'；

export default List() {
  const data = listData.getStore();
  return <ul></ul>
}
```

#### Client Component

```jsx
import { EditableText } from './edit-text.js'
export async function ShipDetails() {
	const { shipId } = shipDataStorage.getStore()
	const ship = await getShip({ shipId })
	const shipImgSrc = getImageUrlForShip(ship.id, { size: 200 })
  return (
    <div>
      <EditableText text={ship.name} />
      <img src={shipImgSrc} alt={ship.name} />
      <h2>{ship.name}</h2>
      <p>{ship.description}</p>
    </div>
  )
}
```

```jsx
'use client'
export function EditableText({ id, shipId, initialValue = '' }) {
	const [edit, setEdit] = useState(false)
	const [value, setValue] = useState(initialValue)
	const inputRef = useRef(null)
	const buttonRef = useRef(null)
  return (
    <div>
      {edit ? (
        <input ref={inputRef} value={value} onChange={e => setValue(e.target.value)} />
      ) : (
        <span>{value}</span>
      )}
      <button ref={buttonRef} onClick={() => setEdit(!edit)}>
        {edit ? 'Save' : 'Edit'}
      </button>
    </div>
  )
}
```

当一个服务器组件需要交互的时候，必然会产生一些状态或是函数，如果想要实时验证这些状态，最好的办法是让这些操作发生在客户端而不是服务端，虽然客户端通可以过某种通讯机制与服务端通信，但是服务器是无状态的，这会非常浪费资源。

虽然状态与函数可以序列换，但是 RSC 的设计原则是：服务器组件不应该暴露任何状态或函数给客户端组件。 这就要求我们必须把这些状态和函数放在客户端组件中,可以通过 `'use client'` 标识一个组件是客户端组件, React 会在将这个组件发送给客户端前，把他处理为可以序列化的代码，并在 RSC Payload 中引用。

b:I["/edit-text.js", "EditableText"]
那如何把一个有 use client 标识的组件标记为我们能知道加载路径的状态呢

使用 `react-server-dom-esm/node-loader`, 需要配合 `import { register } from 'node:module` register是node中的一个特殊的api，可以在引用组件的文件的时候，和代码被执行之前，提供钩子做一些处理

获取所有的 export 并删除所有的import ， 用 `import {registerClientReference} from 'react-server-dom-es/server` 包装，第一个参数是一个函数， 直接抛出错误，说明不能在服务器调用，因为这个一个 `use client` 组件，第二个参数是一个字符串，是这个组件在服务器的绝对路径， 第三个参数是组件的名称


registerClientReference 函数会返回一个react 组件说明

```json
{
  "$$type": "Symbol(react.client.reference)",
  // 用#标识 组件名称
  "id": "/absolute/path/to/edit-text.js#EditableText",
}
```

在客户端使用的时候，不可以在 客户端组件内直接 import 服务端组件,因为服务端组件可以访问数据库等敏感资源

```jsx
// 错误写法
'use client'
import { ShipDetails } from './ShipDetails.js'
export function Detail() {
  return <ShipDetails/>
}
```

正确的写法是使用组合的模式

```jsx
'use client'
export function Detail({ShipDetails}) {
  return ShipDetails
} 
```

