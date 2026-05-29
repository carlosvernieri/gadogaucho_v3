const animalText = '22 Terneiros Inteiros méd. I9IKg';
const weightFixed = animalText
  .replace(/O/gi, '0')
  .replace(/[Il|]/g, '1');
const weightMatch = weightFixed.match(/(\d+)KG/i);

console.log({
  original: animalText,
  fixed: weightFixed,
  match: weightMatch
});
