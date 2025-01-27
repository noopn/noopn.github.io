---
title: React Redux 解析
mathjax: true
categories:
  - React
tags:
  - React

date: 2021-04-07 17:56:50
---

#### 如何整合 UI 的更新

redux 只有简单的 subscribe 和 dispatch 的方法，而且 subscribe 执行的时候无法从回调函数中获取到数据的更新。

因此需要将 render 方法添加监听，并在监听中获取 store, 解析出需要的数据用于 UI 渲染。

```js
const store = createStore(counter);
store.subscribe(render);

function render() {
  const state = store.getState();
  const newValue = state.toString();
  const valueEl = document.getElementById("value");
  valueEl.innerHTML = newValue;
}
```

如果想要手动在 react 中集成，类似于以下的效果。但是这样存在的问题就是任何的 dispatch 都会触发 subscribe 订阅方法的执行，因此为了优化不必要的渲染，还需要做以下的事情

- 从 store 中解构出需要的数据
- 与上一次保存的数据对比, 只有在获取的数据和最后保存的数据不一致时才会更新 UI
- 保存当前的数据为了下一次对比使用

```js
import { store } from "app/store"; // 1

class TodoList extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      todos: store.getState().todos, // 4
    };

    store.subscribe(this.handleStoreUpdate); // 2
  }

  handleStoreUpdate = () => {
    const { todos } = store.getState(); // 3.1, 3.2
    this.setState({ todos }); // 3.3
  };

  render() {
    const { todos } = this.state;
    const listItems = todos.map((todo) => <TodoItem todo={todo} />);

    return <div>{listItems}</div>;
  }
}
```

这也就是 react-redux connect 方法产生的原因，它帮助解析并对比数据，只有在数据改变时才会更新 UI

connect 接受 map 方法和组件，会将 map 之后的值和 dispatch 方法传递给组件，消费者只要简单的调用 dispatch 就会触发组件的更新。

```js
function connect(mapStateToProps, mapDispatchToProps) {
  return function (WrappedComponent) {
    return class ConnectWrapper extends React.Component {
      componentDidMount() {
        this.unsubscribe = store.subscribe(this.handleChange);
      }

      componentWillUnmount() {
        this.unsubscribe();
      }

      handleChange = () => {
        this.forceUpdate();
      };

      render() {
        return (
          <WrappedComponent
            {...this.props}
            // plus props calculated from Redux store
            {...mapStateToProps(store.getState(), this.props)}
            {...mapDispatchToProps(store.dispatch, this.props)}
          />
        );
      }
    };
  };
}
```

#### 4.x

每个执行 connect 的组件都会添加一个回调函数到 subscribe 中，第一次触发 action 所有的回调函数都会执行

是否更新的判断依赖于 store 的不可变性, 会进行以下三个检查

- prevStoreState !== store.getState()
- 如果不相等，current = mapState() 检查 prev === current
- 合并所有参数 mergeProps(ownProps,stateProps,dispatchProps)

每次更新都会创建一个新组建，但是由于 React 的检查，只要完全相同的两个组件就会跳过更新，一定程度上避免子组件的渲染。

#### 5.x

核心是优化了自顶向下的更新。下面的例子中点击父组件的按钮，子组件
