import express from "express";
import cluster from "cluster";
import os from "os";

const totalCPUs = os.cpus().length;

const port = 3000;


const app = express();


app.get("/ip", (req, res) => {
    res.send(req.ip);
    
})
app.get("/health", (req, res) => {
    res.send("Hello World!");
});


app.get('/sum/:end',(req,res)=>{
let myNum = req.params.end
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

})


app.listen(3000, () => {
    console.log(`Server is running on port ${port}`);
});
