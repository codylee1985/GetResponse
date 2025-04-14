let currentIconState = null;

document.addEventListener('DOMContentLoaded', async () => {
  
  const toggle = document.getElementById('toggle');
  const statusText = document.getElementById('statusText');

  try {
    // 获取当前活动标签页
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentUrl = new URL(tab.url);
    const domain = currentUrl.hostname;

    // 初始化状态显示
    statusText.textContent = '正在加载状态...';

    // 从存储获取该域名的状态（默认false）
    const storage = await chrome.storage.local.get(domain);
    const isActive = storage[domain] || false;

    // 设置初始状态
    toggle.checked = isActive;
    updateStatusDisplay(isActive);
	updateIcon(isActive);

    // 监听开关变化
    toggle.addEventListener('change', async () => {
      const newState = toggle.checked;
      
      // 更新存储状态
      if (newState) {
        // 有效状态：存储状态
        await chrome.storage.local.set({ [domain]: true });
      } else {
        // 无效状态：移除存储条目
        await chrome.storage.local.remove(domain);
      }
      
      // 更新图标和界面显示
	  updateIcon(newState);
      updateStatusDisplay(newState);
      
      // 发送状态更新到content script
      chrome.tabs.sendMessage(tab.id, { 
        action: 'updateStatus',
        isActive: newState,
        domain: domain
      });
    });
	
  } catch (error) {
    console.error('Error:', error);
    statusText.textContent = '状态获取失败';
    toggle.disabled = true;
	updateIcon(false);
  }
});

function updateStatusDisplay(isActive) {
  const statusText = document.getElementById('statusText');
  const slider = document.querySelector('.slider');
  
  statusText.textContent = isActive ? '在此网站有效' : '在此网站无效';
  statusText.style.color = isActive ? '#07C160' : '#757575';
  slider.style.backgroundColor = isActive ? '#07C160' : '#dee2e6';
}

function updateIcon(isActive) {
  // 状态未变化时跳过更新
  if (currentIconState === isActive) return;
  
  currentIconState = isActive;
  const iconPath = isActive ? 'icons/active/' : 'icons/inactive/';

  chrome.action.setIcon({
    path: {
      "16": `${iconPath}icon16.png`,
      "48": `${iconPath}icon48.png`
    }
  }).catch(error => {
    console.error('图标更新失败:', error);
  });
}