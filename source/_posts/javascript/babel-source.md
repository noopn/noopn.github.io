---
title: Babel 源码与插件

mathjax: true
categories:
  - JavaScript
tags:
  - Babel

date: 2024-12-22 15:12:00
---

#### 调式源码

```bash
git clone https://github.com/<your-github-username>/babel
cd babel
make bootstrap

# 在想要调试文件的入口处添加断点
# -i 指定测试package
# -t 指定测试用例 fixtures
yarn run  jest -i packages/babel-parser -t 'es2016/simple parameter list/arrow function'
```

#### 插件开发最小化环境

相关依赖包

```json
{
  "babel-plugin-tester": "^11.0.4",
  "jest": "^29.7.0",
  "ts-jest": "^29.2.6",
  "ts-node": "^10.9.2",
  "typescript": "^5.8.2"
}
```

测试文件入口与 fixtures 用例

```js
//__test__/index.ts

import { pluginTester } from "babel-plugin-tester";
import insertLogPlugin from "../plugins/babel-plugin-insert-log";
import path from "path";

pluginTester({
  plugin: insertLogPlugin,

  babelOptions: {
    plugins: ["@babel/plugin-syntax-jsx"],
  },
  fixtures: path.join(__dirname, "fixtures"),
});
```

```js
// __tests__/fixtures/in-arrow-function/code.ts
const a = () => console.log(1);

// __tests__/fixtures/in-arrow-function/output.ts
const a = () => {
  console.log(1);
};
```

jest 配置文件, 排除 fixtures 目录下的测试用例，避免多次执行

```ts
/** @type {import('ts-jest').JestConfigWithTsJest} **/
module.exports = {
  testEnvironment: "node",
  transform: {
    "^.+.tsx?$": ["ts-jest", {}],
  },
  testMatch: ["**/__tests__/**/*", "!**/fixtures/**/*"],
};
```

#### babel-parser

使用多个类继承，完善 parser 功能

```js
export default class Parser extends StatementParser{}
abstract class StatementParser extends ExpressionParser{}
abstract class ExpressionParser extends LValParser{}
abstract class LValParser extends NodeUtils{}
abstract class NodeUtils extends UtilParser{}
abstract class UtilParser extends Tokenizer{}
abstract class Tokenizer extends CommentsParser{}
class CommentsParser extends BaseParser{}
```

解析 `le\\u0074 x = 5` 流程：

- 实例化 Parser，调用 parse 方法开始解析

- 初始化 file, grogram 节点

- 尝试解析 token

  - 跳过空白符，注释等

  - 根据第一个字符判断要如何解析， 比如 `l` 为一个小写字母， 会被当作 Identifier 解析

  - 尝试读取完成的标识符

    `this.state.pos += str <= 0xffff ? 1 : 2;` 如果字符 charCode 大于 0xffff 例如 `龘`, 则向后移动两个字符

    如果匹配到 `\`, 则判断是否是一个 Unicode 转义序列,后面三位必须是 `\\u` 开头，如果不是则标记错误

    如果是一个转移字符，尝试读取这个转义字符并返回, 因此第一个 token 会是 `let`

  - 解析 Program 节点，`let` 作为 ExpressionStatement 加入 Program 节点，保存在 body 数组中

    继续尝试解析 x = 5 这个表达式作为 AssignmentExpression，x 和 5 作为 Identifier 和 NumericLiteral 加入 AssignmentExpression 分别作为 left 和 right

最终形成的树结构就是 ast.

