---
title: React原理 执行流程与架构
mathjax: true
categories:
  - React
tags:
  - React

date: 2021-10-22 19:04:28
---

在 react v15 之前成为 stack 架构，从 v16 开始重构了整个架构，新的架构叫做 fiber 架构，最大的改变就是可以进行时间切片。

- cpu 瓶颈如果主进程存在大量的计算任务，会阻塞后续的任务,同样也会影响浏览器的绘制任务,从而造成掉帧，用户交互无响应。
  在 v15 的版本当嵌套组件过多时，虚拟 DOM 会递归执行，导致执行时间过长。

- io 瓶颈，对前端来讲 io 瓶颈主要来自于网络，对于 React 所有的更新都来自于内部状态的变化，所以 react 将触发状态变化的事件分为不同的优先级，统一调度这些任务，挡在更新过程中有更高优先级的任务产生，需要中断当前任务，处理更高优先级的任务。

因此需要 React 实现任务调度算法，可以中断的 dom 更新，任务分级的机制, 以下是 React 升级的关键设计思想：

- 在 UI 中，不需要每次更新都立即应用；事实上，这样做可能会造成浪费，导致帧丢失并降低用户体验。
- 不同类型的更新有不同的优先级——动画更新需要比数据存储更新更快地完成。
- react 使用的拉的模式，他会自己安排更新工作，而不需要让程序员推送任务执行的方式。

fiber 相当于代替了之前版本的调用栈信息， 一个 fiber 相当于一个调用栈帧，生命周期比调用栈长，可以保存在内存中，在需要的时候调用。

**为什么在 fiber 架构之前无法中断更新**，假设一个列表有 4 个 div 每个 div 中的文字是 2，现在触发一个事件需要将列表中的每个文字更新为 4， stack reconciler 递归的执行每个更新，在更新到第三个元素的时候，如果想要中断了更新那么会让出主进程允许浏览器更新 UI，这就会造成只有三个元素显示了正确的 UI, 造成 UI 和状态不一致。

fiber 架构的第一个阶段是 render/reconciliation, 他会解析当前 fiber 链接起来的树，弄清楚哪些需要更新，这个过程是可以中断的,react 从根节点向下递归，标记那些已经被删除或是更新的节点，并在每个节点处理过后检查是否还剩余处理时间，如果时间不足会中断当前处理让出主线程，当主线程任务结束后会从中断的位置继续处理剩余的节点，所有节点处理完成后，会递归向上回到根节点，将所有需要更新和修改的节点作为一个副作用链表一直连接到 root fiber。

第二个阶段是提交 commit 阶段，它会将识别到的更改应用到元素上，这一过程是不可以中断的。


优先级：

- Synchronous 同步相当于 stack reconciler
- task 在下一次事件循环前
- animation 在下一次渲染之前
- High 即使处理
- Low 网络请求等
- Offscreen

#### 整体执行流程

![](0001.png)

#### 初始化事件相关对象

![](0002.png)

- registerSimpleEvents 创建对象相关对象

| 变量名称                     | 变量对象 | 说明                                                                                                                                                |
| ---------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| allNativeEvents              | Set 集合 | <div style='width:600px'>保存所有原生事件的名称 例如 `0:"cancel"`</div>                                                                             |
| eventPriorities              | Map 集   | <div style='width:600px'>保存事件名称和事件优先级对应关系 例如 `click=>0` </div>                                                                    |
| topLevelEventsToReactNames   | Map 集   | <div style='width:600px'>保存原始事件名称和 React 事件的对应关系 例如 `"cancel" => "onCancel"` </div>                                               |
| registrationNameDependencies | Object   | <div style='width:600px'>保存 React 事件和原生事件的对应关系 例如 `onClick:(1) ['click']` 每个 React 事件对应一个数组用于保存合成事件对应关系</div> |
| possibleRegistrationNames    | Object   | <div style='width:600px'>保存小写的 React 事件名称和正确的驼峰命名事件的对应关系，用于校验用户输入 例如 `onclick:onClick`</div>                     |

#### 入口

![](0003.png)

**render** : ReactDom.render()
**createRootImpl** : 创建 FiberRootNode 根节点
**listenToAllSupportedEvents** : 绑定所有原生事件在 root 节点上

#### render 阶段

![](0004.png)

**unbatchedUpdates** : 非批量更新，让用户尽早看见页面内容，如果是 batchedUpdates 会以异步执行
**scheduleUpdateOnFiber** : 调度 Fiber 节点更新优先级
**performUnitOfWork** : 以 Fiber 节点为单位，深度优先递归遍历每一个节点
**reconcileChildren** ： 创建对比 Fiber 节点，标记有副作用的节点 （添加，删除，移动，更新）
**completeUnitOfWork** ： 从下至上遍历节点，创建相应的 DOM 节点，并创建 Effects 链表，交给 commit 阶段使用

#### commit 阶段

![](0005.png)

**commitBeforeMutationEffects**: 操作真实节点前执行，会执行`getSnapshotBeforeUpdate`
**commitMutationEffects**: 执行节点操作
**commitLayoutEffects：** 执行副作用函数，包括 `componentDidUpdate` 或 `effect`回调函数

#### JSX

jsx 是 js 语言的扩展，react 通过 babel 词法解析，将 jsx 转换成 React.createElement，React.createElement 方法返回 virtual-dom 对象（内存中用来描述 dom 阶段的对象），所有 jsx 本质上就是 React.createElement 的语法糖，它能声明式的编写我们想要组件呈现出什么样的 ui 效果.

#### Fiber 双缓存

Fiber 对象上面保存了包括这个节点的属性、类型、dom 等，Fiber 通过 child、sibling、return（指向父节点）来形成 Fiber 树，还保存了更新状态时用于计算 state 的 updateQueue，updateQueue 是一种链表结构，上面可能存在多个未计算的 update，update 也是一种数据结构，上面包含了更新的数据、优先级等，除了这些之外，上面还有和副作用有关的信息。

双缓存是指存在两颗 Fiber 树，current Fiber 树描述了当前呈现的 dom 树，workInProgress Fiber 是正在更新的 Fiber 树，这两颗 Fiber 树都是在内存中运行的，在 workInProgress Fiber 构建完成之后会将它作为 current Fiber 应用到 dom 上

在 mount 时（首次渲染），会根据 jsx 对象（Class Component 或的 render 函数者 Function Component 的返回值），构建 Fiber 对象，形成 Fiber 树，然后这颗 Fiber 树会作为 current Fiber 应用到真实 dom 上，在 update（状态更新时如 setState）的时候，会根据状态变更后的 jsx 对象和 current Fiber 做对比形成新的 workInProgress Fiber，然后 workInProgress Fiber 切换成 current Fiber 应用到真实 dom 就达到了更新的目的，而这一切都是在内存中发生的，从而减少了对 dom 好性能的操作。

![](0006.jpg)

#### Lane 模型

react 之前的版本用 expirationTime 属性代表优先级，该优先级和 IO 不能很好的搭配工作（io 的优先级高于 cpu 的优先级），现在有了更加细粒度的优先级表示方法 Lane，Lane 用二进制位表示优先级，二进制中的 1 表示位置，同一个二进制数可以有多个相同优先级的位，这就可以表示‘批’的概念，而且二进制方便计算。

这好比赛车比赛，在比赛开始的时候会分配一个赛道，比赛开始之后大家都会抢内圈的赛道（react 中就是抢优先级高的 Lane），比赛的尾声，最后一名赛车如果落后了很多，它也会跑到内圈的赛道，最后到达目的地（对应 react 中就是饥饿问题，低优先级的任务如果被高优先级的任务一直打断，到了它的过期时间，它也会变成高优先级）

Lane 的二进制位如下，1 的 bits 越多，优先级越低

```javascript
export const NoLanes: Lanes = /*                        */ 0b0000000000000000000000000000000;
export const NoLane: Lane = /*                          */ 0b0000000000000000000000000000000;

export const SyncLane: Lane = /*                        */ 0b0000000000000000000000000000001;
export const SyncBatchedLane: Lane = /*                 */ 0b0000000000000000000000000000010;
```

#### Scheduler

Scheduler 的作用是调度任务，react15 没有 Scheduler 这部分，所以所有任务没有优先级，也不能中断，只能同步执行。

我们知道了要实现异步可中断的更新，需要浏览器指定一个时间，如果没有时间剩余了就需要暂停任务，requestIdleCallback 貌似是个不错的选择，但是它存在兼容和触发不稳定的原因，react17 中采用 MessageChannel 来实现。

在 Scheduler 中的每的每个任务的优先级使用过期时间表示的，如果一个任务的过期时间离现在很近，说明它马上就要过期了，优先级很高，如果过期时间很长，那它的优先级就低，没有过期的任务存放在 timerQueue 中，过期的任务存放在 taskQueue 中，timerQueue 和 timerQueue 都是小顶堆，所以 peek 取出来的都是离现在时间最近也就是优先级最高的那个任务，然后优先执行它。

#### reconciler

Reconciler 发生在 render 阶段，render 阶段会分别为节点执行 beginWork 和 completeWork，或者计算 state，对比节点的差异，为节点赋值相应的 effectFlags（对应 dom 节点的增删改）。

协调器是在 render 阶段工作的，简单一句话概括就是 Reconciler 会创建或者更新 Fiber 节点。在 mount 的时候会根据 jsx 生成 Fiber 对象，在 update 的时候会根据最新的 state 形成的 jsx 对象和 current Fiber 树对比构建 workInProgress Fiber 树，这个对比的过程就是 diff 算法。

diff 算法发生在 render 阶段的 reconcileChildFibers 函数中，diff 算法分为单节点的 diff 和多节点的 diff（例如一个节点中包含多个子节点就属于多节点的 diff），单节点会根据节点的 key 和 type，props 等来判断节点是复用还是直接新创建节点，多节点 diff 会涉及节点的增删和节点位置的变化。

reconcile 时会在这些 Fiber 上打上 Flags 标签，在 commit 阶段把这些标签应用到真实 dom 上，这些标签代表节点的增删改，如

```javascript
export const Placement = /*             */ 0b0000000000010;
export const Update = /*                */ 0b0000000000100;
```

render 阶段遍历 Fiber 树类似 dfs 的过程，处理发生在 beginWork 函数中，该函数做的主要工作是创建 Fiber 节点，计算 state 和 diff 算法，‘冒泡’阶段发生在 completeWork 中，该函数主要是做一些收尾工作，例如处理节点的 props、和形成一条 effectList 的链表，该链表是被标记了更新的节点形成的链表。

```javascript
function App() {
  const [count, setCount] = useState(0);
  return (
    <>
      <h1
        onClick={() => {
          setCount(() => count + 1);
        }}
      >
        <p title={count}>{count}</p> hello
      </h1>
    </>
  );
}
```

如果 p 和 h1 节点更新了则 effectList 如下，从 rootFiber->h1->p,，顺便说下 fiberRoot 是整个项目的根节点，只存在一个，rootFiber 是应用的根节点，可能存在多个。
