from pathlib import Path
import re
p=Path('src/App.jsx')
s=p.read_text()
s=s.replace('useState, useMemo, useRef, useEffect','useState, useMemo, useEffect')
s=re.sub(r'// ── Import Sheet ─+.*?// ── Main App ─+\n', '// ── Main App ─────────────────────────────────────────────────────────────────\n', s, flags=re.S)
s=s.replace('  const [showImport, setShowImport] = useState(false);\n','')
s=s.replace('  const [importSuccess, setImportSuccess] = useState(0);\n','')
s=re.sub(r'\n  const handleImportConfirm = async \(newTs\) => \{.*?\n  \};\n\n  const removeTransaction', '\n  const removeTransaction', s, flags=re.S)
s=re.sub(r'\n      \{importSuccess > 0.*?\n', '\n', s)
# header: remove paperclip button only
s=re.sub(r'\n\s*<button className="btn" onClick=\{\(\)=>setShowImport\(true\)\}.*?</button>', '', s, count=1, flags=re.S)
# dashboard import CTA
s=re.sub(r'\n\s*<button className="btn" onClick=\{\(\)=>\{setTab\("transacoes"\);setShowImport\(true\)\}\}.*?</button>', '', s, count=1, flags=re.S)
# Burgeria special dashboard card
s=re.sub(r'\n\s*\{/\* Burgeria highlight \*/\}.*?\n\s*\}\)\(\)\}', '', s, count=1, flags=re.S)
# transaction-page import CTA
s=re.sub(r'\n\s*<button className="btn" onClick=\{\(\)=>setShowImport\(true\)\}.*?Importar extrato ou boleto com IA\s*</button>', '', s, count=1, flags=re.S)
# import modal render
s=re.sub(r'\n\s*\{showImport&&<ImportSheet.*?/>\}', '', s)
# Burgeria is now a regular category everywhere: no burger-only icon/treatment
s=s.replace('{cat==="Burgeria"?"🍔 ":""}{cat}', '{cat}')
s=s.replace('{c==="Burgeria"?"🍔 Burgeria":c}', '{c}')
s=s.replace('background:t.categoria==="Burgeria"?"rgba(249,115,22,0.15)":t.tipo==="receita"?"rgba(74,222,128,0.1)":"rgba(248,113,113,0.1)"', 'background:t.tipo==="receita"?"rgba(74,222,128,0.1)":"rgba(248,113,113,0.1)"')
s=s.replace('{t.categoria==="Burgeria"?"🍔":t.tipo==="receita"?"💰":"💸"}', '{t.tipo==="receita"?"💰":"💸"}')
s=s.replace('background:t.categoria==="Burgeria"?"rgba(249,115,22,0.15)":t.tipo==="receita"?"rgba(74,222,128,0.12)":"rgba(248,113,113,0.12)"', 'background:t.tipo==="receita"?"rgba(74,222,128,0.12)":"rgba(248,113,113,0.12)"')
s=s.replace('const cor = over?"#f87171":pct>75?"#fbbf24":cat==="Burgeria"?"#f97316":"#4ade80";', 'const cor = over?"#f87171":pct>75?"#fbbf24":"#4ade80";')
# Fail loudly if legacy import UI survived.
for forbidden in ['ImportSheet','showImport','handleImportConfirm','Importar extrato ou boleto','Analisar com IA','importSuccess']:
    if forbidden in s: raise SystemExit(f'legacy import token remains: {forbidden}')
p.write_text(s)
