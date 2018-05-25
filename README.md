## Examples

## install
```js
import jsbridge from 'dm-jsbridge'
```

```js
window.dmJSBridge.registerHandler('testH5Func', function(data, callback) {
  alert('测试函数接收到数据:' + JSON.stringify(data));
  callback && callback('测试回传数据...');
});

window.dmJSBridge.callHandler('testNativeFunc', data, function(res) {
  alert('receive data,' + JSON.stringify(res));
  callback && callback(res);
});
```

