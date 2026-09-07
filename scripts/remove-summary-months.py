from pathlib import Path
p=Path('src/App.jsx')
s=p.read_text()
old='(tab==="dashboard"||tab==="transacoes"||tab==="horizonte") && ('
new='tab==="horizonte" && ('
if old not in s:
    raise SystemExit('month selector condition not found')
s=s.replace(old,new,1)
p.write_text(s)
