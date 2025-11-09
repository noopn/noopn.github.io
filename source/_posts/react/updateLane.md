---
title: React Lane 模型
mathjax: true

date: 2021-02-14 17:51:27
categories:
  - React
tags:
  - React
---

二进制操作常用于权限控制，在表示多种状态叠加(一对多)的场景更加方便。

```js
// 负数用补码来表示

5 = 0b00000101
-5 = 反码 + 1 = 0b11111010 + 1 = 0b11111011
```

对 fiberNode 的操作也是用位运算来标记的。

```js
// 初始化一些 flags
const NoFlags = 0b0000000000000000; // 0，表示没有任何标志
const PerformedWork = 0b0000000000000001; // 1，表示执行过某项工作
const Placement = 0b0000000000000010; // 2，表示需要放置某项内容
const Update = 0b0000000000000100; // 4，表示需要更新

// 一开始将 flag 变量初始化为 NoFlags，表示没有任何操作
let flag = NoFlags;

// 这里就是在组合多个状态
flag = flag | PerformedWork | Update; // 按位或运算，将 PerformedWork 和 Update 结合进来

// 要判断是否有某个 flag，直接通过 & 来进行判断即可
// 判断是否有 PerformedWork 类型的更新
if (flag & PerformedWork) {
  // 执行对应操作
  console.log("执行 PerformedWork");
}

// 判断是否有 Update 类型的更新
if (flag & Update) {
  // 执行对应操作
  console.log("执行 Update");
}

// 判断是否有 Placement 类型的更新
if (flag & Placement) {
  // 执行对应操作
  console.log("执行 Placement");
}
```

#### 上下文

react 中有许多上下文变量，使用位运算来标记,可以方便的表示进入或移出上下文

```js
// 未处理于 React 上下文
export const NoContext = /* 0b000 */;

// 处理于 batchedUpdates 上下文
const BatchedContext = /* 0b001 */;

// 处理于 render 阶段
export const RenderContext = /* 0b010 */;

// 处理于 commit 阶段
export const CommitContext = /* 0b100 */;

// 是否处于 RenderContext 上下文中，结果为 true
if ((executionContext & RenderContext) !== NoContext) {
  // 在这里执行与 RenderContext 相关的逻辑
}

// 是否处于 CommitContext 上下文中，结果为 false
if ((executionContext & CommitContext) !== NoContext) {
  // 在这里执行与 CommitContext 相关的逻辑
}

// 如果要移除某个上下文
executionContext &= ~RenderContext; // 从当前上下文中移除 RenderContext

// 是否处于 RenderContext 上下文中，结果为 false
if ((executionContext & RenderContext) !== NoContext) {
  // 在这里执行与 RenderContext 相关的逻辑
}


```

#### Lane 模型

schedule 是一个单独的包定义了 5 种优先级。

Lane 是 react 内部的更细粒度的优先级管理，react 所有的更新都只能通过事件或异步任务触发， 所以 React 定义了自己的优先级：

- discreteEventPriority: 离散事件 input focus,blur,touchStart 等
- continuousEventPriority: 连续事件 drag mousemove, scroll 等；
- DefaultEventPriority: 默认优先级 通过计时器产生的任务
- idleEventPriority: 对应空闲情况的优先级

每个优先级对应的值就是 Lane, 因此需要与 schedule 优先级相互转换。

```js
export const NoLanes: Lanes = /*                        */ 0b0000000000000000000000000000000;
export const NoLane: Lane = /*                          */ 0b0000000000000000000000000000000;

export const SyncLane: Lane = /*                        */ 0b0000000000000000000000000000001;
export const SyncBatchedLane: Lane = /*                 */ 0b0000000000000000000000000000010;

//...
```

- react 优先级转为 scheduler, 先将 lanes 转为 EventPriority

  ```js
  export function lanesToEventPriority(lanes: Lanes): EventPriority {
    const lane = getHighestPriorityLane(lanes);

    if (!isHigherEventPriority(DiscreteEventPriority, lane)) {
      return DiscreteEventPriority;
    }

    if (!isHigherEventPriority(ContinuousEventPriority, lane)) {
      return ContinuousEventPriority;
    }

    if (includesNonIdleWork(lane)) {
      return DefaultEventPriority;
    }
    return IdleEventPriority;
  }
  ```

  再将 EventPriority 转为 schedule 优先级

  ```js
  let schedulerPriorityLevel;
  switch (lanesToEventPriority(nextLanes)) {
    case DiscreteEventPriority:
      schedulerPriorityLevel = ImmediateSchedulerPriority;
      break;

    case ContinuousEventPriority:
      schedulerPriorityLevel = UserBlockingSchedulerPriority;
      break;

    case DefaultEventPriority:
      schedulerPriorityLevel = NormalSchedulerPriority;
      break;

    case IdleEventPriority:
      schedulerPriorityLevel = IdleSchedulerPriority;
      break;

    default:
      schedulerPriorityLevel = NormalSchedulerPriority;
      break;
  }
  ```

- scheduler 优先级转为 react 优先级

  ```js
  const schedulerPriority = getCurrentSchedulerPriorityLevel(); // 获取当前调度器优先级

  switch (schedulerPriority) {
    case ImmediateSchedulerPriority:
      return DiscreteEventPriority;
    case UserBlockingSchedulerPriority:
      return ContinuousEventPriority;
    case NormalSchedulerPriority:
    case LowSchedulerPriority:
      return DefaultEventPriority;
    case IdleSchedulerPriority:
      return IdleEventPriority;
    default:
      return DefaultEventPriority;
  }
  ```

##### expiration Time 模型

如果同一时间出发了多个更新，应该先去更新哪一个。

早期 react 使用 expiration Time 模型,这一点和 scheduler 的设计是一致的。不同的优先级对应不同的 deadline, 每次 schedule 执行的时候，选出一个最高的优先级执行。

但是这种模式无法表示批的概念，当优先级大于 priorityBunch 就会划分到同一批，但是无法将提交的不同更新种的某种类型的任务算作同一批。因此基于上面的原因引入了 lane 模型。

lane 是如何灵活表达批的概念？

```js
// 要使用的批次
let batch = 0;

// laneA 和 laneB 是不相邻的优先级
const laneA = 0b00000000000000001000000; // 代表某个优先级
const laneB = 0b00000000000000000000001; // 代表另一个优先级

// 将 laneA 纳入批中
batch |= laneA; // 将 laneA 的优先级合并到 batch 中

// 将 laneB 纳入批中
batch |= laneB; // 将 laneB 的优先级合并到 batch 中
```

#### updateLane

[用于调度更新的优先级](/posts/a51eed6a/#updateContainer) 通过 `requestUpdateLane` 创建

```javascript
export function requestUpdateLane(fiber: Fiber): Lane {
  const mode = fiber.mode;
  if ((mode & BlockingMode) === NoMode) {
    // 初次加载时为SyncLane
    return (SyncLane: Lane);
  } else if ((mode & ConcurrentMode) === NoMode) {
    return getCurrentPriorityLevel() === ImmediateSchedulerPriority
      ? (SyncLane: Lane)
      : (SyncBatchedLane: Lane);
  } else if (
    !deferRenderPhaseUpdateToNextBatch &&
    (executionContext & RenderContext) !== NoContext &&
    workInProgressRootRenderLanes !== NoLanes
  ) {
    // This is a render phase update. These are not officially supported. The
    // 这是一个渲染阶段的更新，这些都没有得到官方的支持
    // old behavior is to give this the same "thread" (expiration time) as
    // 原来的方案是赋予它与当前渲染相同的过期时间
    // whatever is currently rendering. So if you call `setState` on a component
    // 如果你在一个组件上调用setState，他们会在相同的渲染中稍后生效，
    // that happens later in the same render, it will flush. Ideally, we want to
    // 会发生闪屏
    // remove the special case and treat them as if they came from an
    // 理想情况下，我们希望删除特例，并将它们视为来插入的事件
    // interleaved event. Regardless, this pattern is not officially supported.
    // 无论如何，这种模式并没有得到官方的支持。
    // This behavior is only a fallback. The flag only exists until we can roll
    // 这种行为值是一个回退机制，标识只存存在于我们可以离开setState警告之前
    // out the setState warning, since existing code might accidentally rely on
    // 因为现有代码可能意外地依赖于当前行为。
    // the current behavior.
    return pickArbitraryLane(workInProgressRootRenderLanes);
  }

  // The algorithm for assigning an update to a lane should be stable for all
  // updates at the same priority within the same event. To do this, the inputs
  // 对于同一事件中具有相同优先级的所有更新，为车道分配更新的算法应该是稳定的（幂等的）。
  // to the algorithm must be the same. For example, we use the `renderLanes`
  // 为此，算法的输入必须相同。
  // to avoid choosing a lane that is already in the middle of rendering.
  // 我们使用“renderLanes”来避免选择已经在渲染过程中的车道。
  // However, the "included" lanes could be mutated in between updates in the
  // 然而 included 车道可能在两次相同事件中的更新被改变
  // same event, like if you perform an update inside `flushSync`. Or any other
  // 就像在“flushSync”中执行更新一样
  // code path that might call `prepareFreshStack`.
  // 或者任何其他可能调用“prepareFreshStack”的代码。
  // The trick we use is to cache the first of each of these inputs within an
  // 我们使用的技巧是在事件中缓存这些输入中的第一个
  // event. Then reset the cached values once we can be sure the event is over.
  // 然后在确定事件结束后重置缓存的值。
  // Our heuristic for that is whenever we enter a concurrent work loop.
  // 启发式方法是，每当我们进入一个并发工作循环时
  // We'll do the same for `currentEventPendingLanes` below.
  if (currentEventWipLanes === NoLanes) {
    currentEventWipLanes = workInProgressRootIncludedLanes;
  }

  const isTransition = requestCurrentTransition() !== NoTransition;
  if (isTransition) {
    if (currentEventPendingLanes !== NoLanes) {
      currentEventPendingLanes =
        mostRecentlyUpdatedRoot !== null
          ? mostRecentlyUpdatedRoot.pendingLanes
          : NoLanes;
    }
    return findTransitionLane(currentEventWipLanes, currentEventPendingLanes);
  }

  // TODO: Remove this dependency on the Scheduler priority.
  // To do that, we're replacing it with an update lane priority.
  const schedulerPriority = getCurrentPriorityLevel();

  // The old behavior was using the priority level of the Scheduler.
  // This couples React to the Scheduler internals, so we're replacing it
  // with the currentUpdateLanePriority above. As an example of how this
  // could be problematic, if we're not inside `Scheduler.runWithPriority`,
  // then we'll get the priority of the current running Scheduler task,
  // which is probably not what we want.
  let lane;
  if (
    // TODO: Temporary. We're removing the concept of discrete updates.
    (executionContext & DiscreteEventContext) !== NoContext &&
    schedulerPriority === UserBlockingSchedulerPriority
  ) {
    lane = findUpdateLane(InputDiscreteLanePriority, currentEventWipLanes);
  } else {
    const schedulerLanePriority =
      schedulerPriorityToLanePriority(schedulerPriority);

    if (decoupleUpdatePriorityFromScheduler) {
      // In the new strategy, we will track the current update lane priority
      // inside React and use that priority to select a lane for this update.
      // For now, we're just logging when they're different so we can assess.
      const currentUpdateLanePriority = getCurrentUpdateLanePriority();

      if (
        schedulerLanePriority !== currentUpdateLanePriority &&
        currentUpdateLanePriority !== NoLanePriority
      ) {
        if (__DEV__) {
          console.error(
            "Expected current scheduler lane priority %s to match current update lane priority %s",
            schedulerLanePriority,
            currentUpdateLanePriority
          );
        }
      }
    }

    lane = findUpdateLane(schedulerLanePriority, currentEventWipLanes);
  }

  return lane;
}
```
