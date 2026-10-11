---
layout: posts
title: 正则引擎中的有限自动机 ④ NFA acceptor/table
date: 2024-11-20 04:33:46
categories:
  - 编译原理
tags:
  - 编译原理
  - 正则
---

# NFA 接收器与图遍历匹配算法 (NFA Acceptor: Graph Traversal Engine)

## 1. 架构总览：从“静态电路图”到“动态求值引擎”

上一章节，我们实现了五大基础 NFA 构建块（单字符、空串、连接、并集、闭包）以及针对字符集的工程优化。这些工厂函数的核心任务是**“画图纸 / 搭电路”**——它们在内存中建立起由 `State` 对象与转移边构成的静态有向图。

本讲开启了第三模块的核心篇章：**如何驱动这台机器去执行真正的字符串匹配校验？**

```
┌──────────────────────────────────────────────────────────────┐
│                    静态构建阶段 (Builder)                    │
│   char('a'), concatenation(nfa1, nfa2), or(nfa1, nfa2)...    │
└──────────────────────────────┬───────────────────────────────┘
                               │ 生成静态 NFA 图
                               ▼
┌──────────────────────────────────────────────────────────────┐
│                    动态求值阶段 (Acceptor)                   │
│          nfa.test("abc") ──> 判定该字符串是否被该机器接受        │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. 委托模式：`NFA` 与 `State` 的职责划分

在面向对象架构中，`NFA` 类对外暴露统一的 `test(string)` 接口，但它自身并不直接执行深度图搜索，而是**薄薄地封装了一层委托（Delegation）**，将匹配工作完全交给它的起始节点 `inState`：

```typescript
class NFA {
  constructor(
    public inState: State,
    public outState: State
  ) {}

  /**
   * 判定输入字符串是否被当前 NFA 接受
   * 核心工作委托给唯一入口 inState 的 test 方法
   */
  test(string: string): boolean {
    return this.inState.test(string);
  }
}
```

### 为什么可以从 `inState` 线性委托？
这正是得益于我们贯穿始终的**核心架构不变量（Architectural Invariant）**：
* 任何合法的 NFA 片段都**有且仅有一个明确的入口**（`inState`）；
* 任何合法的 NFA 片段都**有且仅有一个全局出口**（`outState`，且标记为 `accepting: true`）。

因此，匹配逻辑总是且必须从 `inState` 出发，沿着有向边一路探索。

---

## 3. 图遍历匹配算法详解 (DFS / Backtracking)

`State.prototype.test(string)` 的本质是一个**基于深度优先搜索（DFS）与回溯（Backtracking）的有向图可达性判定器**。

在每一步递归中，状态机面临两类转移：
1. **符号转移（Symbol Transition）**：必须消耗输入流中的当前字符；
2. **空串转移（$\epsilon$-Transition）**：**不消耗**任何输入字符，瞬间自由跳转。

```
                          ┌───────────────────────────┐
                          │   State.prototype.test    │
                          │   (string, visited)       │
                          └─────────────┬─────────────┘
                                        │
                         字符串是否为空 (string === "")?
                                 /              \
                              [是]              [否]
                               /                  \
                     当前是否为接受态?         1. 尝试匹配当前字符 string[0]:
                      /          \               有字符边 -> 消耗字符, 递归 test(rest)
                   [是]          [否]          2. 尝试走 ε 边 (不消耗字符):
                   /                \            有 ε 边 -> 保持原串, 递归 test(string)
             返回 true         顺着 ε 边搜索:
                              能否抵达接受态?
```

### 3.1 终止条件判定（Base Cases）

#### 情况 A：输入字符串已完全消耗完毕（`string.length === 0`）
1. **成功终态**：如果当前状态恰好是接受状态（`this.accepting === true`），说明输入字符串完整且精确地导向了终点，**直接返回 `true`**。
2. **潜伏路径（绝不能轻言放弃！）**：如果当前状态还不是接受状态，**不能立刻判定失败**！
   - 因为当前状态后面可能连接着若干条 $\epsilon$ 边；
   - 这些 $\epsilon$ 边允许状态机在**不吃任何字符**的情况下继续向前“瞬移”，最终抵达接受状态！
   - 因此，仍需沿着所有 $\epsilon$ 出边继续递归探测。如果其中任意一条路径能抵达接受状态，返回 `true`；否则返回 `false`。

#### 情况 B：输入字符串尚未结束（`string.length > 0`）
当前状态需要分别尝试两条路：
1. **分支一：字符边匹配（消耗字符）**
   - 取出首字符 `char = string[0]`；
   - 查询当前状态是否存在标记为 `char` 的出边：`this.getTransitionsForSymbol(char)`；
   - 若存在，则字符被成功消耗，递归调用下一跳状态的 `test(string.slice(1))`；
   - 只要有任意一个分支递归成功返回 `true`，整体即刻判定成功（短路返回 `true`）。
2. **分支二：$\epsilon$ 边瞬移（不消耗字符）**
   - 即使当前字符没有匹配的字符边，或者字符边匹配失败，状态机依然可以尝试走 $\epsilon$ 边；
   - 走 $\epsilon$ 边时，输入字符串保持原样（`string` 不缩短），递归调用下一跳状态的 `test(string)`；
   - 同样，若有分支返回 `true`，整体判定成功。

---

## 4. 核心陷阱：$\epsilon$-环路与死循环防范

### 4.1 死循环危机
考虑闭包模式或复合模式（如 `/(a*)* /` 或存在回环边的结构）：
```
             ┌────────── ε ──────────┐
             ▼                       │
          ( S1 ) ──────── ε ───────> ( S2 )
```
如果图结构中存在由 $\epsilon$ 边构成的环路，且当前处于 `string === ""` 或走 $\epsilon$ 路径，递归函数将在状态之间无限来回横跳，最终导致**调用栈溢出（Maximum call stack size exceeded）**！

### 4.2 访问集防线 (`visited: Set<State>`)
为了彻底消除死循环，算法引入了一个只针对 $\epsilon$ 转移的**访问记录集（Visited Set）**：
* 当沿着一条 $\epsilon$ 边前进时，将目标状态登记入 `visited` 集合；
* 如果在**未消耗任何字符**的前提下再次回到了 `visited` 中的某个状态，说明陷入了无意义的 $\epsilon$ 死循环，**直接剪枝返回 `false`**；
* **关键重置时机**：一旦状态机沿着真实的**字符边**前进并成功消耗了一个字符，输入纸带已经推进一步，这一轮的 `visited` 集合必须**清空重置**（因为不同字符位置重新访问同一状态是完全合法且必要的重复！）。

---

## 5. 完整代码工程实现

在 `State` 类与 `NFA` 类中补充完整的 `test` 逻辑：

```typescript
export const EPSILON = 'ε';

export class State {
  accepting: boolean;
  transitions: Map<string, State[]>;

  constructor({ accepting = false } = {}) {
    this.accepting = accepting;
    this.transitions = new Map();
  }

  addTransitionForSymbol(symbol: string, state: State): void {
    const list = this.transitions.get(symbol);
    if (list) {
      list.push(state);
    } else {
      this.transitions.set(symbol, [state]);
    }
  }

  getTransitionsForSymbol(symbol: string): State[] {
    return this.transitions.get(symbol) || [];
  }

  /**
   * 图遍历执行器：递归深度优先搜索 + 回溯
   * @param string 当前待匹配的剩余字符串
   * @param visited 仅用于 ε 转移的环路检测集合
   */
  test(string: string, visited: Set<State> = new Set()): boolean {
    // 1. ε 环路死循环检测：若在空跳转下重复踩中已访问状态，直接剪枝
    if (visited.has(this)) {
      return false;
    }
    visited.add(this);

    // 2. 基准情况：字符串已被消耗殆尽
    if (string.length === 0) {
      // 成功终点：停留在接受状态
      if (this.accepting) {
        return true;
      }
      // 虽未在接受态，但尝试通过剩余的 ε 边能否滑向接受态
      for (const nextState of this.getTransitionsForSymbol(EPSILON)) {
        if (nextState.test('', visited)) {
          return true;
        }
      }
      return false;
    }

    // 3. 递归情况：字符串非空
    const symbol = string[0];
    const rest = string.slice(1);

    // 路径 A：匹配当前字符边（消耗 1 个字符）
    // 注意：一旦消耗了字符，新的递归分支使用全新独立的 visited 集！
    const symbolTransitions = this.getTransitionsForSymbol(symbol);
    for (const nextState of symbolTransitions) {
      if (nextState.test(rest, new Set())) {
        return true;
      }
    }

    // 路径 B：尝试 ε 空转移（不消耗字符）
    // 继承当前的 visited 集合，持续监控 ε 环路
    const epsilonTransitions = this.getTransitionsForSymbol(EPSILON);
    for (const nextState of epsilonTransitions) {
      if (nextState.test(string, visited)) {
        return true;
      }
    }

    // 所有可能路径均无法抵达接受态
    return false;
  }
}
```

---

## 6. 双游标执行轨迹演练 (Trace Walkthrough)

### 案例：以连接机器 `/ab/` 匹配 `"ab"` 为例

机器结构拓扑：
```text
(S1) ──['a']──> (S2) ──[ε]──> (S3) ──['b']──> ((S4: accepting))
```

| 步数  | 当前状态 | 剩余字符串 | 触发动作                                                    | visited 状态 | 判定分支                        |
| :---: | :------: | :--------: | :---------------------------------------------------------- | :----------: | :------------------------------ |
| **1** |   `S1`   |   `"ab"`   | 读取 `string[0] === 'a'`，命中字符边 `S1 -> S2`             |    `{S1}`    | 消耗 `'a'`，进入 `S2.test("b")` |
| **2** |   `S2`   |   `"b"`    | 检查字符边 `'b'`：无出边！转向尝试 $\epsilon$ 边 `S2 -> S3` |    `{S2}`    | 保持 `"b"`，进入 `S3.test("b")` |
| **3** |   `S3`   |   `"b"`    | 读取 `string[0] === 'b'`，命中字符边 `S3 -> S4`             |  `{S2, S3}`  | 消耗 `'b'`，进入 `S4.test("")`  |
| **4** |   `S4`   |    `""`    | 字符串为空！检查 `S4.accepting === true`                    |     `{}`     | **匹配成功！返回 `true`**       |


# NFA 转换表与 ε-闭包计算 (NFA Transition Table & ε-Closure)

## 1. 为什么需要转换表？(From Graph to Matrix)

在上一讲中，我们通过直接在 NFA 状态图上进行递归回溯遍历，实现了一个功能完备的 `test` 接收器。

然而，在编译器工业实现中，**直接在指针图上游走存在重大性能瓶颈**：
1. **内存碎片与指针跳转（Pointer Chasing）**：图遍历充斥着散乱的堆内存寻址与缓存未命中；
2. **非确定性（Nondeterminism）与 $\epsilon$ 边**：导致程序执行流分叉、需要反复维护 `visited` 集合以防环路死循环；
3. **向 DFA 进化的必经之路**：为了将正则引擎彻底加速为确定性的 $O(1)$ 单步跳转，第一步必须将散乱的图模型结构化为统一的**转换矩阵（Transition Table）**。

---

## 2. NFA 转换表的结构剖析 (Anatomy of the NFA Table)

NFA 转换表将状态机的所有拓扑信息浓缩为一张二维网格：

```text
       ┌────────── 字母表字符列 (Alphabet Σ) ──────────┐    ┌── 核心闭包列 ──┐
       │                                               │    │                │
状态行  │               'a'             'b'             │    │       ε*       │
───────┼───────────────────────────────────────────────┼────┼────────────────┤
  > 1  │               -                -              │    │   { 1, 2, 5 }  │
    2  │              {3}               -              │    │      { 2 }     │
    3  │               -                -              │    │    { 3, 4 }    │
  * 4  │               -                -              │    │      { 4 }     │
    5  │               -               {6}             │    │      { 5 }     │
    6  │               -                -              │    │    { 6, 4 }    │
```

### 表格要素说明：
1. **行表头（Rows - 状态标签）**：
   - 包含 NFA 图中的所有状态节点。
   - 每个状态分配一个唯一标签（如数字 `1, 2, 3...` 或字母）。
   - **特殊标记**：
     - `>` 或 `->`：标记机器的**初始状态（Start State）**（如 `> 1`）；
     - `*` 或双圈：标记机器的**接受状态（Accepting State）**（如 `* 4`）。
2. **字符列（Columns - 字母表 $\Sigma$）**：
   - 包含该正则模式中出现的所有真实字符（例如 `/a|b/` 的字符集为 `{'a', 'b'}`）。
   - 单元格内记录从当前状态读入该字符后所转移到的**目标状态集合**（因非确定性，可能是 0 个、1 个或多个状态）。
3. **核心扩展列：$\epsilon^*$ 列（Epsilon-Closure / 空转移闭包）**：
   - 这是 NFA 转换表中最核心、最重要的列，也是后续消除所有 $\epsilon$ 边并转化为 DFA 的绝对基石。

---

## 3. 核心概念：$\epsilon$-闭包（Epsilon Closure, $\epsilon^*$）

### 3.1 语义与数学定义
类比于克莱恩星号闭包（Kleene Closure, $A^*$ 表示重复 0 次或多次），**$\epsilon$-闭包（记作 $\epsilon^*(S)$）** 表示：
> **从状态 $S$ 出发，沿着 0 条或多条 $\epsilon$ 转移边所能抵达的所有状态的集合。**

$$\epsilon\text{-closure}(S) = \{ q \in Q \mid S \xrightarrow{\epsilon^*} q \}$$

### 3.2 自反性铁律：必须包含状态本身！
> [!IMPORTANT]
> **任何状态的 $\epsilon$-闭包，第一项永远是它自身！**
> 
> 即：$$S \in \epsilon\text{-closure}(S)$$
> 
> **原因**：消耗“0 个 $\epsilon$ 转移”意味着原地不动。不消耗任何字符留在当前状态，在物理语义上完全等价于存在一条指向自己的隐式 $\epsilon$ 转移。

### 3.3 闭包计算演示
以状态 $1$ 为例（图见下节）：
1. 首先加入自身：`{ 1 }`；
2. 状态 $1$ 有两条显式 $\epsilon$ 出边：分别通往状态 $2$ 和状态 $5$；
3. 检查状态 $2$ 和 $5$，它们均没有更深层的 $\epsilon$ 出边；
4. 搜索结束，状态 $1$ 的 $\epsilon$-闭包为：`{ 1, 2, 5 }`。

---

## 4. 经典全流程实战：构建 `/a|b/` 的 NFA 转换表

我们以标准的并集模式 `/a|b/` 为例，完整走一遍手工与算法建表流程。

### 4.1 NFA 拓扑图与状态编号

根据 Thompson 构造法，`/a|b/` 包含 6 个状态节点：

```text
                     ε              'a'              ε
              ┌───────────> ( 2 ) ───────> ( 3 ) ───────────┐
              │                                             ▼
     > ( 1 ) ─┤                                           * (( 4 ))
   [Start]    │      ε              'b'              ε     [Accept]
              └───────────> ( 5 ) ───────> ( 6 ) ───────────┘
```

### 4.2 逐行计算状态转移与闭包

#### 状态 1（初始入口 `> 1`）：
* **读入 `'a'`**：无任何直接字符边 $\rightarrow$ 填空（或 $\emptyset$）；
* **读入 `'b'`**：无任何直接字符边 $\rightarrow$ 填空；
* **$\epsilon^*$ 闭包**：包含自身 $1$，顺着 $\epsilon$ 边可达 $2$ 和 $5$ $\rightarrow$ **`{ 1, 2, 5 }`**。

#### 状态 2：
* **读入 `'a'`**：有一条边连向状态 $3$ $\rightarrow$ **`{ 3 }`**；
* **读入 `'b'`**：无出边 $\rightarrow$ 填空；
* **$\epsilon^*$ 闭包**：无 $\epsilon$ 出边，仅含自身 $\rightarrow$ **`{ 2 }`**。

#### 状态 3：
* **读入 `'a'` / `'b'`**：均无字符出边 $\rightarrow$ 填空；
* **$\epsilon^*$ 闭包**：自身 $3$，加上顺着 $\epsilon$ 边直达的 $4$ $\rightarrow$ **`{ 3, 4 }`**。

#### 状态 4（最终接受态 `* 4`）：
* **读入 `'a'` / `'b'`**：全局出口，无任何字符出边 $\rightarrow$ 填空；
* **$\epsilon^*$ 闭包**：自身 $4$ $\rightarrow$ **`{ 4 }`**。

#### 状态 5：
* **读入 `'a'`**：无出边 $\rightarrow$ 填空；
* **读入 `'b'`**：有一条边连向状态 $6$ $\rightarrow$ **`{ 6 }`**；
* **$\epsilon^*$ 闭包**：自身 $5$ $\rightarrow$ **`{ 5 }`**。

#### 状态 6：
* **读入 `'a'` / `'b'`**：无字符出边 $\rightarrow$ 填空；
* **$\epsilon^*$ 闭包**：自身 $6$，加上顺着 $\epsilon$ 边直达的 $4$ $\rightarrow$ **`{ 6, 4 }`**。

### 4.3 最终生成的完整 NFA 转换表

| 状态 (State) | 输入 `'a'`  | 输入 `'b'`  | $\epsilon^*$ (Epsilon-Closure) |
| :----------: | :---------: | :---------: | :----------------------------: |
|  **`> 1`**   | $\emptyset$ | $\emptyset$ |       **`{ 1, 2, 5 }`**        |
|   **`2`**    |   `{ 3 }`   | $\emptyset$ |          **`{ 2 }`**           |
|   **`3`**    | $\emptyset$ | $\emptyset$ |         **`{ 3, 4 }`**         |
|  **`* 4`**   | $\emptyset$ | $\emptyset$ |          **`{ 4 }`**           |
|   **`5`**    | $\emptyset$ |   `{ 6 }`   |          **`{ 5 }`**           |
|   **`6`**    | $\emptyset$ | $\emptyset$ |         **`{ 6, 4 }`**         |

---

## 5. 代码工程实现 (TypeScript)

### 5.1 数据结构定义
```typescript
export type StateId = number | string;

export interface NFATableRow {
  state: StateId;
  isStart: boolean;
  isAccepting: boolean;
  transitions: Record<string, StateId[]>; // 字符 -> 目标状态数组
  epsilonClosure: StateId[];              // ε* 闭包集合
}

export type NFATable = NFATableRow[];
```

### 5.2 计算单个状态的 $\epsilon$-闭包算法
```typescript
export function getEpsilonClosure(startState: State): Set<State> {
  // 铁律：闭包必定包含状态自身
  const closure = new Set<State>([startState]);
  const stack = [startState];

  while (stack.length > 0) {
    const currentState = stack.pop()!;
    const epsTransitions = currentState.getTransitionsForSymbol(EPSILON);

    // 空过渡节点还可能指向下一个空过渡节点，所以需要递归处理
    for (const targetState of epsTransitions) {
      if (!closure.has(targetState)) {
        closure.add(targetState);
        stack.push(targetState); // 递归深入追踪链式 ε
      }
    }
  }

  return closure;
}
```

### 5.3 遍历图生成 NFA 转换表
```typescript
getTransitionTable(): Map<string, Map<string, string[]>> {
    const stateToId: Map<State, number> = new Map();
    const states: State[] = []
    const nfaTable: Map<string, Map<string, string[]>> = new Map();

    // 给每一个state的对象生成独立的ID,通过map映射I和state
    const mark = (state: State) => {

        if (stateToId.has(state)) return;
        stateToId.set(state, states.length + 1);
        states.push(state);
        for (let transitions of state.transitions.values()) {
            for (let nextState of transitions) {
                mark(nextState)
            }
        }
    }

    mark(this);
    
    // 第一层循环遍历所有独立的state对象
    for (let state of states) {
        const id = stateToId.get(state);
        const row = new Map();

        // 遍历每一个state对象的字符集，如果是空字符就跳过
        // 如果是一个合法的正则文法字符，就获取这个字符可以跳转到所有状态
        // 根据这些状态反查ID，建立字符到某一个状态对应的ID映射
        for (let [char, nextStates] of state.transitions.entries()) {
            if (char === EPSILON) continue;

            const targetIds = nextStates.map(state => String(stateToId.get(state)))
            row.set(char, targetIds)
        }

        // 当前状态可以通过空节点所能达到的所有状态
        const closureStates = state.getEpsilonClosure();
        const closureIds = closureStates.map(state => String(stateToId.get(state)))
        row.set(EPSILON, closureIds)
        nfaTable.set(String(id), row)
    }
    return nfaTable;
}


// 最终生成的结构

// Map(6) {
//   '1' => Map(1) { 'ε' => [ '1', '2', '5' ] },
//   '2' => Map(2) { 'a' => [ '3' ], 'ε' => [ '2' ] },
//   '3' => Map(1) { 'ε' => [ '3', '4' ] },
//   '4' => Map(1) { 'ε' => [ '4' ] },
//   '5' => Map(2) { 'b' => [ '6' ], 'ε' => [ '5' ] },
//   '6' => Map(1) { 'ε' => [ '6', '4' ] }
// }
```

