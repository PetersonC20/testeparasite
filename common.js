function byId(id){return document.getElementById(id);}
function pointForRank(rank){ if(rank === 0) return 10; if(rank === 1) return 7; if(rank === 2) return 5; if(rank === 3) return 3; return 1; }
function downloadJSON(filename, obj){ const blob = new Blob([JSON.stringify(obj, null, 2)], {type:'application/json'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = filename; a.click(); URL.revokeObjectURL(url); }
function now(){ return Date.now(); }
