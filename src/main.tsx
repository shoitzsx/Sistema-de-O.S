import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Defensive patch: avoid hard crash when external mutations desync DOM parent/child.
if (typeof Node !== 'undefined') {
  const nodeProto = Node.prototype as Node & {
    __safeRemoveChildPatched?: boolean;
  };

  if (!nodeProto.__safeRemoveChildPatched) {
    const originalRemoveChild = Node.prototype.removeChild;
    Node.prototype.removeChild = function patchedRemoveChild<T extends Node>(child: T): T {
      if (child && child.parentNode !== this) {
        return child;
      }
      return originalRemoveChild.call(this, child) as T;
    };
    nodeProto.__safeRemoveChildPatched = true;
  }
}

createRoot(document.getElementById('root')!).render(
  <App />
);
