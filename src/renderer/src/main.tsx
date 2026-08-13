import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { installMockBridge } from './mockBridge';
import './styles.css';

// 纯浏览器调试（无 Electron preload）：注入 mock 桥，UI 全功能可演示
installMockBridge();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
