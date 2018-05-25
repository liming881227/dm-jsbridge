var hasOwnProperty = Object.prototype.hasOwnProperty;
var dmJSBridge = window.dmJSBridge || (window.dmJSBridge = {});
var ua                  = navigator.userAgent;
var isIOSDevice         = /iP(hone|od|ad)/g.test(ua);
var isAndroidDevice     = /Android/g.test(ua);
var isIpadDevice        = /iPad/g.test(ua);

var cookieUtil = (function () {
  function read(name) {
    var cookieValue;
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1, c.length);
      }

      if (c.indexOf(nameEQ) == 0) {
        cookieValue = c.substring(nameEQ.length, c.length);
        //解决在tomcat下cookie前面带引号的问题
        if (cookieValue.indexOf("\"") == 0)
          cookieValue = cookieValue.substring(1, cookieValue.length - 1);
        return decodeURIComponent(cookieValue);
      }
    }
    return null;
  }

  function create(name,value,exDays) {
    var domain = '.' + location.host.split('.').splice(1).join('.');
    exDays = exDays || 30;
    var exp = new Date();
    exp.setTime(exp.getTime() + exDays*24*60*60*1000);
    document.cookie = name + "="+ escape (value) + ";expires=" + exp.toGMTString() + "; path=/; domain=" + domain;
  }

  function remove(name) {
    this.create(name, "", -1);
  }

  return {
    read: read,
    create: create,
    remove: remove
  }
})();

window.cookieUtil = cookieUtil;

//jsbridge协议定义的名称
var CUSTOM_PROTOCOL_SCHEME = 'dealmoon';
//最外层的api名称
var API_Name = 'dmbridge';

//定义的回调函数集合,在原生调用完对应的方法后,会执行对应的回调函数id
var responseCallbacks = {};
//唯一id,用来确保每一个回调函数的唯一性
var uniqueId = 1;
//本地注册的方法集合,原生只能调用本地注册的方法,否则会提示错误
var messageHandlers = {};

function JSBridgeLog() {
  if (typeof console != 'undefined') {
    console.log("dmJSBridge:JS: LOG: ",arguments);
  }
}
function JSBridgeLogException(e,m) {
  if (typeof console != 'undefined') {
    console.error("dmJSBridge:JS: EXCEPTION: ",arguments);
  }
}

//实际暴露给原生调用的对象
var Inner = {
  /**
   * @description 注册本地JS方法通过JSBridge给原生调用
   * 我们规定,原生必须通过dmJSBridge来调用H5的方法
   * 注意,这里一般对本地函数有一些要求,要求第一个参数是data,第二个参数是callback
   * @param String handlerName 方法名
   * @param Function handler 对应的方法
   * @param Function allowResponseCallback 是否也允许回调调用
   */
  registerHandler: function(handlerName, handler, allowResponseCallback) {
    messageHandlers[handlerName] = handler;
    if(allowResponseCallback) {
      responseCallbacks[handlerName] = handler;
    }
  },

  /**
   * 判断当前是否在app中
   */
  checkInApp: function () {
    // return window.inDealmoonApp = 1;
    return ua.indexOf('dealmoon') != -1;
  },

  /**
   * 返回app设置
   */
  getAppDevice: function () {
    if(isAndroidDevice) {
      return 'android';
    } else if ( isIpadDevice ) {
      return 'ipad';
    } else if ( isIOSDevice ) {
      return 'iphone';
    } else {
      return 'wap';
    }
  },

  /**
   * 判断以及登录逻辑
   */
  checkAndLogin: function (callback) {
    var curUserToken = cookieUtil.read('usertoken');
    if(!curUserToken) {
      this.openLogin({}, callback);
    } else {
      callback && callback(curUserToken);
    }
  },

  /**
   * 获取地址信息
   * @param callback
   * return
   * {
   * 	lan:
   * 	lon
   * }
   */
  getGeoInfo: function (callback) {
    var _self = this;
    if( _self.checkInApp() ) {
      //在dealmoon app中 调用原生登录
      _self.callHandler('getGeoInfo', {}, function(res) {
        callback && callback(res);
      }, true);
    } else {
      //wap页
    }
  },

  /**
   *
   * @param params
   * {
   * 	title:
   * 	description:
   * 	startTime:1515481228537
   * 	endTime: 1515481228537
   * 	alarm: true/false  是否提醒
   * }
   * @param callback
   */
  addToCalendar: function (params, callback) {
    var _self = this;
    if( _self.checkInApp() ) {
      //在dealmoon app中 调用原生登录
      _self.callHandler('addToCalendar', params, function(res) {
        callback && callback(res);
      }, true);
    } else {
      //wap页
    }
  },

  /**
   * 打开原生地图功能
   * @param params
   * {
   *   address: '3520 Preston Rd, Ste 108, Frisco, TX, 75034' //地址
   *   lat: '33.1083266',  //经纬度
   *   lon: '-96.8046477'
    * }
   * @param callback
   */
  openMap: function (params, callback) {
    var _self = this;
    if( _self.checkInApp() ) {
      //在dealmoon app中 调用原生登录
      _self.callHandler('openMap', params, function(res) {
        callback && callback(res);
      }, true);
    } else {
      //wap页
    }
  },

  /**
   * 获取App信息
   * @param callback
   */
  getAppInfo: function (callback) {
    var _self = this;
    if( _self.checkInApp() ) {
      //在dealmoon app中 调用原生登录
      _self.callHandler('getAppInfo', {}, function(res) {
        callback && callback(res);
      }, true);
    } else {
      //wap页
    }
  },

  /**
   * 判断是否登录
   */
  isLogin: function () {
    return cookieUtil.read('usertoken');
  },

  /**
   * 兼容登录处理
   * 1. 判断界面是否在dealmoon app中 如果是,则调用原生的登录窗口 否则打开wap登录页面
   * @param params
   * 	callbackUrl: url: (如果原生登录则callbackUrl?token=XXX)
   * 	scene: 登录注册场景参数
   * @param callback
   *  callback: 登录以后是否回调
   */
  openLogin: function (params, callback) {
    var _self = this;
    if( _self.checkInApp() ) {
      //在dealmoon app中 调用原生登录
      _self.callHandler('openLogin', params, function(res) {
        if( res.token ) {
          cookieUtil.create('usertoken', res.token);
          callback && callback(res.token);
        } else {
          callback && callback();
        }
      });
    } else {
      //wap页
      location.href = 'http://' + location.host.replace(/[m|cn]/,"sso")  + '?referer=1';
    }
  },

  /**
   * 调用分享组件
   * @param params
   * {
   * 	link: 分享地址
   * 	title: 分享标题
   *  desc: 分享描述
   *  imgUrl: 分享图标
   * }
   */
  openShare: function (params, callback) {
    if(!params) return false;
    params.link = params.link || location.href;
    params.title = params.title || document.title;

    var _self = this;
    if( _self.checkInApp() ) {
      //在dealmoon app中 调用原生登录
      callback && callback();
      _self.callHandler('openShare', params, function(res) {
        //callback && callback(res);
      });
    } else {
      alert('弹出本地分享图层!');
      //wap页
      location.href = 'http://' + location.host.replace(/[m|cn]/,"sso") + '?referer=1';
    }
  },

  /**
   * 打开scheme
   * @param scheme
   * @param otherParams
   */
  openScheme: function (scheme, otherParams) {
    if(!scheme) return false;
    var _self = this;
    if( _self.checkInApp() ) {
      if(otherParams) {
        scheme += ( scheme.indexOf('?') != -1 ? '&' : '?' ) + 'params=' + JSON.stringify(otherParams);
      }

      var params = {
        scheme: scheme
      };

      _self.callHandler('openScheme', params);
    } else {
      alert('请在app中使用该功能!');
    }
  },

  /**
   * 调用app分享组件
   * @param current 当前url
   * @param urls 所有urls
   */
  previewImage: function (current, urls) {

  },

  /**
   * @description 调用原生开放的方法
   * @param String handlerName 方法名
   * @param JSON data 参数
   * @param Function callback 回调函数
   * @param Function sync 是否同步回调
   */
  callHandler: function(handlerName, data, callback, sync) {
    //如果没有 data
    if(arguments.length == 3 && typeof data == 'function') {
      callback = data;
      data = null;
    }
    _doSend({
      handlerName: handlerName,
      data: data
    }, callback, sync);
  },
  
  /**
   * @description 原生调用H5页面注册的方法,或者调用回调方法
   * @param String messageJSON 对应的方法的详情,需要手动转为json
   */
  _handleMessageFromNative: function(messageJSON) {
    //setTimeout不阻塞目前页面运行
    setTimeout(_doDispatchMessageFromNative);
    /**
     * @description 处理原生过来的方法
     */
    function _doDispatchMessageFromNative() {
      // alert('receive data:' + JSON.stringify(messageJSON));
      var message;
      try {
        if(typeof messageJSON === 'string'){
          message = JSON.parse(messageJSON);
        }else{
          message = messageJSON;
        }
      } catch(e) {
        //TODO handle the exception
        console.error("原生调用H5方法出错,传入参数错误");
        return;
      }

      // alert('responseData:' + JSON.stringify(message.responseData));

      //回调函数
      var responseCallback;
      if(message.responseId) {
        //这里规定,原生执行方法完毕后准备通知h5执行回调时,回调函数id是responseId
        responseCallback = responseCallbacks[message.responseId];
        if(!responseCallback) {
          return;
        }
        
        var callbackData = null;
        if(message.responseData) {
          try {
            callbackData = JSON.parse(decodeURIComponent(message.responseData));
            // alert('callbackData:' + JSON.stringify(callbackData));
          } catch(e) {
          }
        }
        //执行本地的回调函数
        responseCallback(callbackData);
        delete responseCallbacks[message.responseId];
      } else {
        //否则,代表原生主动执行h5本地的函数
        if(message.callbackId) {
          //先判断是否需要本地H5执行回调函数
          //如果需要本地函数执行回调通知原生,那么在本地注册回调函数,然后再调用原生
          //回调数据有h5函数执行完毕后传入
          var callbackResponseId = message.callbackId;
          responseCallback = function(responseData) {
            //默认是调用EJS api上面的函数
            //然后接下来原生知道scheme被调用后主动获取这个信息
            //所以原生这时候应该会进行判断,判断对于函数是否成功执行,并接收数据
            //这时候通讯完毕(由于h5不会对回调添加回调,所以接下来没有通信了)
            _doSend({
              handlerName: message.callbackId,
              responseId: callbackResponseId,
              responseData: responseData
            });
          };
        }

        //从本地注册的函数中获取
        var handler = messageHandlers[message.handlerName];
        if(!handler) {
          //本地没有注册这个函数
        } else {
          //执行本地函数,按照要求传入数据和回调
          handler(message.data, responseCallback);
        }
      }
    }
  }
};

/**
 * @description JS调用原生方法前,会先send到这里进行处理
 * @param JSON message 调用的方法详情,包括方法名,参数
 * @param Function responseCallback 调用完方法后的回调
 * @param Function responseCallback 调用完方法后的回调
 */
function _doSend(message, responseCallback, sync) {
  if(responseCallback) {
    //取到一个唯一的callbackid
    var callbackId = Util.getCallbackId();
    //回调函数添加到集合中
    responseCallbacks[callbackId] = responseCallback;
    //方法的详情添加回调函数的关键标识
    message['callbackId'] = callbackId;

    /**
     * 同步回调
     * 1秒以后判断是否回调,没有回调可能是app不支持方法,则默认回调空
     */
    if(sync) {
      setTimeout(function () {
        if(responseCallbacks && responseCallbacks[callbackId]) {
          responseCallbacks[callbackId].apply(null, []);
          delete responseCallbacks[callbackId];
        }
      }, 1000);
    }
  }

  //获取 触发方法的url scheme
  var uri = Util.getUri(message);
  //采用iframe跳转scheme的方法

  var iFrame;
  iFrame = document.createElement("iframe");
  iFrame.setAttribute("src", uri);
  iFrame.setAttribute("style", "display:none;");
  iFrame.setAttribute("height", "0px");
  iFrame.setAttribute("width", "0px");
  iFrame.setAttribute("frameborder", "0");
  document.body.appendChild(iFrame);
  // 发起请求后这个 iFrame 就没用了，所以把它从 dom 上移除掉
  iFrame.parentNode.removeChild(iFrame);
  iFrame = null;
}

var Util = {
  getCallbackId: function() {
    return 'dmCb_' + (uniqueId ++ ) + '_' + new Date().getTime() + '_fun';
  },

  //获取url scheme
  //第二个参数是兼容android中的做法
  //android中由于原生不能获取JS函数的返回值,所以得通过协议传输
  getUri: function(message) {
    var uri = CUSTOM_PROTOCOL_SCHEME + '://' + API_Name;
    if(message) {
      //回调id作为端口存在
      var callbackId = '', method, params = '';
      if(message.callbackId) {
        //第一种:h5主动调用原生
        callbackId = message.callbackId;
        method = message.handlerName;
        params = message.data;
      } else if(message.responseId) {
        //第二种:原生调用h5后,h5回调
        //这种情况下需要原生自行分析传过去的port是否是它定义的回调
        callbackId = message.responseId;
        method = message.handlerName;
        params = message.responseData;
      } else {
        method = message.handlerName;
        params = message.data;
      }
      //参数转为字符串
      params = this.getParam(params);
      //uri 补充
      uri += '/call?func=' + method + '&callbackId=' + callbackId + '&params=' + encodeURIComponent(params);
    }

    console.log(uri);
    return uri;
  },

  getParam: function(obj) {
    if(obj && typeof obj === 'object') {
      return JSON.stringify(obj);
    } else {
      return obj || '';
    }
  }
};

for(var key in Inner) {
  if(!hasOwnProperty.call(dmJSBridge, key)) {
    dmJSBridge[key] = Inner[key];
  }
}