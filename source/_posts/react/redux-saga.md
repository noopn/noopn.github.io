---
title: React Saga 解析
mathjax: true
categories:
  - React
tags:
  - React

date: 2021-03-30 20:22:50
---

项目启动时 saga 启动一个生成器函数，并提供对应的指令，可以利用 saga 的中间件控制指令的执行。

#### 最小化应用

```js
// app.js
import { configureStore } from "@reduxjs/toolkit";
import createSagaMiddleware from "redux-saga";

import counterReducer from "./reducers/counterSlice";
import counterSaga from "./sagas/counterSaga";

import App from "./App";


const sagaMiddleware = createSagaMiddleware();

const store = configureStore({
  reducer: {
    counter: counterReducer, // Add counter slice reducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(sagaMiddleware), // Add saga middleware
});


sagaMiddleware.run(counterSaga);

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(//...);

```

```js
// sagas/counterSaga.js

import { takeEvery, put, delay } from "redux-saga/effects";
import { increment, setLoading } from "../reducers/counterSlice";

export const asyncIncrement = () => ({ type: "counter/asyncIncrement" });

function* handleAsyncIncrement() {
  yield put(setLoading(true));
  yield delay(1000);
  yield put(increment());
  yield put(setLoading(false));
}

function* counterSaga() {
  yield takeEvery("counter/asyncIncrement", handleAsyncIncrement);
}

export default counterSaga;
```

#### 指令

saga 的生成器函数执行完成，中间件就执行结束，无法再响应 action.

- take 监听某个 action,监听一次, yield 返回完整 action, 造成阻塞, 等待对应的 action 被触发。

- all 接受一个数组，数组中放入生成器，等待所有的生成器结束才会继续执行，可以用于拆分监听到不同的文件中，造成阻塞

  ```js
  // rootSaga.js
  import { takeEvery, put, delay, all } from "redux-saga/effects";
  import product from "./product";
  import counterSaga from "./counterSaga";

  export default function* () {
    yield all([counterSaga(), product()]);
    // 下面的代码不会执行，直到所有的生成器直接结束
  }
  ```

- takeEvery 循环监听 action,不会阻塞,也就是这个生成器永远不会结束。

  ```js
  export default function* () {
    yield takeEvery("some action", function* () {});
    // 下面的代码会执行，不会阻塞
  }
  ```

- delay 延迟执行,阻塞

  ```js
  export default function* () {
    yield delay(1000);
  }
  ```

- put 触发一个 action, 非阻塞

- call 用于副作用的函数调用，是否阻塞取决与调用的函数是否异步

  ```js
  function fetchData() {
    return new Promise((resolve) => setTimeout(resolve));
  }

  function fetchDataReject() {
    return new Promise((resolve, reject) => setTimeout(reject));
  }

  export default function* () {
    let data;
    try {
      data = yield fetchDataReject();
      // 如果报错，saga会通过生成器的throw抛出错误，
      // 需要自己处理
    } catch {}

    // 推荐使用 call 来处理异步
    data = yield call(fetchData, "调用参数");

    data = yield call(["this 的绑定对象"，fetchData], "自定义参数");
    // 效果相同
    data = yield call({context:this,fn:fetchData}, "自定义参数");
  }
  ```

- select 取出 store 中的数据

  ```js
  export default function* () {
    const state = yield select((store) => store);
  }
  ```

- cps 用于调用采用回调方式的异步函数

  ```js
  function asyncFn = ('调用参数',fn) => {
    setTimeout(fn,3000)
  }

  export default function* () {
    // 无需传入回调函数 saga 自动处理
    const state = yield cps(asyncFn,'调用参数');
  }
  ```

- fork 启用一个新任务，不会阻塞，返回一个 Task 内部对象，可以配合 cancel 取消本次任务
  cancel 不传递参数取消当前任务线。

  ```js
  function* nextTask() {}

  export default function* () {
    let task;
    while (true) {
      if (task) {
        yield cancel(task);
      }
      task = yield fork(nextTask);
    }
  }
  ```

- cancelled 判断当前任务线是否被取消掉。

- race 传递多个指令，其中一个结束就结束。

#### saga 简单实现

```js
export function createSagaMiddleware() {
  return function sagaMiddleware(store) {
    // 会使用到store中的数据，所以要写在里面

    const env = {
      store,
      channel: new Channel(),
    };
    sagaMiddleware.run = runSaga.bind(null, env);
    return function (next) {
      return function (action) {
        const result = next(action);
        // 触发 take 的订阅
        env.channel.put(action.type);

        return result;
      };
    };
  };
}

//
function runSaga(env, generatorFn) {
  const iterator = generatorFn();

  if (typeof generatorFn == "function") {
    //如果是普通函数直接执行
  }
  next();
  // nextValue 是给将要执行下一次迭代传递的值
  function next(nextValue, err, isOver) {
    let result;
    if (err) {
      result = iterator.throw(err);
    } else if (isOver) {
      result = iterator.return();
    } else {
      result = iterator.next(nextValue);
    }

    if (result.done) {
      return result;
    }

    // 解析 Effect 对象
    // { @@redux-saga/IO :true，combinator：true，payload：[],type: ALL

    solveResult(result.value);
  }

  function solveResult(effect) {
    if (EffectType[effect.type]) {
      runEffect(env, effect, next);
    } else {
      // 可以是 Promise 或是一般值
      if (effect instanceof Promise) {
        effect.then((res) => next(res)).catch((err) => next(void 0, err));
      } else {
        next(effect);
      }
    }
  }

  // 用于取消任务
  return new Task(next);
}

// 所有的指令都是返回Effect对象，通过不同的处理函数，执行effect对象
function createEffect(type, payload) {
  return {
    type,
    payload,
  };
}
// 接受store对象，
function runEffect(env, effect, next) {
  switch (effect.type) {
    case EffectType.CALL:
      handleCall(effect, next);
      break;
    case EffectType.PUT:
      handlePut(env, effect, next);
      break;
    case EffectType.TAKE:
      handleTake(env, effect, next);
      break;
    case EffectType.FORK:
      handleFork(env, effect, next);
      break;
    case EffectType.TAKE_EVERY:
      handleTakeEvery(env, effect, next);
      break;
    default:
      return;
  }
}

export function call(fn, ...args) {
  return createEffect(EffectType.CALL, [fn, args]);
}

function handleCall(effect, next) {
  const {
    payload: [fn, args],
  } = effect;
  if (typeof fn === "function") {
    const res = fn(...args);
    if (res instanceof Promise) {
      res.then((res) => next(res));
    } else {
      next(res);
    }
  }
}

// delay 就是用 call 实现的延迟方法
export function delay(timer = 0) {
  return call(function () {
    return new Promise((resolve) => {
      setTimeout(resolve, timer);
    });
  });
}

export function put(action) {
  return createEffect(EffectType.PUT, [action]);
}

function handlePut(env, effect, next) {
  const { dispatch } = env.store;
  const [action] = effect.payload;
  const res = dispatch(action);
  next(res);
}

export function take(action) {
  return createEffect(EffectType.TAKE, [action]);
}

// take 的阻塞行为意味着需要能监听dispatch被触发
// 使用观察者模式监听take的订阅
function handleTake(env, effect, next) {
  const { channel } = env;
  const [action] = effect.payload;

  channel.take(action.type, () => {
    next(action);
  });
}

export function fork(generatorFn) {
  return createEffect(EffectType.FORK, [generatorFn]);
}

// 接受一个generator
function handleFork(env, effect, next) {
  const [generatorFn] = effect.payload;
  const task = runSaga(env, generatorFn);

  next(task);
}

export function takeEvery(action, generatorFn) {
  return createEffect(EffectType.TAKE_EVERY, [action, generatorFn]);
}

function handleTakeEvery(env, effect, next) {
  const [action, generatorFn] = effect.payload;

  return fork(function* () {
    while (true) {
      yield take(action);
      yield fork(generatorFn);
    }
  });
}

export function all(generators) {
  return createEffect(EffectType.TAKE_EVERY, [generators]);
}

const EffectType = {
  ALL: "ALL",
  CALL: "CALL",
  PUT: "PUT",
  TAKE: "TAKE",
  FORK: "FORK",
  TAKE_EVERY: "TAKE_EVERY",
};

export class Channel {
  listeners = {};
  take(prop, fn) {
    if (!this.listeners[prop]) this.listeners[prop] = [];
    this.listeners[prop].push(fn);
  }

  // 触发监听
  put(prop, ...args) {
    if (!this.listeners[prop]) return;

    const listeners = this.listeners[prop];

    // 一定要先删除再运行，避免take中会再次添加新的监听
    this.listeners[prop] = void 0;

    listeners.forEach((fn) => {
      fn(...args);
    });
  }
}
class Task {
  constructor(next) {
    this.next = next;
  }
  cancel() {
    this.next(null, null, true);
  }
}
```
