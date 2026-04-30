import { getArea, getPerimeter, getTopWidth, getSpecificEnergy, solveBisection, g, getReinforcementSuggestion } from './src/utils/hydraulics.js';

function assertEqual(actual, expected, label, tolerance = 1e-6) {
  if (Math.abs(actual - expected) > tolerance) {
    console.error(`FAIL ${label}: expected ${expected}, got ${actual}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS ${label}: ${actual}`);
  }
}

function assertTrue(condition, label) {
  if (!condition) {
    console.error(`FAIL ${label}`);
    process.exitCode = 1;
  } else {
    console.log(`PASS ${label}`);
  }
}

console.log('=== Testy hydraulics.js ===');

// Prostokąt: b=2, m=0, y=1
assertEqual(getArea(1, 2, 0), 2, 'Area rectangle');
assertEqual(getPerimeter(1, 2, 0), 4, 'Perimeter rectangle');
assertEqual(getTopWidth(1, 2, 0), 2, 'TopWidth rectangle');

// Trapez: b=2, m=1.5, y=1 => A=(2+1.5)*1=3.5
assertEqual(getArea(1, 2, 1.5), 3.5, 'Area trapezoid');
assertEqual(getPerimeter(1, 2, 1.5), 2 + 2*Math.sqrt(1+2.25), 'Perimeter trapezoid');
assertEqual(getTopWidth(1, 2, 1.5), 5, 'TopWidth trapezoid');

// Bisection: x^2 - 4 = 0, root at 2
const root = solveBisection((x) => x*x - 4, 0, 5);
assertEqual(root, 2, 'Bisection root x^2-4', 1e-4);

// Specific energy: Q=0 -> E = y
assertEqual(getSpecificEnergy(2, 2, 0, 0), 2, 'SpecificEnergy Q=0');

// Manning check for a simple channel: rectangular b=2, y=1, n=0.015, slope=0.001
// A=2, P=4, R=0.5
// Q = (1/0.015)*2*(0.5)^(2/3)*sqrt(0.001)
const A = 2;
const R = 0.5;
const n = 0.015;
const slope = 0.001;
const expectedQ = (1/n) * A * Math.pow(R, 2/3) * Math.sqrt(slope);
console.log(`Reference Manning Q for b=2, y=1, n=0.015, i=0.001: ${expectedQ.toFixed(4)} m3/s`);

// Solve normal depth for that Q -> should be ~1
const Qtest = expectedQ;
const yn = solveBisection((y) => {
  const a = getArea(y, 2, 0);
  const p = getPerimeter(y, 2, 0);
  return Math.pow(a, 5/3)/Math.pow(p, 2/3) - (n*Qtest)/Math.sqrt(slope);
}, 0.01, 10);
assertEqual(yn, 1, 'Normal depth back-calculation', 1e-3);

// Critical depth for rectangular: yc = (Q^2/(g*b^2))^(1/3)
const b = 2;
const Q = 10;
const ycAnalytical = Math.pow(Q*Q/(g*b*b), 1/3);
const yc = solveBisection((y) => g*Math.pow(getArea(y,b,0),3) - Q*Q*getTopWidth(y,b,0), 0.01, 20);
assertEqual(yc, ycAnalytical, 'Critical depth rectangular', 1e-3);

// Reinforcement suggestions
assertEqual(getReinforcementSuggestion(0.2).type, 'Brak (Ryzyko zamulania)', 'Reinforcement low v');
assertEqual(getReinforcementSuggestion(0.5).type, 'Grunt rodzimy (Naturalne)', 'Reinforcement natural');
assertEqual(getReinforcementSuggestion(1.2).type, 'Narzut kamienny / Faszyna', 'Reinforcement medium');
assertEqual(getReinforcementSuggestion(4.0).type, 'Beton / Żelbet', 'Reinforcement high');
assertEqual(getReinforcementSuggestion(6.0).type, 'Konstrukcja Specjalna', 'Reinforcement extreme');

// Edge cases
assertTrue(solveBisection((x) => x - 5, 0, 10) === null, 'Bisection no sign change returns null');

console.log('=== Testy zakończone ===');
