console.log('content script start');

let isPluginActive = false;
let vConsoleInstance = null;
let injectedScript = null;

// 初始化插件状态
const initPlugin = () => {
  const domain = new URL(window.location.href).hostname;

  // 从存储获取状态
  chrome.storage.local.get([domain]).then(result => {
    isPluginActive = result[domain] || false;
    console.log('Initial plugin status:', isPluginActive);
    
    // 根据初始状态创建/销毁vConsole
    if (isPluginActive) {
      createVConsole();
	  injectScript();
    } else {
      destroyVConsole();
    }
  });
};

// 创建vConsole实例
const createVConsole = () => {
  if (!vConsoleInstance) {
    vConsoleInstance = new VConsole({ 
      theme: 'dark',
      onClear: () => console.log('vConsole cleared')
    });
  }
};

// 销毁vConsole实例
const destroyVConsole = () => {
  if (vConsoleInstance) {
    vConsoleInstance.destroy();
    vConsoleInstance = null;
    console.log('vConsole destroyed');
  }
};

// 消息监听
chrome.runtime.onMessage.addListener((message) => {
  if (message.action === 'updateStatus') {
    if (message.domain === new URL(window.location.href).hostname) {
      const prevState = isPluginActive;
      isPluginActive = message.isActive;
      
      console.log('Status changed from', prevState, 'to', isPluginActive);
      
      if (isPluginActive && !prevState) {
        createVConsole();
        injectScript();
      } else if (!isPluginActive && prevState) {
        destroyVConsole();
        removeScript();
      }
    }
  }
});

// 加解密相关配置
const key = aesjs.utils.utf8.toBytes("14347544016586923091966513709697");
const iv = aesjs.utils.utf8.toBytes("8013507959139581");

// 初始化脚本注入
const injectScript = () => {
  if (injectedScript) return;
  var script = document.createElement('script');
  script.src = chrome.runtime.getURL('injected.js');
  script.onload = function() {
    this.remove();
  };
  (document.head || document.documentElement).appendChild(script);
};

const removeScript = () => {
  if (injectedScript) {
    injectedScript.remove();
    injectedScript = null;
    console.log('Script removed');
  }
};

// 主执行流程
initPlugin();
 
window.addEventListener('message', function (e) {
	if (!isPluginActive || !vConsoleInstance) return;
    if(!checkProtocol(e.data.url)){
        vConsoleInstance.log.log("API： ", e.data.url);
        try {
            let request = JSON.parse(e.data.request);
            let requestText = decryptAndParse(request.payload, key, iv);
            vConsoleInstance.log.log("Request: ", requestText);
        } catch (error) {
            vConsoleInstance.log.log("Request: ", null);
        }
        try {
            let response = JSON.parse(e.data.response);
            let responseText = decryptAndParse(response.payload, key, iv);
            vConsoleInstance.log.log("Response: ", responseText);
        } catch (error) {
            vConsoleInstance.log.log("Response: ", null);
        }
        vConsoleInstance.log.log("--------------------------------------------------------");
    }
});

function checkProtocol(url) {
    const lowerUrl = url.toLowerCase().substring(0,  8);
    return lowerUrl.startsWith("http://")  || lowerUrl.startsWith("https://");
}

function base64ToBytes(base64String) {
    const binaryString = atob(base64String);
    const byteArray = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        byteArray[i] = binaryString.charCodeAt(i);
    }
    return byteArray;
}

function removePkcs7Padding(data) {
    const paddingLength = data[data.length - 1];
    return data.slice(0, -paddingLength);
}

function decryptAndParse(encryptedData, key, iv) {
    try {
        const ciphertextBytes = base64ToBytes(encryptedData);
        const aesCbc = new aesjs.ModeOfOperation.cbc(key, iv);
        const decryptedBytes = aesCbc.decrypt(ciphertextBytes);
        const unpaddedBytes = removePkcs7Padding(decryptedBytes);
        const decompressedData = pako.inflate(unpaddedBytes, { to: "string" });
        return JSON.parse(decompressedData);
    } catch (error) {
        console.error("Error during decryption or parsing:", error);
        return null;
    }
}

