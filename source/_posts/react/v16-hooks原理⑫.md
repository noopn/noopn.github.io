---
layout: posts
title: React v16 源码分析 ⑫ Hooks 原理
mathjax: true
date: 2024-01-11 12:19:24
categories:
  - React
tags:
  - React
---

针对 hooks 有三种策略，或者说三种类型的 dispatch

HooksDispatcherOnMount 将函数组件初始化的信息挂载到 Fiber 上面

```js
const HooksDispatcherOnMount: Dispatcher = {
  readContext,
  useCallback: mountCallback,
  useEffect: mountEffect,
  useMemo: mountMemo,
  useReducer: mountReducer,
  useRef: mountRef,
  useState: mountState,
  // ...其他 Hooks
};
```

HooksDispatcherOnUpdate 函数执行更新的时候，会执行这个对象对应的方法，此时 fiber 上已经存储了函数组件的信息，这些 Hooks 会去维护或更新这些信息。

```js
const HooksDispatcherOnUpdate: Dispatcher = {
    readContext,
    useCallback: updateCallback,
    useContext: readContext,
    useEffect: updateEffect,
    useMemo: updateMemo,
    useReducer: updateReducer,   /
    useRef: updateRef,
    useState: updateState,
    // ...其他 Hooks
};
```

ContextOnlyDispatcher 防止开发者在函数组件外部调用 Hooks

```js
export const ContextOnlyDispatcher: Dispatcher = {
  readContext, // 允许读取 Context
  useCallback: throwInvalidHookError, // 抛出非法调用错误
  useContext: throwInvalidHookError,
  useEffect: throwInvalidHookError,
  useMemo: throwInvalidHookError,
  useReducer: throwInvalidHookError,
  useRef: throwInvalidHookError,
  useState: throwInvalidHookError,
  // ...其他 Hooks 同理
};
```

render 执行的时候会根据不同的上下文环境，给 hooks 赋值不同的方法。

```js
const hook = {
  memoizedState: null, //当前 Hook 的缓存状态
  baseState: null, // 基础状态（用于更新对比或重置）
  baseQueue: null, // 基础更新队列（待处理的优先级较低更新）
  queue: null, // 当前更新队列（高优先级更新）
  next: null, // 指向下一个 Hook 节点的指针
};
```

当进入一个函数组件时， 会被 renderWithHooks

```js
export function renderWithHooks(
  current, // 当前 Fiber 节点（null 表示首次挂载）
  workInProgress, // 正在处理的 Fiber 节点（本次渲染目标）
  Component, // 用户编写的函数组件
  props, // 组件接收的 props
  secondary, // 次要参数（通常为 ref）
  nextRenderLanes // 本次渲染的优先级车道（Lane 模型）
) {
  // 设置全局渲染相关变量
  renderLanes = nextRenderLanes;
  currentlyRenderingFiber = workInProgress;

  // 重置 Hook 链表和副作用队列
  workInProgress.memoizedState = null; // 清空 Hooks 链表
  workInProgress.updateQueue = null; // 清空 Effect List

  // 动态切换 Hooks 分发器
  ReactCurrentDispatcher.current =
    current === null || current.memoizedState === null
      ? HooksDispatcherOnMount // 挂载阶段分发器
      : HooksDispatcherOnUpdate; // 更新阶段分发器

  // 执行用户函数组件，触发 Hooks 调用
  let children = Component(props, secondary);

  // 渲染后清理工作
  finishRenderingHooks(current, workInProgress);
  return children;
}

function finishRenderingHooks(current, workInProgress) {
  // 强制切换为错误分发器，防止外部调用 Hooks
  ReactCurrentDispatcher.current = ContextOnlyDispatcher;
  // ...其他清理逻辑
}
```

执行 mountState 相关代码,会清空 WorkInProgress 的 memorizedState 以及 updateQueue, 接下来时派那段组件究竟时初始化还是更新，为 ReactCurrentDispatcher.current 赋予不同的上下文

```js
function mountState(initialState) {
  // 1. 创建 hook 对象
  const hook = mountWorkInProgressHook(); // 初始化 hook 对象，关联当前正在渲染的组件

  // 2. 判断 initialState 是否是一个函数，如果是则调用它并获得初始状态
  if (typeof initialState === "function") {
    initialState = initialState(); // 如果 initialState 是函数，调用该函数获取状态值
  }

  // 2. 初始化 hook 的属性
  // 2.1 设置 hook.memoizedState / hook.baseState
  hook.memoizedState = hook.baseState = initialState;

  // 定义 queue（队列），用于管理状态更新
  const queue = {
    pending: null, // 队列中待处理的更新
    lanes: NoLanes, // 当前更新所属的 lane，通常表示优先级
    dispatch: null, // 状态更新函数
    lastRenderedReducer: basicStateReducer, // 上一次渲染的状态更新函数
    lastRenderedState: initialState, // 上一次渲染的状态
  };

  // 2.2 设置 hook.queue
  hook.queue = queue; // 将队列分配给 hook 的 queue 属性

  // 2.3 设置 hook.dispatch
  // 将 dispatchSetState 绑定到当前组件的上下文中，并传入队列
  const dispatch = (queue.dispatch = dispatchSetState.bind(
    null,
    currentlyRenderingFiber,
    queue
  ));

  // 3. 返回当前状态和 dispatch 函数
  return [hook.memoizedState, dispatch]; // 返回当前状态和状态更新函数
}

function mountWorkInProgressHook() {
  const hook = {
    memoizedState: null, // Hook 自身维护的状态
    baseState: null,
    baseQueue: null,
    queue: null, // Hook 自身维护的更新队列
    next: null, // 指向下一个 Hook
  };

  // 如果当前组件的 Hook 链表为空，说明这是第一个 Hook
  if (workInProgressHook === null) {
    // 这是链表的第一个节点（头结点）
    currentlyRenderingFiber.memoizedState = workInProgressHook = hook;
  } else {
    // 如果当前组件的 Hook 链表不为空，将新创建的 Hook 添加到链表的末尾（作为尾结点）
    workInProgressHook = workInProgressHook.next = hook;
  }

  return workInProgressHook;
}
```

组件执行之后就会生成一个 hooks 链表，在更新过程中会移动指针依次指向每一个节点.

这也是为什么不可以将 useHooks 放在条件中，因为他需要按照链表的顺序依次被引用。

```js
function updateWorkInProgressHook() {
  let nextCurrentHook;

  // 获取当前 Fiber 的 alternate（用于双缓冲）
  const current = currentlyRenderingFiber.alternate;

  if (current !== null) {
    // 如果当前有 alternate（即已经存在旧的 Fiber）
    nextCurrentHook = current.memoizedState;
  } else {
    nextCurrentHook = null;
  }

  // 获取下一个 Hook
  nextCurrentHook = currentHook.next;

  // 更新 workInProgressHook 的指向
  let nextWorkInProgressHook;
  if (workInProgressHook === null) {
    // 当是第一个 Hook，直接从当前 Fiber 上获取第一个 hook
    nextWorkInProgressHook = currentlyRenderingFiber.memoizedState;
  } else {
    // 获取链表的下一个 hook
    nextWorkInProgressHook = workInProgressHook.next;
  }

  // nextWorkInProgressHook 指向当前正在工作的 hook
  if (nextWorkInProgressHook !== null) {
    // 如果已经有工作中的 hook，重用它
    workInProgressHook = nextWorkInProgressHook;
    nextWorkInProgressHook = workInProgressHook.next;

    // 当前 hook 指向下一个 hook
    currentHook = nextCurrentHook;
  } else {
    // 克隆当前 hook
    if (nextCurrentHook === null) {
      const currentFiber = currentlyRenderingFiber.alternate;
      if (currentFiber === null) {
        // 这是初始渲染，组件挂起、恢复时将渲染一个附加的 hook
        const newHook = {
          memoizedState: null,
          baseState: null,
          baseQueue: null,
          queue: null,
          next: null,
        };
        nextCurrentHook = newHook; // 设置为当前 hook
      } else {
        // 如果是更新渲染，应该有一个有效的当前 hook
        throw new Error("Rendered more hooks than during the previous render.");
      }
    }
  }

  const newHook = {
    memoizedState: currentHook.memoizedState, // 当前 Hook 的状态值
    baseState: currentHook.baseState, // 当前 Hook 的基础状态
    baseQueue: currentHook.baseQueue, // 当前 Hook 的基础更新队列
    queue: currentHook.queue, // 当前 Hook 的更新队列
    next: null, // 指向下一个 Hook
  };

  // 如果 workInProgressHook 为 null，说明这是第一个 Hook
  if (workInProgressHook === null) {
    // 设置当前渲染组件的 memoizedState 为新的 Hook
    currentlyRenderingFiber.memoizedState = workInProgressHook = newHook;
  } else {
    // 否则，将新的 Hook 添加到链表的末尾
    workInProgressHook = workInProgressHook.next = newHook;
  }

  return workInProgressHook;
}
```

#### useEffect / useLayoutEffect

- useEffect：回调函数会在 commit 阶段完成后异步执行，所以它不会阻塞视觉渲染

- useLayoutEffect：回调函数会在 commit 阶段的 Layout 子阶段同步执行，一般用于执行 DOM 相关的操作

- useInsertionEffect：回调函数会在 commit 阶段的 Mutation 子阶段同步执行，与 useLayoutEffect 的区别在于执行时无法访问对 DOM 的引用。这个 Hook 是专门为 CSS-in-JS 库插入全局的 style 元素设计的。

在内部共同使用一套数据结构, next 与当前的函数作用域内的其他 effect 函数，形成环状链表。

```js
const effect = {
  // 用于区分 effect 类型 Passive | Layout | Insertion
  tag, // effect 回调函数
  create, // effect 创建函数
  destroy, // 销毁函数
  deps, // 依赖项
  // 与当前 FC 的其他 effect 形成环状链表
  next: null,
};
```

- 声明阶段

  **mount**子阶段 执行 mountEffectImpl, 生成 hook 对象拿到依赖，将当前的 effect 加入到环状链表

  ```js
  function mountEffectImpl(fiberFlags, hookFlags, create, deps) {
    // 生成 hook 对象
    const hook = mountWorkInProgressHook();
    // 保存依赖的数组
    const nextDeps = deps === undefined ? null : deps;

    // 修改当前 fiber 的 flag
    currentlyRenderingFiber.flags |= fiberFlags;

    // 将 pushEffect 返回的环形链表保存到 hook 对象的 memoizedState 中
    hook.memoizedState = pushEffect(
      HookHasEffect,
      hookFlags,
      create,
      undefined,
      nextDeps
    );
  }
  ```

  **update**子阶段执行 updateEffectImpl, 获取 hook 新旧值，进行依赖比较，打上响应的 tag,在 commit 阶段统一处理

  ```js
  function updateEffectImpl(fiberFlags, hookFlags, create, deps) {
    const hook = updateWorkInProgressHook();
    const nextDeps = deps === undefined ? null : deps;
    let destroy = undefined;

    if (currentHook !== null) {
      const prevEffect = currentHook.memorizedState;
      destroy = prevEffect.destroy;
    }

    if (nextDeps !== null) {
      const prevDeps = prevEffect.deps;

      // 浅比较依赖是否发生变化
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        hook.memorizedState = pushEffect(hookFlags, create, destroy, nextDeps);
        return;
      }
    }

    if (deps !== prevEffect.deps) {
      fiberFlags |= hookFlags;
    }

    currentlyRenderingFiber.flags |= fiberFlags;

    // pushEffect 的作用是将当前 effect 添加到 FiberNode 的 updateQueue 中，
    // 然后返回当前 effect 保存在 Hook 节点的 memorizedState 属性中
    hook.memorizedState = pushEffect(
      HookHasEffect | hookFlags,
      create,
      destroy,
      nextDeps
    );
  }
  ```

- 调度阶段， useEffect 独有的，因为 useEffect 函数会在 commit 之后异步执行,

  ```js
  if (
    (finishedWork.subtreeFlags & PassiveMask) !== NoFlags ||
    (finishedWork.flags & PassiveMask) !== NoFlags
  ) {
    if (!rootDoesHavePassiveEffects) {
      rootDoesHavePassiveEffects = true;
      pendingPassiveEffectsRemainingLanes = remainingLanes;
      // scheduleCallback 来自于 Scheduler，用于以某一优先级调度回调函数
      scheduleCallback(NormalSchedulerPriority, () => {
        // 执行 effect 回调函数的具体方法
        flushPassiveEffects();
        return null;
      });
    }
  }
  ```

  为了保证下一次 commit 执行前，上一次的 commit 调用的 effect 已经全部执行，因此会在 commit 入口处也会执行 flushPassiveEffects

  ```js
  function commitRootImpl(root, renderPriorityLevel) {
    do {
      flushPassiveEffects();
    } while (rootWithPendingPassiveEffects !== null);
  }
  ```

- 执行阶段

  commitHookEffectListUnmount 遍历 Effect 链表依次执行 effect.destroy

  ```js
  function commitHookEffectListUnmont(
    flags: HookFlags,
    finishedWork: Fiber,
    nearestMountedAncestor: Fiber | null
  ) {
    const updateQueue: FunctionComponentUpdateQueue | null =
      finishedWork.updateQueue ? finishedWork.updateQueue : null;

    const lastEffect = updateQueue !== null ? updateQueue.lastEffect : null;
    if (lastEffect !== null) {
      const firstEffect = lastEffect.next;
      let effect = firstEffect;
      do {
        if ((effect.tag & flags) === flags) {
          // Unmount
          // 从 effect 对象上拿到 destroy 函数
          const destroy = effect.destroy;
          effect.destroy = undefined;
          // ...
        }
        effect = effect.next;
      } while (effect !== firstEffect);
    }
  }
  ```

  commitHookEffectListMount 遍历 Effect 链表依次执行 effect.create,在声明阶段的时候已经打上了不同的 tag,这时会根据 tag 来执行

  ```js
  // 类型为 useInsertionEffect 并且存在 HasEffect tag 的 effect 会执行回调
  commitHookEffectListMount(Insertion | HasEffect, fiber);

  // 类型为 useEffect 并且存在 HasEffect tag 的 effect 会执行回调
  commitHookEffectListMount(Passive | HasEffect, fiber);

  // 类型为 useLayoutEffect 并且存在 HasEffect tag 的 effect 会执行回调
  commitHookEffectListMount(Layout | HasEffect, fiber);
  ```

#### useCallback / useMemo

与其他的 hooks 类似，mount 阶段创建 hooks 对象，更行阶段对比依赖，计算结果

```js
function mountCallback(callback, deps) {
  // 首先还是创建一个 hook 对象
  const hook = mountWorkInProgressHook();

  // 依赖项
  const nextDeps = deps === undefined ? null : deps;

  // 把要缓存的函数和依赖数组存到 hook 对象上
  hook.memoizedState = [callback, nextDeps];

  // 向外部返回缓存函数
  return callback;
}
```

```js
function updateCallback(callback, deps) {
  // 获取之前的 hook 对象
  const hook = updateWorkInProgressHook();

  // 新的依赖项
  const nextDeps = deps === undefined ? null : deps;

  // 之前的值，也就是 [callback, nextDeps]
  const prevState = hook.memorizedState;

  if (prevState !== null) {
    if (nextDeps !== null) {
      const prevDeps = prevState[1]; // 获取到之前的依赖项

      // 对比依赖项是否相同
      if (areHookInputsEqual(nextDeps, prevDeps)) {
        // 相同回 callback
        return prevState[0];
      }
    }
  }

  // 否则重新缓存
  hook.memorizedState = [callback, nextDeps];
  return callback;
}
```

#### useRef

```js
function mountRef(initialValue) {
  // 创建 hook 对象
  const hook = mountWorkInProgressHook();
  const ref = { current: initialValue };

  // hook对象的 memorizedState 值 { current: initialValue }
  hook.memorizedState = ref;
  return ref;
}

function updateRef(initialValue) {
  // 获取当前的 hook 对象
  const hook = updateWorkInProgressHook();
  return hook.memorizedState;
}
```

ref 创建之后会作为组件属性传递，在 react 的 render 阶段会标记 ref。

```js
function markRef(current, workInProgress) {
  const ref = workInProgress.ref;
  if (
    (current === null && ref !== null) ||
    (current !== null && current.ref !== ref)
  ) {
    // 标记 Reg tag
    workInProgress.flags |= Ref;
  }
}
```

commit 的 mutation 子阶段删除旧的 ref

```js
function commitLayoutEffectOnFiber(
  finishedRoot,
  current,
  finishedWork,
  committedLanes
) {
  // 省略代码
  if (finishedWork.flags & Ref) {
    commitAttachRef(finishedWork);
  }
}
```

commit 的 layout 子阶段会重新赋值新的 ref

```js
function commitAttachRef(finishedWork) {
  const ref = finishedWork.ref;
  if (ref !== null) {
    const instance = finishedWork.stateNode;
    let instanceToUse;
    switch (finishedWork.tag) {
      case HostComponent:
        // HostComponent 需要获取对应的 DOM 元素
        instanceToUse = getPublicInstance(instance);
        break;
      default:
        // ClassComponent 使用 FiberNode.stateNode 保存实例
        instanceToUse = instance;
    }

    if (typeof ref === "function") {
      // 函数类型，执行函数并将实例传入
      let retVal;
      retVal = ref(instanceToUse);
    } else {
      // { current: T } 类型则更新 current 指向
      ref.current = instanceToUse;
    }
  }
}
```

通过 forwardRef 和 useImperativeHandle 操作元素, 尽量避手动绑定 ref，避免 ref 被修改。
