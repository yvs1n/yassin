/**
 * Digital Twin Conversational Dock UI
 * Manages suggestion chips, chat bubbles, typing indicator,
 * clear-chat control, and keyboard shortcuts (/ to focus, Esc to skip/blur).
 */

import { TwinAgent } from './twin-agent.js';

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function initTwinDock({ avatar }) {
  const chipsContainer = document.getElementById('twin-chips-row');
  const inputForm = document.getElementById('twin-form');
  const inputField = document.getElementById('twin-input');
  const submitBtn = document.getElementById('twin-submit-btn');
  const exchangeBox = document.getElementById('twin-exchange');
  if (!chipsContainer || !inputForm || !inputField || !exchangeBox) return null;

  let hasMessages = false;

  const twin = new TwinAgent({
    onStart: (question) => {
      hasMessages = true;
      exchangeBox.classList.add('active');

      const queryRow = document.createElement('div');
      queryRow.className = 'twin-query-row';
      queryRow.innerHTML = `<span class="q-icon">?</span> <span>${escapeHtml(question)}</span>`;
      exchangeBox.appendChild(queryRow);

      const typingRow = document.createElement('div');
      typingRow.className = 'twin-bubble-row typing-row';
      typingRow.id = 'twin-typing-row';
      typingRow.innerHTML = `
        <span class="arrow-icon">↳</span>
        <span class="twin-typing-indicator" aria-label="Thinking">
          <span class="twin-typing-dot"></span>
          <span class="twin-typing-dot"></span>
          <span class="twin-typing-dot"></span>
        </span>
      `;
      exchangeBox.appendChild(typingRow);
      exchangeBox.scrollTop = exchangeBox.scrollHeight;
      if (submitBtn) submitBtn.disabled = true;
    },

    onTyping: (isTyping) => {
      const typingRow = document.getElementById('twin-typing-row');
      if (typingRow) typingRow.style.display = isTyping ? 'flex' : 'none';
    },

    onTalking: (isTalking) => {
      if (avatar) avatar.setTalking(isTalking);
    },

    onBubble: (bubbleHtml, index, _total, isInstant) => {
      const typingRow = document.getElementById('twin-typing-row');
      const bubbleRow = document.createElement('div');
      bubbleRow.className = 'twin-bubble-row';
      bubbleRow.innerHTML = `
        <span class="arrow-icon">↳</span>
        <div class="bubble-text">${bubbleHtml}</div>
      `;

      if (typingRow && typingRow.parentNode) {
        exchangeBox.insertBefore(bubbleRow, typingRow);
      } else {
        exchangeBox.appendChild(bubbleRow);
      }

      if (index === 0 && !isInstant) {
        const skipHint = document.createElement('div');
        skipHint.className = 'twin-skip-hint';
        skipHint.id = 'twin-skip-hint';
        skipHint.textContent = 'Click or press Esc to skip';
        exchangeBox.appendChild(skipHint);
      }

      exchangeBox.scrollTop = exchangeBox.scrollHeight;
    },

    onDone: (followups) => {
      document.getElementById('twin-typing-row')?.remove();
      document.getElementById('twin-skip-hint')?.remove();
      if (submitBtn) submitBtn.disabled = false;
      renderChips(followups);
      exchangeBox.scrollTop = exchangeBox.scrollHeight;
    }
  });

  function clearExchange() {
    if (twin.isProcessing) twin.skip();
    hasMessages = false;
    exchangeBox.innerHTML = '';
    exchangeBox.classList.remove('active');
    renderChips(twin.getInitialChips());
  }

  function renderChips(chipsList) {
    chipsContainer.innerHTML = '';

    chipsList.forEach((q) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'twin-chip';
      btn.textContent = q;
      btn.addEventListener('click', () => {
        if (!twin.isProcessing) {
          inputField.value = '';
          twin.ask(q);
        }
      });
      chipsContainer.appendChild(btn);
    });

    const shuffleBtn = document.createElement('button');
    shuffleBtn.type = 'button';
    shuffleBtn.className = 'twin-chip shuffle-btn';
    shuffleBtn.title = 'Shuffle suggestions';
    shuffleBtn.textContent = '↻ Shuffle';
    shuffleBtn.addEventListener('click', () => renderChips(twin.rotateChips()));
    chipsContainer.appendChild(shuffleBtn);

    if (hasMessages) {
      const clearBtn = document.createElement('button');
      clearBtn.type = 'button';
      clearBtn.className = 'twin-chip clear-btn';
      clearBtn.title = 'Clear conversation';
      clearBtn.textContent = '× Clear';
      clearBtn.addEventListener('click', clearExchange);
      chipsContainer.appendChild(clearBtn);
    }
  }

  inputForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const query = inputField.value.trim();
    if (!query || twin.isProcessing) return;
    inputField.value = '';
    twin.ask(query);
  });

  // Click on exchange: navigate internal section links or skip typing
  exchangeBox.addEventListener('click', (e) => {
    const link = e.target.closest('a[data-nav-index]');
    if (link) {
      e.preventDefault();
      const navTarget = document.querySelector(`#sticky-nav .nav-link[data-index="${link.dataset.navIndex}"]`);
      navTarget?.click();
      return;
    }
    if (twin.isProcessing) twin.skip();
  });

  // Keyboard shortcuts: "/" focuses chat on hero, "Escape" skips or blurs
  window.addEventListener('keydown', (e) => {
    const tag = document.activeElement?.tagName;
    const isTypingInField = tag === 'INPUT' || tag === 'TEXTAREA';

    if (e.key === '/' && !isTypingInField && document.getElementById('home')?.classList.contains('active')) {
      e.preventDefault();
      inputField.focus();
    } else if (e.key === 'Escape') {
      if (twin.isProcessing) twin.skip();
      else if (document.activeElement === inputField) inputField.blur();
    }
  });

  renderChips(twin.getInitialChips());
  return twin;
}
