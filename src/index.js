import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// A importação de documentos com IA foi descontinuada. Enquanto o código legado
// é removido do App principal, este filtro garante que nenhum atalho antigo da
// interface continue acessível ao usuário.
const removeLegacyAiImportActions = () => {
  document.querySelectorAll('button').forEach((button) => {
    const text = (button.textContent || '').trim();
    if (text === '📎' || text.includes('Importar extrato ou boleto') || text.includes('Analisar com IA')) {
      button.remove();
    }
  });
};

const observer = new MutationObserver(removeLegacyAiImportActions);
observer.observe(document.documentElement, { childList: true, subtree: true });

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);
removeLegacyAiImportActions();
