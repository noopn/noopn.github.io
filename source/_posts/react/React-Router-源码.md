---
title: React Router 解析
mathjax: true
categories:
  - React
tags:
  - React
  - React Router

date: 2023-01-23 17:57:50
---

整个项目大致分为三个包：

- router
  实现了各种类型的 history, 完成了路由配置的底层实现，例如导航，路由 loader，lazy

- react-router
  实现了各类 hooks, 根组件的 Provider, 可以用组件形式配置的 Route 组件，最终还是会被解析为 routes 配置。

- react-router-com
  完善了 React 组件，可以直接用组件去声明 BrowserRouter 还是 HashRouter 以及 Link 等业务组件。

> **history.pushState 参数解释**
> state（状态对象）一个 JavaScript 对象，用于保存与当前历史记录条目关联的状态数据。当用户通过浏览器的前进/后退按钮导航到该记录时，可以通过 popstate 事件 (event.state) 获取到这个对象。可以存储当前页面的状态（例如：滚动位置、表单数据、组件状态等），以便在导航回该页面时恢复状态。
> title（标题）理论上用于设置浏览器历史记录中该条目的标题，但目前所有主流浏览器均忽略此参数。
> url（新的 URL）指定浏览器地址栏显示的新 URL。页面不会重新加载，但必须满足同源策略（Same-origin Policy）。
> **使用 pushState 不会触发 popstate 事件**,popstate 事件仅在用户点击浏览器的后退，前进按钮或通过 JavaScript 调用 history.back()、history.forward() 或 history.go() 方法时触发。

> **go 方法的行为**,不会删除 history 的记录栈，它只是移动指针指向之前或是之后的历史地址。如果地址栏是 hash 改变默认不会刷新页面，如果是 path 改变默认会刷新页面。

#### Browser History

提供对以下接口对 history 对象进行控制。可以发现并没有对原生对象封装或扩展，而是创建了一个新对象。因此 history 对象只在 react router 内部使用。

```ts
function createBrowserLocation() {
    return let history: History = {
    get action() {
      return action;
    },
    get location() {
      return getLocation(window, globalHistory);
    },
    listen(fn: Listener) {

      window.addEventListener(PopStateEventType, handlePop);
      listener = fn;

      return () => {
        window.removeEventListener(PopStateEventType, handlePop);
        listener = null;
      };
    },
    createHref(to) {
      return createHref(window, to);
    },
    createURL,
    encodeLocation(to) {
      let url = createURL(to);
      return {
        pathname: url.pathname,
        search: url.search,
        hash: url.hash,
      };
    },
    push,
    replace,
    go(n) {
      return globalHistory.go(n);
    },
}
```

push 方法实现

```ts
function push(to: To, state?: any) {
  action = Action.Push;
  let location = createLocation(history.location, to, state);
  if (validateLocation) validateLocation(location, to);

  index = getIndex() + 1;
  let historyState = getHistoryState(location, index);
  let url = history.createHref(location);

  /// ios 有 100条 pushState 的限制
  try {
    globalHistory.pushState(historyState, "", url);
  } catch (error) {
    if (error instanceof DOMException && error.name === "DataCloneError") {
      throw error;
    }
    window.location.assign(url);
  }
}
```

#### Hash History

Hash Router 多用于静态托管环境无法配置服务器将所有路径重定向到入口文件。

hash router 的设计与 browser router 共用了对外接口的实现，因为对于浏览器来说无论是地址变化还是 hash 变化都是 pushState，当浏览器返回或前进是都会触发 popstate 事件，因此区别只是在于处理的参数不同。

react router v6 版本并没有使用 hashchange 实现事件监听。hashchange IE8+ 开始支持，popstate IE10+ 开始支持。

#### Memory History

使用数组作为历史记录栈，且监听函数不能多次绑定

```ts
export function createMemoryHistory(
  options: MemoryHistoryOptions = {}
): MemoryHistory {
  let { initialEntries = ["/"], initialIndex, v5Compat = false } = options;
  let entries: Location[]; // Declare so we can access from createMemoryLocation
  entries = initialEntries.map((entry, index) =>
    createMemoryLocation(
      entry,
      typeof entry === "string" ? null : entry.state,
      index === 0 ? "default" : undefined
    )
  );
  let index = clampIndex(
    initialIndex == null ? entries.length - 1 : initialIndex
  );
  let action = Action.Pop;
  let listener: Listener | null = null;

  function clampIndex(n: number): number {
    return Math.min(Math.max(n, 0), entries.length - 1);
  }
  function getCurrentLocation(): Location {
    return entries[index];
  }
  function createMemoryLocation(
    to: To,
    state: any = null,
    key?: string
  ): Location {
    let location = createLocation(
      entries ? getCurrentLocation().pathname : "/",
      to,
      state,
      key
    );
    warning(
      location.pathname.charAt(0) === "/",
      `relative pathnames are not supported in memory history: ${JSON.stringify(
        to
      )}`
    );
    return location;
  }

  function createHref(to: To) {
    return typeof to === "string" ? to : createPath(to);
  }

  let history: MemoryHistory = {
    get index() {
      return index;
    },
    get action() {
      return action;
    },
    get location() {
      return getCurrentLocation();
    },
    createHref,
    createURL(to) {
      return new URL(createHref(to), "http://localhost");
    },
    encodeLocation(to: To) {
      let path = typeof to === "string" ? parsePath(to) : to;
      return {
        pathname: path.pathname || "",
        search: path.search || "",
        hash: path.hash || "",
      };
    },
    push(to, state) {
      action = Action.Push;
      let nextLocation = createMemoryLocation(to, state);
      index += 1;
      entries.splice(index, entries.length, nextLocation);
      if (v5Compat && listener) {
        listener({ action, location: nextLocation, delta: 1 });
      }
    },
    replace(to, state) {
      action = Action.Replace;
      let nextLocation = createMemoryLocation(to, state);
      entries[index] = nextLocation;
      if (v5Compat && listener) {
        listener({ action, location: nextLocation, delta: 0 });
      }
    },
    go(delta) {
      action = Action.Pop;
      let nextIndex = clampIndex(index + delta);
      let nextLocation = entries[nextIndex];
      index = nextIndex;
      if (listener) {
        listener({ action, location: nextLocation, delta });
      }
    },
    listen(fn: Listener) {
      listener = fn;
      return () => {
        listener = null;
      };
    },
  };

  return history;
}
```

#### navigate

navigate 是 router 包中的核心方法，执行导航流程，中间处理各种配置，数据加载策略，loader,lazy 也会在导航过程中处理

```js
const route = createRoute([
  {
    path: "/",
  },
  {
    id: "json",
    path: "/test",
    loader: true,
    children: [
      {
        id: "text",
        index: true,
        loader: true,
      },
    ],
  },
]);

await route.navigate("/test");
```

```ts
async function navigate(
  to: number | To | null,
  opts?: RouterNavigateOptions
): Promise<void> {
  // 传入数字特殊处理，相当于 history.go
  if (typeof to === "number") {
    init.history.go(to);
    return;
  }

  // 根据参数创建将要导航的地址
  // {pathname: '/test', search: '', hash: '', state: null, key: 'h5jaikrx'}
  nextLocation = {
    ...nextLocation,
    ...init.history.encodeLocation(nextLocation),
  };

  // 记录滚动条的位置
  saveScrollPosition(state.location, state.matches);

  // 找出匹配了哪些路由
  let matched = matchRoutes(routesToUse, location, basename);

  // 处理 lazy 属性
  let loadRouteDefinitionsPromises = matches.map((m) =>
    m.route.lazy
      ? loadLazyRouteModule(m.route, mapRouteProperties, manifest)
      : undefined
  );

  // 处理路由中需要请求的数据
  let results = await dataStrategyImpl({
    matches: dsMatches,
    request,
    params: matches[0].params,
    fetcherKey,
    context: requestContext,
  });

  // 如果 loader 返回 redirect
  let redirect = findRedirect(loaderResults);
  if (redirect) {
    await startRedirectNavigation(request, redirect.result, true, {
      replace,
    });
    return { shortCircuited: true };
  }

  // 更新内部状态，执行 subscribers 添加的监听方法
  updateState();
  // 获取到数据，pushState 提交导航
  if (pendingAction === HistoryAction.Push) {
    init.history.push(location, location.state);
  }
}
```

#### 组件更新绑定

```js
const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      {
        path: "dashboard",
        element: <Dashboard />,
      },
      {
        path: "about",
        element: <About />,
      },
    ],
  },
]);

<RouterProvider router={router} fallbackElement={<BigSpinner />} />;
```

RouterProvider 会注册监听函数到 router 的 subscribes, 当 navigate 执行结束，会执行 subscribes 中注册的回调函数

**当通过 RouterProvider 定义路由时，React Router 会自动优化组件的重用和渲染逻辑** 推荐使用上面的写法，而不是组件的写法。

```ts
export function RouterProvider({
  fallbackElement,
  router,
  future,
}: RouterProviderProps): React.ReactElement {
  let [state, setStateImpl] = React.useState(router.state);

  let setState = React.useCallback<RouterSubscriber>(
    (newState: RouterState) => {
      setStateImpl(newState);
    },
    [setStateImpl]
  );

  // 导航结束会触发更新
  React.useLayoutEffect(() => router.subscribe(setState), [router, setState]);

  let navigator = React.useMemo((): Navigator => {
    return {
      //...
    };
  }, [router]);

  let basename = router.basename || "/";

  let dataRouterContext = React.useMemo(
    () => ({
      router,
      navigator,
      static: false,
      basename,
    }),
    [router, navigator, basename]
  );

  return (
    <>
      <DataRouterContext.Provider value={dataRouterContext}>
        <DataRouterStateContext.Provider value={state}>
          <Router
            basename={basename}
            location={state.location}
            navigationType={state.historyAction}
            navigator={navigator}
          >
            {state.initialized || router.future.v7_partialHydration ? (
              <DataRoutes
                routes={router.routes}
                future={router.future}
                state={state}
              />
            ) : (
              fallbackElement
            )}
          </Router>
        </DataRouterStateContext.Provider>
      </DataRouterContext.Provider>
      {null}
    </>
  );
}
```

DataRoutes 会递归处理 routers 数组，生成嵌套关系的组件树。

```ts
if (dataRouterState && future && future.v7_partialHydration) {
  for (let i = 0; i < renderedMatches.length; i++) {
    let match = renderedMatches[i];
    if (match.route.HydrateFallback || match.route.hydrateFallbackElement) {
      fallbackIndex = i;
    }

    if (match.route.id) {
      let { loaderData, errors } = dataRouterState;
      let needsToRunLoader =
        match.route.loader &&
        loaderData[match.route.id] === undefined &&
        (!errors || errors[match.route.id] === undefined);
      if (match.route.lazy || needsToRunLoader) {
        renderFallback = true;
        if (fallbackIndex >= 0) {
          renderedMatches = renderedMatches.slice(0, fallbackIndex + 1);
        } else {
          renderedMatches = [renderedMatches[0]];
        }
        break;
      }
    }
  }
}

return renderedMatches.reduceRight((outlet, match, index) => {
    let error: any;
    let shouldRenderHydrateFallback = false;
    let errorElement: React.ReactNode | null = null;
    let hydrateFallbackElement: React.ReactNode | null = null;
    let matches = parentMatches.concat(renderedMatches.slice(0, index + 1));
    let getChildren = () => {
      let children: React.ReactNode;
      if (error) {
        children = errorElement;
      } else if (shouldRenderHydrateFallback) {
        children = hydrateFallbackElement;
      } else if (match.route.Component) {
        children = <match.route.Component />;
      } else if (match.route.element) {
        children = match.route.element;
      } else {
        children = outlet;
      }
      return (
        <RenderedRoute
          match={match}
          routeContext={{
            outlet,
            matches,
            isDataRoute: dataRouterState != null,
          }}
          children={children}
        />
      );
    };
}
```

#### 组件路由是如何工作的

可以使用组件的方式来组织路由，Routes 会收集它下面的所有 Route 并渲染匹配的路由。

```ts
function App() {
  return (
    <BrowserRouter basename="/app">
      <Routes>
        <Route path="/" /> {/* 👈 Renders at /app/ */}
      </Routes>
    </BrowserRouter>
  );
}
```

Routers 会遍历自己所有的子元素，解析出组件的树结构，同样会交给上面处理 renderedMatches 的方法

```ts
export function Routes({
  children,
  location,
}: RoutesProps): React.ReactElement | null {
  function createRoutesFromChildren(children) {
    let routes: RouteObject[] = [];
    React.Children.forEach(children, (element, index) => {
      if (!React.isValidElement(element)) {
        return;
      }

      let treePath = [...parentPath, index];

      let route: RouteObject = {};

      if (element.props.children) {
        route.children = createRoutesFromChildren(
          element.props.children,
          treePath
        );
      }

      routes.push(route);
    });

    return routes;
  }
  return useRoutes(createRoutesFromChildren(children));
}
```

#### 全局拦截器

```js
const GlobalInterceptor = (props) => {
  const location = useLocation();

  if (!isAuthenticated() && location.pathname !== "/login")
    return <Navigate to="/login" replace={true} />;
  return props.children;
};

const App = () => {
  return (
    <Router>
      <GlobalInterceptor>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </GlobalInterceptor>
    </Router>
  );
};
```
