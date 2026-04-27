import { useState, useCallback } from 'react';
import './Calculator.css';

export default function Calculator({ onClose }) {
  const [display, setDisplay] = useState('0');
  const [prev, setPrev] = useState(null);
  const [op, setOp] = useState(null);
  const [waitNext, setWaitNext] = useState(false);

  const input = useCallback((val) => {
    if (waitNext) {
      setDisplay(String(val));
      setWaitNext(false);
    } else {
      setDisplay(d => d === '0' ? String(val) : d + val);
    }
  }, [waitNext]);

  const decimal = useCallback(() => {
    if (waitNext) { setDisplay('0.'); setWaitNext(false); return; }
    if (!display.includes('.')) setDisplay(d => d + '.');
  }, [display, waitNext]);

  const operate = useCallback((nextOp) => {
    const cur = parseFloat(display);
    if (prev !== null && !waitNext) {
      const result = calc(prev, cur, op);
      setDisplay(String(result));
      setPrev(result);
    } else {
      setPrev(cur);
    }
    setOp(nextOp);
    setWaitNext(true);
  }, [display, prev, op, waitNext]);

  function calc(a, b, operator) {
    switch (operator) {
      case '+': return round(a + b);
      case '−': return round(a - b);
      case '×': return round(a * b);
      case '÷': return b !== 0 ? round(a / b) : 'Error';
      case '%': return round(a % b);
      default: return b;
    }
  }

  function round(n) {
    return Math.round(n * 1e10) / 1e10;
  }

  const equals = useCallback(() => {
    if (op === null || prev === null) return;
    const cur = parseFloat(display);
    const result = calc(prev, cur, op);
    setDisplay(String(result));
    setPrev(null);
    setOp(null);
    setWaitNext(true);
  }, [display, prev, op]);

  const clear = () => { setDisplay('0'); setPrev(null); setOp(null); setWaitNext(false); };
  const toggleSign = () => setDisplay(d => d.startsWith('-') ? d.slice(1) : '-' + d);
  const percent = () => setDisplay(d => String(parseFloat(d) / 100));
  const backspace = () => setDisplay(d => d.length > 1 ? d.slice(0,-1) : '0');

  const BTNS = [
    { label:'AC', fn:clear,       cls:'calc-fn' },
    { label:'+/-',fn:toggleSign,  cls:'calc-fn' },
    { label:'%',  fn:percent,     cls:'calc-fn' },
    { label:'÷',  fn:()=>operate('÷'), cls:'calc-op' },
    { label:'7',  fn:()=>input(7) },
    { label:'8',  fn:()=>input(8) },
    { label:'9',  fn:()=>input(9) },
    { label:'×',  fn:()=>operate('×'), cls:'calc-op' },
    { label:'4',  fn:()=>input(4) },
    { label:'5',  fn:()=>input(5) },
    { label:'6',  fn:()=>input(6) },
    { label:'−',  fn:()=>operate('−'), cls:'calc-op' },
    { label:'1',  fn:()=>input(1) },
    { label:'2',  fn:()=>input(2) },
    { label:'3',  fn:()=>input(3) },
    { label:'+',  fn:()=>operate('+'), cls:'calc-op' },
    { label:'⌫',  fn:backspace,   cls:'calc-fn' },
    { label:'0',  fn:()=>input(0) },
    { label:'.',  fn:decimal },
    { label:'=',  fn:equals,      cls:'calc-eq' },
  ];

  const displayText = display.length > 12 ? parseFloat(display).toExponential(4) : display;

  return (
    <div className="calc-root">
      <div className="calc-header">
        <span className="calc-title">Calculator</span>
        <button className="calc-close" onClick={onClose}><i className="fas fa-times" /></button>
      </div>
      <div className="calc-display">
        {op && prev !== null && <div className="calc-expr">{prev} {op}</div>}
        <div className="calc-value">{displayText}</div>
      </div>
      <div className="calc-grid">
        {BTNS.map((b, i) => (
          <button key={i} className={`calc-btn${b.cls ? ' '+b.cls : ''}`} onClick={b.fn}>
            {b.label}
          </button>
        ))}
      </div>
    </div>
  );
}
