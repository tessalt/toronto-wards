const fs = require('fs');

const csv = fs.readFileSync('./data/councillors.csv').toString('utf-8');
const lines = csv.split('\n');

const legend = lines[0];
const columns = legend.split(',');

lines.splice(0, 1)

const output = lines.map((line) => {
  const name = line.split('"')[1];
  const arr = line.split(',');
  arr.splice(0, 1);
  arr[0] = name;
  return arr.reduce((memo, col, i) => {
    memo[columns[i]] = col;
    return memo;
  }, {})
})

const json = JSON.stringify({
  councillors: output
})

fs.writeFileSync('output.json', json)
