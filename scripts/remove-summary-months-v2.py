from pathlib import Path
p=Path('src/App.jsx')
s=p.read_text()
old='(tab==="dashboard"||tab==="transacoes"||tab==="horizonte") && ('
new='tab==="horizonte" && ('
if old not in s: raise SystemExit('condition not found')
p.write_text(s.replace(old,new,1))
