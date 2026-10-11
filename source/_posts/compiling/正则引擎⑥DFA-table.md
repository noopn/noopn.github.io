---
layout: posts
title: 正则引擎中的有限自动机 ⑥ DFA Table
date: 2024-11-23 07:44:52
categories:
  - 编译原理
tags:
  - 编译原理
  - 正则
---


# DFA 转换表与子集构造算法 (DFA Transition Table: Subset Construction)

## 1. 为什么需要向 DFA 演进？

在前面两讲中，我们构建了 NFA 以及它的转换表。NFA 最大的优势在于**模块化拼装极其简单**，但它在运行时面临两大固有缺点：
1. **非确定性（Nondeterminism）**：同一字符可能导致多个可选目标状态；
2. **$\epsilon$ 转移存在**：允许状态机在不消耗字符的情况下“瞬移”。

为了彻底消除不确定性与空转移，使状态机在任何时刻面对任何字符都具有**唯一确定的下一步跳跃（$O(1)$ 速度）**，我们必须将 NFA 转换为 **DFA（确定性有限状态机）**。

---

## 2. DFA 转换表的核心特征

与 NFA 转换表相比，DFA 转换表有三个根本性的结构转变：

```text
       ┌────────── 字母表字符列 (Alphabet Σ) ──────────┐
       │                                               │
DFA 状态│               'a'             'b'             │   （无 ε* 列！）
───────┼───────────────────────────────────────────────┤
> 1,2,5│              "3,4"           "6,4"            │   <-- 单一状态值，非数组！
* 3,4  │                -               -              │   <-- 接受状态
* 6,4  │                -               -              │   <-- 接受状态（允许多个接受态！）
```

1. **没有 $\epsilon$ 列**：DFA 语法严格禁止空转移，所有隐式跳跃必须在转换前全部被“吸收”消除；
2. **单元格内容是单一状态**：对于任意状态和输入字符，目标至多是一个确定的状态标签，不再是状态数组；
3. **允许多个接受状态**：NFA 依靠不变量始终保持单一出口，但在 DFA 中，任何**包含了原 NFA 接受态的组合状态**，全都是合法的 DFA 接受态！

---

## 3. 子集构造法（Subset Construction Algorithm）

将 NFA 转化为等价 DFA 的经典算法被称为**子集构造法（Subset Construction / 幂集构造法 Powerset Construction）**。

> **核心哲学**：
> DFA 中的**每一个单一状态**，在本质上都是原 NFA 中**一组可能同时处于活跃状态的子集集合（Subset of NFA States）**！

---

### 3.1 步骤一：确定 DFA 的初始状态

DFA 必须有一个唯一的起点，它应该对应 NFA 的什么状态？
* NFA 的起点是状态 $1$，但在没有输入任何字符之前，状态机可以通过 $\epsilon$ 边自由滑行到状态 $2$ 和 $5$。
* 因此，在游戏还没开始前，系统其实**同时处于 $1$、$2$、$5$ 三个状态的叠加态中**！

> **DFA 起始状态的形式定义**：
> DFA 的起始状态，正是 **NFA 起始状态的 $\epsilon$-闭包**：
> 
> $$S_{0}^{DFA} = \epsilon\text{-closure}(S_{0}^{NFA})$$

对于 `/a|b/`，NFA 的初始态为 $1$，其闭包为 $\{1, 2, 5\}$。
我们将这个子集打包装箱，命名为一个全新的 DFA 状态：**`"1,2,5"`**（标记为起始状态 `> 1,2,5`）。

---

### 3.2 步骤二：计算字符转移的“之字形法则”（The Zig-Zag Formula）

假设 DFA 当前处于某个复合状态 $U = \{s_1, s_2, \dots, s_k\}$，当读入字符 $c$ 时，应该跃迁到哪个新的 DFA 状态？

我们需要分两步完成：
1. **收集字符转移**：从子集 $U$ 中的每一个 NFA 状态出发，找出所有在字符 $c$ 下能够到达的目标状态；
2. **吸收后续 $\epsilon$ 转移**：对上述所有目标状态求一次 **$\epsilon$-闭包**，确保把下游所有的空转移全部吸收干净！

> **DFA 转移计算公式**：
> 
> $$\delta_{DFA}(U, c) = \epsilon\text{-closure}\left( \bigcup_{s \in U} \delta_{NFA}(s, c) \right)$$

在 NFA 转换表上，这个操作就像一个**“之字形折线（Zig-Zag）”**：
* 先横向查字符列的目标；
* 再横向拉到最右侧的 $\epsilon^*$ 列取闭包！

```text
[当前 DFA 状态中的 NFA 节点] ──(查字符列)──> [目标 NFA 节点] ──(查 ε* 列)──> [最终合并的新状态]
```

---

### 3.3 步骤三：递归探索新状态（广度优先搜索队列）

每当上述计算产生了一个**之前从未见过的状态组合**（如 `"3,4"`），我们就必须把它作为一个新的行登记到 DFA 转换表中，并加入待处理队列，重复计算它在所有字符下的转移。直到没有新状态产生为止。

---

### 3.4 步骤四：判定 DFA 接受状态

> **接受状态判定准则**：
> 一个 DFA 复合状态 $U$ 是接受状态，**当且仅当它包含原 NFA 的接受状态**：
> 
> $$U \in F_{DFA} \iff S_{accept}^{NFA} \in U$$

---

从 **NFA（非确定性有限状态机）** 转化为 **DFA（确定性有限状态机）** 的过程，在编译原理中被称为 **“子集构造法（Subset Construction / 幂集构造）”**。

这套算法的核心思想只有一句话：
> **既然 NFA 会因为 $\epsilon$ 边和多选一分支产生“分身（叠加态）”，那我们就把所有可能同时处于活跃的“分身们”打包塞进一个大圈里，把这个“大圈”当成一个全新的单一 DFA 状态！**

我们以你刚刚写的正则表达式 **`/a|b/`** 为例，用**逐帧图文演播**的方式，带你走完 DFA 诞生的全过程。

---

### 初始蓝图：NFA 原始状态图与转换表

在诞生 DFA 之前，我们手头有这张由 6 个节点构成的 NFA 图：

```text
                     ε              'a'              ε
              ┌───────────> ( 2 ) ───────> ( 3 ) ───────────┐
              │                                             ▼
     > ( 1 ) ─┤                                           * (( 4 ))
   [起点]     │      ε              'b'              ε     [终点]
              └───────────> ( 5 ) ───────> ( 6 ) ───────────┘
```

对应查表字典（`nfaTable`）：
* `1` 的 $\epsilon$ 闭包 $\rightarrow$ **`[1, 2, 5]`**
* `2` 吃了 `'a'` 变 **`3`**（3 的 $\epsilon$ 闭包是 **`[3, 4]`**）
* `5` 吃了 `'b'` 变 **`6`**（6 的 $\epsilon$ 闭包是 **`[6, 4]`**）
* `4` 是接受态。
* 

```ts
Map(6) {
  '1' => Map(1) { 'ε' => [ '1', '2', '5' ] },
  '2' => Map(2) { 'a' => [ '3' ], 'ε' => [ '2' ] },
  '3' => Map(1) { 'ε' => [ '3', '4' ] },
  '4' => Map(1) { 'ε' => [ '4' ] },
  '5' => Map(2) { 'b' => [ '6' ], 'ε' => [ '5' ] },
  '6' => Map(1) { 'ε' => [ '6', '4' ] }
}
```

### 第一帧：第 1 个 DFA 超级节点的诞生（游戏开局）

* **提问**：比赛还没开始，字符一个都没输入，系统可能停在哪些节点？
* **追踪**：
  从起点 1 出发，因为有无需消耗字符的 $\epsilon$ 滑行绿道，系统在第 0 秒就已经**同时存在于 1、2、5 三个节点上了**！
* **操作**：
  我们拿一个大麻袋，把 `{1, 2, 5}` 打包成一个**全新的超级节点**，命名为 **`状态 A`（即 `"1,2,5"`）**。它就是 DFA 的起始状态！

```text
┌ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐
   DFA 起始节点 A: "1,2,5"
│                         │
    ( 1 ) ──ε──> ( 2 )
│     │                   │
      └──ε──> ( 5 )
└ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘
```

---

### 第二帧：超级节点 A 探索字符 `'a'`（之字形跳跃）

现在，假设外界喂给超级节点 A 一个字符 **`'a'`**：

1. **麻袋里的每个人各自响应**：
   * 节点 1：“我没有 `'a'` 的路”；
   * 节点 5：“我只有 `'b'`，不吃 `'a'`”；
   * **节点 2 站出来**：“我有 `'a'`！吃了 `'a'`，我跳到了 **节点 3**！”
2. **吸收目的地后续的 $\epsilon$ 边（闭包展开）**：
   * 刚落到节点 3，发现节点 3 连着一条 $\epsilon$ 边通往节点 4！
   * 于是瞬间滑翔到了节点 4。
   * 吃完 `'a'` 后的最终落点：**`[3, 4]`**！
3. **诞生新超级节点 B**：
   * 我们拿第二个麻袋，把 `{3, 4}` 打包成 **`状态 B`（即 `"3,4"`）**；
   * 并拉出一条确定的实线转移边：**`A ──['a']──> B`**！

```text
┌ ─ ─ ─ ─ ─ ─ ─ ┐                       ┌ ─ ─ ─ ─ ─ ─ ─ ┐
  超级节点 A                              超级节点 B
│    "1,2,5"    │                       │     "3,4"     │
     ( 2 ) ────────────── ['a'] ──────────────> ( 3 )   │
│               │                       │         │     │
└ ─ ─ ─ ─ ─ ─ ─ ┘                                 ▼ ε
                                        │       (( 4 )) │
                                        └ ─ ─ ─ ─ ─ ─ ─ ┘
```

---

### 第三帧：超级节点 A 探索字符 `'b'`

现在，假设外界喂给超级节点 A 另一个字符 **`'b'`**：

1. **麻袋里的每个人各自响应**：
   * 节点 1、2 不吃 `'b'`；
   * **节点 5 站出来**：“吃了 `'b'`，我跳到了 **节点 6**！”
2. **吸收闭包**：
   * 节点 6 顺着 $\epsilon$ 边滑翔到了节点 4；
   * 吃完 `'b'` 后的最终落点：**`[6, 4]`**！
3. **诞生新超级节点 C**：
   * 我们拿第三个麻袋，把 `{6, 4}` 打包成 **`状态 C`（即 `"6,4"`）**；
   * 拉出实线边：**`A ──['b']──> C`**！

```text
                                        ┌ ─ ─ ─ ─ ─ ─ ─ ┐
                                          超级节点 B
                                        │     "3,4"     │
                                        └ ─ ─ ─ ─ ─ ─ ─ ┘
                                                ▲
                                                │ ['a']
                                                │
                                        ┌ ─ ─ ─ ─ ─ ─ ─ ┐
                                          超级节点 A
                                        │    "1,2,5"    │
                                        └ ─ ─ ─ ─ ─ ─ ─ ┘
                                                │
                                                │ ['b']
                                                ▼
                                        ┌ ─ ─ ─ ─ ─ ─ ─ ┐
                                          超级节点 C
                                        │     "6,4"     │
                                        └ ─ ─ ─ ─ ─ ─ ─ ┘
```

---

### 第四帧：检查新节点 B 和 C 的出路（队列收敛）

现在队列里有刚发现的 **节点 B (`"3,4"`)** 和 **节点 C (`"6,4"`)**：

* 问节点 B：“你里面的 3 和 4，还能吃 `'a'` 或 `'b'` 吗？”
  * 查表：节点 3 和 4 都是终点段，没有任何字符出边。
  * $\rightarrow$ **节点 B 没有任何出边，填空。**
* 问节点 C：“你里面的 6 和 4，还能吃 `'a'` 或 `'b'` 吗？”
  * 查表：节点 6 和 4 同样没有任何字符出边。
  * $\rightarrow$ **节点 C 没有任何出边，填空。**

没有产生任何新的超级节点，待处理队列变空，**主循环结束！**

---

### 第五帧：插上终点红旗（确定接受态）

现在整张图骨架已经成型，谁是接受状态（终点）？

* 规则：原 NFA 的最终接受态是 **4 号节点**；
* 检查每一个超级节点的麻袋：
  * **节点 A (`"1,2,5"`)**：没有 4 $\rightarrow$ 普通起点；
  * **节点 B (`"3,4"`)**：**里面包含 4！** $\rightarrow$ 插上红旗，成为接受态！
  * **节点 C (`"6,4"`)**：**里面包含 4！** $\rightarrow$ 插上红旗，成为接受态！

---

### 终极对比：NFA 与 DFA 的蜕变

#### 蜕变前：NFA（6 个节点，充斥着混乱的虚线 $\epsilon$ 边）
```text
                     ε              'a'              ε
              ┌───────────> ( 2 ) ───────> ( 3 ) ───────────┐
              │                                             ▼
     > ( 1 ) ─┤                                           * (( 4 ))
              │      ε              'b'              ε     
              └───────────> ( 5 ) ───────> ( 6 ) ───────────┘
```

#### 蜕变后：DFA（只有 3 个确定节点，0 条 $\epsilon$ 边，单线直达）
```text
                           ┌─────── 'a' ───────> * (( 3,4 ))
                           │
                 > ( 1,2,5 )
                           │
                           └─────── 'b' ───────> * (( 6,4 ))
```

这就是 DFA 产生的完整闭环！它通过**“闭包打包、单步吃字、吸收滑行、确定连线”**，把原本充满不确定性、需要到处回溯试探的图，重构为了一个没有任何歧义的高速公路网！

### 最终生成的 DFA 转换表

|   DFA 状态    | 输入 `'a'` | 输入 `'b'` |    是否接受态？    |
| :-----------: | :--------: | :--------: | :----------------: |
| **`> 1,2,5`** |  `"3,4"`   |  `"6,4"`   |         否         |
|  **`* 3,4`**  |    $-$     |    $-$     | **是 (Accepting)** |
|  **`* 6,4`**  |    $-$     |    $-$     | **是 (Accepting)** |

---

## 5. 代码工程实现 (TypeScript)

```typescript
class DFA {
    nfaTable: Map<string, Map<string, string[]>>;

    constructor(public nfa: NFA) {
        this.nfa = nfa;
        this.nfaTable = nfa.getTransitionTable();
    }

    startId = '1'

    getAlphabet(nfaTable: Map<string, Map<string, string[]>>): string[] {
        const alphabet = new Set<string>();
        for (const row of nfaTable.values()) {
            for (const symbol of row.keys()) {
                if (symbol !== 'ε') {
                    alphabet.add(symbol);
                }
            }
        }
        return Array.from(alphabet).sort();
    }

    /**
     * 将 NFA 状态 ID 集合规范化为唯一的 DFA 状态标识字符串（如 ['2', '1', '5'] -> '1,2,5'）
     */
    private formatStateKey(ids: Iterable<string>): string {
        return Array.from(ids).sort((a, b) => Number(a) - Number(b)).join(',');
    }

    getTransitionTable(): Map<string, Map<string, string>> {
        const startClosure = this.nfaTable.get(this.startId)!.get('ε')!;
        const startStateKey = this.formatStateKey(startClosure);

        // 使用队列做 BFS 搜索，同时用 visited 集合在入队前剪枝
        const queue: string[][] = [startClosure];
        const visited = new Set<string>([startStateKey]);
        const dfaTable: Map<string, Map<string, string>> = new Map();

        while (queue.length > 0) {
            const currentIds = queue.shift()!;
            const currentStateKey = this.formatStateKey(currentIds);

            // 记录当前复合状态接收各字符后转移到的 NFA 状态集合
            const symbolTransitions = new Map<string, Set<string>>();

            for (const nfaId of currentIds) {
                const nfaRow = this.nfaTable.get(nfaId);
                if (!nfaRow) continue;

                for (const [symbol, nextIds] of nfaRow.entries()) {
                    if (symbol === 'ε') continue;

                    let targetSet = symbolTransitions.get(symbol);
                    if (!targetSet) {
                        targetSet = new Set<string>();
                        symbolTransitions.set(symbol, targetSet);
                    }

                    for (const nextId of nextIds) {
                        const closure = this.nfaTable.get(nextId)?.get('ε');
                        if (closure) {
                            for (const cid of closure) {
                                targetSet.add(cid);
                            }
                        }
                    }
                }
            }

            // 单次遍历完成：1. 填充 DFA 转移表  2. 发现新状态入队
            const row: Map<string, string> = new Map();

            for (const [symbol, targetSet] of symbolTransitions.entries()) {
                const targetKey = this.formatStateKey(targetSet);
                row.set(symbol, targetKey);

                // 入队前剪枝：仅当该 DFA 复合状态尚未发现过时才推入队列，避免重复排队与出队
                if (!visited.has(targetKey)) {
                    visited.add(targetKey);
                    queue.push(Array.from(targetSet));
                }
            }

            dfaTable.set(currentStateKey, row);
        }

        return dfaTable;
    }
}

```

