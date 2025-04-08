---
layout: post
title: useEffect指南
categories:
  - React
tags:
  - React

date: 2021-06-02 09:00:44
---

#### 每次渲染时，UseEffect 都是一个新的自己

每次重新渲染的时，useEffect 都会重新执行，而且如果没有添加依赖项数组的时候，每个 useEffect 都是全新的

而且 useEffect 内部用到的变量都是属于，当前此次执行时捕获到的变量，所以如下：

```javascript
function Counter() {
  const [count, setCount] = useState(0);

  function handleAlertClick() {
    setTimeout(() => {
      alert("You clicked on: " + count);
    }, 3000);
  }

  return (
    <div>
      <p>You clicked {count} times</p>
      <button onClick={() => setCount(count + 1)}>Click me</button>
      <button onClick={handleAlertClick}>Show alert</button>
    </div>
  );
}
```

点击 alert 按钮之后快速点击 click 按钮，在定时器结束之后并不会弹出修改后的值，而是弹出在点击 alert 时 useEffect 捕获到的状态

如果你想读取一个过去或是未来的值，你可以用一个 Ref 去保存，因此对数据的操作不是在 react 的默认行为中，这样虽然显得代码不够干净，但可以确认是需要这样做。

#### useEffect 中的清理

React 只会在浏览器绘制后运行 effects。这使得你的应用更流畅因为大多数 effects 并不会阻塞屏幕的更新。Effect 的清除同样被延迟了。**上一次的 effect 会在重新渲染后被清除**

执行的过程应该是: **渲染新 UI -> 清除旧的 Effect -> 执行新的 Effect**

**清除函数只能读取到在旧的 Effect 执行时捕获到的变量**

#### Effect 依赖

React 它统一描述了初始渲染和之后的更新，React 会根据我们当前的 props 和 state 同步到 DOM，useEffect 使你能够根据 props 和 state 同步 React tree 之外的东西，也包括常说的副作用。

如果你试图写一个 effect 会根据是否第一次渲染而表现不一致，可能违背了 React 初衷

但是如果诚实的告诉了 Effect 依赖，还可能存在问题:

```javascript
useEffect(() => {
  const id = setInterval(() => {
    setCount(count + 1);
  }, 1000);
  return () => clearInterval(id);
}, [count]);
```

由于依赖项的改变定时器被清除

有两种方法可以解决，使用 setState 回调函数，或者使用 useReducer, **如果 useReducer 还需要依赖其他的内部变量，可以吧 useReducer 放到函数组建内部定义**

有的时候可能会觉得一个函数不会变换，所以没有加到依赖中，但事实上

```javascript
function SearchResults() {
  const [query, setQuery] = useState("react");

  function getFetchUrl() {
    return "https://hn.algolia.com/api/v1/search?query=" + query;
  }

  async function fetchData() {
    const result = await axios(getFetchUrl());
    setData(result.data);
  }

  useEffect(() => {
    fetchData();
  }, []);
}
```

函数依赖的参数可能在其他的方法中变化

简单处理的话可以吧相关的函数都放到 useEffect 中，而依赖项只是简单的 query

**另外也可以吧 getFetchUrl 放到组件外部，把 query 当做参数传入，或者使用 useCallback 包裹 getFetchUrl**

#### 竞态问题

```javascript
class Article extends Component {
  state = {
    article: null,
  };
  componentDidMount() {
    this.fetchData(this.props.id);
  }
  componentDidUpdate(prevProps) {
    if (prevProps.id !== this.props.id) {
      this.fetchData(this.props.id);
    }
  }
  async fetchData(id) {
    const article = await API.fetchArticle(id);
    this.setState({ article });
  }
  // ...
}
```

如果 componentDidUpdate 中的请求比 componentDidMount 中的请求慢，那么更新中的请求数据会被初始化的请求数据覆盖

我们想做的是，可以打断旧的更新

```javascript
function Article({ id }) {
  const [article, setArticle] = useState(null);

  useEffect(() => {
    let didCancel = false;

    async function fetchData() {
      const article = await API.fetchArticle(id);
      if (!didCancel) {
        setArticle(article);
      }
    }
    fetchData();
    return () => {
      didCancel = true;
    };
  }, [id]);
}
```
