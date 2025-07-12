import express from "express";
import cluster from "cluster";
import os from "os";

const totalCPUs = os.cpus().length;

const port = 3000;

let myNum = 100000000
let totalSum = 0
let completedWorkers = 0

if (cluster.isPrimary) {
    let chuckSize = myNum / totalCPUs
    let startTime = Date.now()

    for (let i = 0; i < totalCPUs; i++) {
        let worker = cluster.fork();
        let startPoint = chuckSize * i
        let endPoint = i === totalCPUs - 1 ? myNum : startPoint + chuckSize
        
        worker.on("message", (msg) => {
            if (msg.ready) {
                // Worker is ready, send the work data
                worker.send({ startPoint, endPoint })
                return
            }
            
            totalSum += msg.partialSum
            completedWorkers++
            if (completedWorkers === totalCPUs) {
                let endTime = Date.now()
                console.log("Time taken", endTime - startTime)
                console.log("All workers completed", totalSum)
                process.exit()
            }
        })
    }

} else {
    // Set up message listener first
    process.on('message', (msg) => {
        let { startPoint, endPoint } = msg
        let sum = 0
        for (let i = startPoint; i < endPoint; i++) {
            sum += i
        }
        process.send({ partialSum: sum })
    })
    
    // Signal that worker is ready to receive messages
    process.send({ ready: true })
}