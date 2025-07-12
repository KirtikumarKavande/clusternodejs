let myNum =100000000

let startTime = Date.now()
let sum = 0
for (let i = 0; i < myNum; i++) {
    sum += i
}
let endTime = Date.now()
console.log(endTime - startTime)

console.log(sum)