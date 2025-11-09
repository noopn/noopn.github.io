---
layout: posts
title: React v16 源码分析 ⑧ commit阶段
mathjax: true
date: 2022-04-21 17:26:56
categories:
  - React
tags:
  - React
---

![](0001.png)

#### 预备工作

flushPassiveEffects 执行所有还没执行的副作用,因为执行的时候还可能产生额外的副作用,所以需要 while 判断. rootWithPendingPassiveEffect 表示是否有副作用标记

```js
do {
  flushPassiveEffects();
} while (rootWithPendingPassiveEffects !== null);

// 第一步执行所有的副作用销毁函数
// 一定要保证在执行副作用函数前,所有的销毁函数已经执行完成,但也有例外的情况
// 例如在兄弟组件中,一个组件的副作用销毁函数,是在兄弟组件的副作用创建函数中定义的
// 并且被添加在Ref 属性上通过引用的方式使用.

var unmountEffects = pendingPassiveHookEffectsUnmount;
for (var i = 0; i < unmountEffects.length; i += 2) {
  var destroy = _effect.destroy;
  destroy();
}

// 执行所有的副作用创建函数
var mountEffects = pendingPassiveHookEffectsMount;

for (var _i = 0; _i < mountEffects.length; _i += 2) {
  var _effect2 = mountEffects[_i];
  var create = effect.create;
  effect.destroy = create();
}

// 在副作用链表上 删除, 用于内存回收
while (effect !== null) {
  var nextNextEffect = effect.nextEffect;
  effect.nextEffect = null;
  effect = nextNextEffect;
}

// 如果与额外的副作产生则重新发起调度
flushSyncCallbackQueue();
```

将 rootFiber 添加到 effect 链表中, completeWork 中构建的 effect 链表只包涵它的子元素, 如果 rootFiber 有副作用需要把他添加到链表的最后. 最终的 effect 链表属于 rootFiber 的父元素

```js
if (finishedWork.flags > PerformedWork) {
  if (finishedWork.lastEffect !== null) {
    finishedWork.lastEffect.nextEffect = finishedWork;
    firstEffect = finishedWork.firstEffect;
  } else {
    firstEffect = finishedWork;
  }
} else {
  firstEffect = finishedWork.firstEffect;
}
```

#### commitBeforeMutationEffects

尽可能早的去调度 mutation effect

```js
while (nextEffect !== null) {
  var current = nextEffect.alternate;

  var flags = nextEffect.flags;

  // getSnapshotBeforeUpdate 将会执行
  if ((flags & Snapshot) !== NoFlags) {
    commitBeforeMutationLifeCycles(current, nextEffect);
  }

  if ((flags & Passive) !== NoFlags) {
    if (!rootDoesHavePassiveEffects) {
      rootDoesHavePassiveEffects = true;
      scheduleCallback(NormalPriority$1, function () {
        flushPassiveEffects();
        return null;
      });
    }
  }

  nextEffect = nextEffect.nextEffect;
}
```

#### scheduleCallback

<iframe width="100%"" height="600px" src="https://drawio.iftrue.me//?tags=%7B%7D&lightbox=1&highlight=0000ff&layers=1&nav=1&title=react-%E4%BB%BB%E5%8A%A1%E8%B0%83%E5%BA%A6.drawio#R%3Cmxfile%3E%3Cdiagram%20name%3D%22Page-1%22%20id%3D%22I8dDA_ut1OGJwieNgLdU%22%3E5Vlbj6M2FP41lnYfMuJmAo%2BQSbqtdrVbzVYr9aVyggN0AGeMmSTz62tjcxvIpZcMmfQJ89kG%2BzvfsY%2BPgTlLdz9RtIm%2BkAAnwNCCHTDvgWHoU8PhD4HsJeJCSwIhjQPVqAEe4hesQE2hRRzgvNOQEZKweNMFVyTL8Ip1MEQp2XabrUnS%2FesGhbgHPKxQ0kd%2FxAGLJOpArcE%2F4TiMqj%2FrmqpJUdVYAXmEArJtQeYcmDNKCJOldDfDiSCv4kX2WxyorQdGccbO6RD9%2FMsi2%2BTm06Pzu%2Fn1Rd%2B9fN1NpvIrzygp1ITVYNm%2BYgAHnBD1SiiLSEgylMwb1KekyAIsfqPxt6bNZ0I2HNQ5%2BCdmbK%2BsiwpGOBSxNFG18p%2FiRwfnpqCcFHSFj0wIKo0gGmJ2pJ1dW4BLF5MUM7rn%2FShOEIufu%2BNASkNh3a6hmRcU03%2BDddhjvchyhpYJ%2FiNfRTgoEjxDSbJEq8eeObpkb6OY4YcNKjnZchccIvYZU4Z3x6ntU6E6GK7S775WuHzfNu5Qe2vUcgVLuxB77q1p1j5Ts86Ymq1M3KZ9bgPXAd5ikP%2FPaMn3gg5nKInDjJdXnCJMOSCUGfPF1lMVaRwE0jw4j1%2BEQygDbUicsXJK0Afw%2Fpi01U6gOjfrb9syh3V10A8m2p2uOVbHFybql2dbQH39m5hNqwlZr3Nu%2BdcmqgfxL6xm%2FF%2BdRT%2BwrL2Rt5gD3gIBX0s9%2Bza8RSrrqLvYrttxF%2BPavcU%2BssTV1msjvg98jjjAXwCXI1aJ%2BKLK8YCn90xNI5Iui%2Fz0zt11uf9gHzdN4w52zaH1d3LdgP2dHF5qJ9dvLvx0zl2dRo0%2FnWGdc%2FXOS%2BlC4EEWp5j%2BWuACfyiVrgGHC9wVohaS5004Yn%2Fs2eutdQ21bnxqaNNK521dTwciVBNeStf9AP%2Bd61qvzt4nhW2Nuu3q5ygb5Y%2FvQNi6bt1VC%2BQ1afvmjl%2B6da62xz2AWT3iKX4qcM4%2BkZwdzBdcg2ydgUDjTUVr3FygoZ97DjJGjTT0fkjdEu13HmOQgo2u2V4MMb5gBzaydy7Yc0PjVnJ8DMH2Y%2BMqJfsN0zWh6Q9CH3%2FLYpbcYxQkcYaBYSd8Qn4QP%2FNiKIplrOEA168Oid4XnOcoxLMI8fN2UnXhQ2z3GtsP3N7SbcIzs72X84SBTMr79oQqxXLaEw6kWN7GE4x%2BwrfyhDLgqDScb1DWMYf9VIg7LX9FEkKB6YkRh0v0gX%2BPd9JePT6W5GprkrHJGqVxspddUpKRXEq%2Frs9L64habbOTOBc7m6hMmVcOA1HWqhJeM0lJoPplRLlRM8zG%2B%2BDre0zI6RJoeUlXv1X0wZJAjtyLsqALCsIgZ%2F1UW71uWynoH33GaD4jrVTXDEaGVVtpqrpta5URWEkQL0j1C0QvXysXEohWIq2%2Fy1XnnPnVVfXUGmVDsRLVLZ2GCm3fwKbZwuWy1Hx82qpTy1PTETZ13FtqPGz9%2FzXx5WvNfhvsakK164mnXuall0ilXXGoblXL7XiRz83lTqoJnF7vR82dVMNsEb9OijwS8c41ShUOpa%2FfVqr9E%2FmWk1VqbDgm9GzgyIzUHLizsjAts05uWbAE4hsiFSWqZsBxVSTpa3W0OV8An9fMytByDjwPzKfAmasbCc8CjiUQV2Sxhm4krjLyHLKvfaZ97UtdTxj9w2uOm0OrJHJJGwPbwmDeVFwIcaaFiU5eCI191DWnl0soArVLtu7omv3RnP8F%3C%2Fdiagram%3E%3C%2Fmxfile%3E"></iframe>

```js
// 获取当前时间
var startTime = getCurrentTime();
// 计算不同优先级任务的过期时间

var IMMEDIATE_PRIORITY_TIMEOUT = -1;
var USER_BLOCKING_PRIORITY = 250;
var NORMAL_PRIORITY_TIMEOUT = 5000;
var LOW_PRIORITY_TIMEOUT = 10000;
var IDLE_PRIORITY = 1073741823;

var expirationTime;
switch (currentPriorityLevel) {
  case ImmediatePriority:
    expirationTime = startTime + IMMEDIATE_PRIORITY_TIMEOUT;
    break;
  case UserBlockingPriority:
    expirationTime = startTime + USER_BLOCKING_PRIORITY;
  // ...
}

var expirationTime = startTime + timeout;

var newTask = {
  id: taskIdCounter++, // 任务id
  callback, //任务内容
  priorityLevel, // 任务优先级
  startTime, // 任务开始时间
  expirationTime, //任务过期时间
  sortIndex: -1, // 小顶堆，始终从任务队列中拿出最优先的任务
};

// 开始时间>当前时间说明是一个延时任务
if (startTime > currentTime) {
  newTask.sortIndex = startTime;

  // 放入到延迟队列中，小顶堆
  push(timerQueue, newTask);
  // 目前所有的任务都是延时任务，取出一个最早的延时任务
  if (peek(taskQueue) === null && newTask === peek(timerQueue)) {
    if (isHostTimeoutScheduled) {
      // Cancel an existing timeout.
      cancelHostTimeout();
    } else {
      isHostTimeoutScheduled = true;
    }
    // 调度一个延时任务
    requestHostTimeout(handleTimeout, startTime - currentTime);
  }
} else {
  newTask.sortIndex = expirationTime;
  // 放入普通任务队列，小顶堆
  push(taskQueue, newTask);
  if (enableProfiling) {
    markTaskStart(newTask, currentTime);
    newTask.isQueued = true;
  }
  if (!isHostCallbackScheduled && !isPerformingWork) {
    isHostCallbackScheduled = true;
    // 调度一个普通任务
    requestHostCallback(flushWork);
  }
}

return newTask;
```

调度普通任务

```js
// 异步通知需要处理任务
const channel = new MessageChannel();
const port = channel.port2;
channel.port1.onmessage = performWorkUntilDeadline;
requestHostCallback = function (callback) {
  // 接受传入的flushWork
  scheduledHostCallback = callback;
  if (!isMessageLoopRunning) {
    isMessageLoopRunning = true;
    port.postMessage(null);
  }
};

const performWorkUntilDeadline = () => {
  // flushWork
  if (scheduledHostCallback !== null) {
    const currentTime = getCurrentTime();
    // 每次执行任务只有5ms,意味着每一次渲染周期中有多次处理用户响应的机会
    // 也不需要和浏览器的刷新对其，也就是说一次更新的内容不一定会在浏览器的下一帧渲染。
    // let yieldInterval = 5;
    // let deadline = 0;
    deadline = currentTime + yieldInterval;
    // 默认还有剩余时间
    const hasTimeRemaining = true;
    try {
      const hasMoreWork = scheduledHostCallback(hasTimeRemaining, currentTime);
      if (!hasMoreWork) {
        isMessageLoopRunning = false;
        scheduledHostCallback = null;
      } else {
        // 还有没处理完的工作继续安排下一次执行
        port.postMessage(null);
      }
    } catch (error) {
      // 抛出错误退出执行
      port.postMessage(null);
      throw error;
    }
  } else {
    isMessageLoopRunning = false;
  }
  // Yielding to the browser will give it a chance to paint, so we can
  // reset this.
  needsPaint = false;
};
```

```js
function flushWork(hasTimeRemaining, initialTime) {
  isPerformingWork = true;
  const previousPriorityLevel = currentPriorityLevel;
  try {
    return workLoop(hasTimeRemaining, initialTime);
  } finally {
  }
}

function workLoop(hasTimeRemaining, initialTime) {
  let currentTime = initialTime;
  // 遍历timerQueue如果有到期的任务就放入到taskQueue中
  advanceTimers(currentTime);
  currentTask = peek(taskQueue);
  while (
    currentTask !== null &&
    !(enableSchedulerDebugging && isSchedulerPaused)
  ) {
    if (
      currentTask.expirationTime > currentTime &&
      (!hasTimeRemaining || shouldYieldToHost())
    ) {
      // currentTask.expirationTime > currentTime 任务没有过期
      // hasTimeRemaining ||  shouldYieldToHost() 但是已经没有剩余时间，任务需要暂停
      // 跳出并归还主线程
      break;
    }
    // 到了过期时间，且有时间执行
    const callback = currentTask.callback;
    if (typeof callback === "function") {
      currentTask.callback = null;
      currentPriorityLevel = currentTask.priorityLevel;
      const didUserCallbackTimeout = currentTask.expirationTime <= currentTime;
      markTaskRun(currentTask, currentTime);
      // 任务执行
      const continuationCallback = callback(didUserCallbackTimeout);
      currentTime = getCurrentTime();
      if (typeof continuationCallback === "function") {
        currentTask.callback = continuationCallback;
        markTaskYield(currentTask, currentTime);
      } else {
        if (currentTask === peek(taskQueue)) {
          pop(taskQueue);
        }
      }
      advanceTimers(currentTime);
    } else {
      // 不是函数直接丢弃
      pop(taskQueue);
    }
    // 拿一个新任务
    currentTask = peek(taskQueue);
  }
  // Return whether there's additional work
  if (currentTask !== null) {
    return true;
  } else {
    const firstTimer = peek(timerQueue);
    if (firstTimer !== null) {
      // 如果taskQueue没有任务了，就处理timerQueue
      requestHostTimeout(handleTimeout, firstTimer.startTime - currentTime);
    }
    return false;
  }
}
```

调度延迟任务

```js
// callback 任务
// ms 延迟时间

requestHostTimeout = function (callback, ms) {
  taskTimeoutID = setTimeout(() => {
    callback(getCurrentTime());
  }, ms);
};
```

#### commitMutationEffects

[为什么需要解绑 Ref ?](https://reactjs.org/docs/refs-and-the-dom.html#caveats-with-callback-refs)

如果 Ref 被定义为一个函数,在更新阶段会执行两次,第一次为 `null`,第二次会绑定 DOM 元素,这是因为每次渲染都会创建新的函数实例,所以 React 会先删除旧的 Ref 回收内存,再创建一个新的.

```ts
if (flags & Ref) {
  var current = nextEffect.alternate;
  if (current !== null) {
    var currentRef = current.ref;
    if (currentRef !== null) {
      if (typeof currentRef === "function") {
        currentRef(null);
      } else {
        currentRef.current = null;
      }
    }
  }
}
```

不同的 Tag 对应不同的 DOM 操作

```js
var primaryFlags = flags & (Placement | Update | Deletion | Hydrating);

    switch (primaryFlags) {
      case Placement:
        {
          commitPlacement(nextEffect);
          nextEffect.flags &= ~Placement;
          break;
        }

      case PlacementAndUpdate:
        {
          commitPlacement(nextEffect);
          nextEffect.flags &= ~Placement;
          var _current = nextEffect.alternate;
          commitWork(_current, nextEffect);
          break;
        }

      case Hydrating:
        {
          nextEffect.flags &= ~Hydrating;
          break;
        }

      case HydratingAndUpdate:
        {
          nextEffect.flags &= ~Hydrating;

          var _current2 = nextEffect.alternate;
          commitWork(_current2, nextEffect);
          break;
        }

      case Update:
        {
          var _current3 = nextEffect.alternate;
          commitWork(_current3, nextEffect);
          break;
        }

      case Deletion:
        {
          commitDeletion(root, nextEffect);
          break;
        }
    }

    resetCurrentFiber();
    nextEffect = nextEffect.nextEffect;
  }
```

##### commitPlacement 插入

```js
function commitPlacement(finishedWork) {
  // 找到当前插入节点的上级节点
  var parentFiber = getHostParentFiber(finishedWork); // Note: these two variables *must* always be updated together.

  var parent;
  var isContainer;
  var parentStateNode = parentFiber.stateNode;

  // 判断是不是跟节点
  switch (parentFiber.tag) {
    case HostComponent:
      parent = parentStateNode;
      isContainer = false;
      break;

    case HostRoot:
      parent = parentStateNode.containerInfo;
      isContainer = true;
      break;

    case HostPortal:
      parent = parentStateNode.containerInfo;
      isContainer = true;
      break;
  }

  // 如果上级节点标记了清除内容的副作用,则先清空文本
  if (parentFiber.flags & ContentReset) {
    resetTextContent(parent);

    parentFiber.flags &= ~ContentReset;
  }
  // 插入有两种情况,直接插入一个元素中,或插入兄弟节点前面,这里需要获取兄弟节点
  var before = getHostSibling(finishedWork);

  if (isContainer) {
    如果兄弟节点存在;
    /*
    如果兄弟节点存在
    if (container.nodeType === COMMENT_NODE) {
      container.parentNode.insertBefore(child, beforeChild);
    } else {
      container.insertBefore(child, beforeChild);
    }
    
    如果兄弟节点不存在
    if (container.nodeType === COMMENT_NODE) {
      parentNode = container.parentNode;
      parentNode.insertBefore(child, container);
    } else {
      parentNode = container;
      parentNode.appendChild(child);
    }
    */
    insertOrAppendPlacementNodeIntoContainer(finishedWork, before, parent);
  } else {
    insertOrAppendPlacementNode(finishedWork, before, parent);
  }
}
```

##### commitWork 更新

```js
function commitWork(current, finishedWork) {
  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case MemoComponent:
    case SimpleMemoComponent:
    case Block: {
      // 有可能兄弟组件间的副作用会相互影响,例如在同一次 commit 阶段中
      // 一个组件的副作用销毁函数,不应该依赖与另一个组件的副作用创建函数,通过ref传递,因为执行时机问题造成不会执行
      {
        commitHookEffectListUnmount(Layout | HasEffect, finishedWork);
      }

      return;
    }

    case ClassComponent: {
      return;
    }

    case HostComponent: {
      var instance = finishedWork.stateNode;

      if (instance != null) {
        // Commit the work prepared earlier.
        var newProps = finishedWork.memoizedProps; // For hydration we reuse the update path but we treat the oldProps
        // as the newProps. The updatePayload will contain the real change in
        // this case.

        var oldProps = current !== null ? current.memoizedProps : newProps;
        var type = finishedWork.type; // TODO: Type the updateQueue to be specific to host components.

        var updatePayload = finishedWork.updateQueue;
        finishedWork.updateQueue = null;

        /*
          最终会调用原生节点上的设置属性
        if (value === null) {
          node.removeAttribute(_attributeName);
        } else {
          node.setAttribute(_attributeName,  '' + value);
        }
        */
        if (updatePayload !== null) {
          commitUpdate(instance, updatePayload, type, oldProps, newProps);
        }
      }

      return;
    }

    case HostText: {
      if (!(finishedWork.stateNode !== null)) {

      var textInstance = finishedWork.stateNode;
      var newText = finishedWork.memoizedProps;

      var oldText = current !== null ? current.memoizedProps : newText;
      commitTextUpdate(textInstance, oldText, newText);
      return;
    }
}
```

##### commitDeletion 删除

虽然只有当前的 Fiber 节点删除,但仍然需要遍历所有的子节点,因为可能子节点会执行 `componentWillUnmount`

```js
while (true) {
  if (node.tag === HostComponent || node.tag === HostText) {
    // 执行 commitUnmount
    // 遍历所有子节点,删除 Ref,或执行 componentWillUnmount
    // HostPortal 需要删除挂载元素
    // 执行 useEffect销毁函数
    commitNestedUnmounts(finishedRoot, node);

    //所有子节点卸载后才能安全的从 DOM 树中删除当前节点
    if (currentParentIsContainer) {
      removeChildFromContainer(currentParent, node.stateNode);
    } else {
      removeChild(currentParent, node.stateNode);
    } // Don't visit children because we already visited them.
  } else if (node.tag === HostPortal) {
    if (node.child !== null) {
      // When we go into a portal, it becomes the parent to remove from.
      // We will reassign it back when we pop the portal on the way up.
      currentParent = node.stateNode.containerInfo;
      currentParentIsContainer = true; // Visit children because portals might contain host components.

      node.child.return = node;
      node = node.child;
      continue;
    }
  } else {
    // Visit children because we may find more host components below.
    commitUnmount(finishedRoot, node);

    if (node.child !== null) {
      node.child.return = node;
      node = node.child;
      continue;
    }
  }

  if (node === current) {
    return;
  }

  while (node.sibling === null) {
    if (node.return === null || node.return === current) {
      return;
    }

    node = node.return;

    if (node.tag === HostPortal) {
      // When we go out of the portal, we need to restore the parent.
      // Since we don't keep a stack of them, we will search for it.
      currentParentIsValid = false;
    }
  }

  node.sibling.return = node.return;
  node = node.sibling;
}
```

#### commitLayoutEffects

执行前会将 current 指向 finishedWork, 在 `componentDidMount/Update.` 执行結束后, work-in-progress tree 已经变为最终的状态了,可以安全的指向 current

```js
root.current = finishedWork;
```

下一个阶段是 layout 节点,会在已经改变的树上读取 effect 执行,这也是为什么此时能获取到 DOM 的最新状态

```js
{
  switch (finishedWork.tag) {
    case FunctionComponent:
    case ForwardRef:
    case SimpleMemoComponent:
    case Block: {
      // 同步执行 layoutEffect
      {
        commitHookEffectListMount(Layout | HasEffect, finishedWork);
      }
      // 将 mutation effects 创建函数和销毁函数添加到队列中,并执行调度
      schedulePassiveEffects(finishedWork);
      return;
    }

    case ClassComponent:
      {
        var instance = finishedWork.stateNode;

        if (finishedWork.flags & Update) {
          if (current === null) {
            // current 不存在表示首次挂载
            instance.componentDidMount();
          } else {
            var prevProps =
              finishedWork.elementType === finishedWork.type
                ? current.memoizedProps
                : resolveDefaultProps(finishedWork.type, current.memoizedProps);
            var prevState = current.memoizedState; // We could update instance props and state here,
            // but instead we rely on them being set during last render.
            // TODO: revisit this when we implement resuming.

            // 组件更新
            instance.componentDidUpdate(
              prevProps,
              prevState,
              instance.__reactInternalSnapshotBeforeUpdate
            );
          }
        }
        commitUpdateQueue(finishedWork, updateQueue, instance);
      }

      return;
  }

  // 重新绑定 Ref
  if (flags & Ref) {
    var ref = finishedWork.ref;

    if (ref !== null) {
      var instance = finishedWork.stateNode;
      var instanceToUse;

      switch (finishedWork.tag) {
        case HostComponent:
          instanceToUse = getPublicInstance(instance);
          break;

        default:
          instanceToUse = instance;
      } // Moved outside to ensure DCE works with this flag

      if (typeof ref === "function") {
        ref(instanceToUse);
      } else {
        ref.current = instanceToUse;
      }
    }
  }
}
```

#### requestPaint

在上面三个阶段执行結束后,会执行请求绘制的方法, 通过 Scheduler 模块调度, 这也是 `useLayoutEffect` 会在 DOM 绘制前执行的原因

```js
requestPaint();

var rootDidHavePassiveEffects = rootDoesHavePassiveEffects;

if (rootDoesHavePassiveEffects) {
  // 在所有阶段执行结束后 root 节点上还有副作用, 先保存一个引用,在 layout 结束后再去调度
  rootDoesHavePassiveEffects = false;
  rootWithPendingPassiveEffects = root;
  pendingPassiveEffectsLanes = lanes;
  pendingPassiveEffectsRenderPriority = renderPriorityLevel;
} else {
  // We are done with the effect chain at this point so let's clear the
  // nextEffect pointers to assist with GC. If we have passive effects, we'll
  // clear this in flushPassiveEffects.
  nextEffect = firstEffect;

  while (nextEffect !== null) {
    var nextNextEffect = nextEffect.nextEffect;
    nextEffect.nextEffect = null;

    if (nextEffect.flags & Deletion) {
      detachFiberAfterEffects(nextEffect);
    }

    nextEffect = nextNextEffect;
  }
} // Read this again, since an effect might have updated it
```
