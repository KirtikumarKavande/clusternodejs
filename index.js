import express from "express";
import cluster from "cluster";
import os from "os";

const totalCPUs = os.cpus().length;
const port = 3000;

if (cluster.isPrimary) {
    const app = express();

    app.set('trust proxy', true);

    app.get("/ip", (req, res) => {
        res.send(req.ip);
    });

    app.get("/health", (req, res) => {
        res.send("Hello World!");
    });
    app.get("/host", (req, res) => {
        res.send(os.hostname());
    });

    app.get('/sum/:end', (req, res) => {
        const myNum = parseInt(req.params.end);

        if (isNaN(myNum) || myNum <= 0) {
            return res.status(400).json({ error: "Invalid number provided" });
        }

        let totalSum = 0;
        let completedWorkers = 0;
        const chunkSize = Math.ceil(myNum / totalCPUs);
        const startTime = Date.now();

        for (let i = 0; i < totalCPUs; i++) {
            const worker = cluster.fork();
            const startPoint = chunkSize * i + 1; // Start from 1, not 0
            const endPoint = Math.min(startPoint + chunkSize - 1, myNum);

            if (startPoint > myNum) {
                worker.kill();
                completedWorkers++;
                continue;
            }

            worker.on("message", (msg) => {
                if (msg.ready) {
                    // Worker is ready, send the work data
                    worker.send({ startPoint, endPoint });
                    return;
                }

                totalSum += msg.partialSum;
                completedWorkers++;
                worker.kill(); // Clean up worker after completion

                if (completedWorkers === totalCPUs) {
                    const endTime = Date.now();
                    console.log("Time taken:", endTime - startTime, "ms");
                    console.log("Sum calculation completed:", totalSum);

                    res.json({
                        sum: totalSum,
                        timeTaken: endTime - startTime,
                        workersUsed: totalCPUs
                    });
                }
            });

            worker.on('error', (error) => {
                console.error('Worker error:', error);
                res.status(500).json({ error: "Worker process error" });
            });
        }
    });

    app.listen(port, () => {
        console.log(`Server is running on port ${port}`);
    });

} else {
    // Worker process - handle computation
    process.on('message', (msg) => {
        const { startPoint, endPoint } = msg;
        let sum = 0;

        // Calculate sum from startPoint to endPoint (inclusive)
        for (let i = startPoint; i <= endPoint; i++) {
            sum += i;
        }

        process.send({ partialSum: sum });
    });

    // Signal that worker is ready to receive messages
    process.send({ ready: true });
}